import { HttpApiBuilder, HttpApiSwagger } from "@effect/platform";
import { NodeHttpServer } from "@effect/platform-node";
import { Layer } from "effect";
import { createServer } from "node:http";

import type { AppConfig } from "./config.js";
import { loadConfig } from "./config.js";
import type { ReadinessCheck } from "./health/check.js";
import { selfReadinessCheck } from "./health/checks/self.js";
import { Api } from "./http/api.js";
import { makeHealthHandlers } from "./http/handlers/health.js";
import type { RequestIdGenerator } from "./http/handlers/health.js";
import { requestObservabilityMiddleware } from "./http/middleware/request-observability.js";
import { shouldExposeSwagger } from "./http/swagger.js";
import { makeOtelLayer } from "./observability/otel.js";

const defaultChecks: ReadonlyArray<ReadinessCheck> = [selfReadinessCheck];
const defaultRequestIdGenerator: RequestIdGenerator = () => crypto.randomUUID();

const makeApiLayer = (
  config: AppConfig,
  checks: ReadonlyArray<ReadinessCheck>,
  makeRequestId: RequestIdGenerator
) => {
  const handlersLayer = makeHealthHandlers(config, checks, makeRequestId);
  const apiLayer = HttpApiBuilder.api(Api).pipe(Layer.provide(handlersLayer));
  const docsLayer = shouldExposeSwagger(config.appEnv)
    ? HttpApiSwagger.layer({ path: "/docs" }).pipe(Layer.provide(apiLayer))
    : Layer.empty;

  return Layer.mergeAll(apiLayer, docsLayer, makeOtelLayer(config));
};

export const makeServerLayer = (
  config: AppConfig,
  checks: ReadonlyArray<ReadinessCheck> = defaultChecks,
  makeRequestId: RequestIdGenerator = defaultRequestIdGenerator
) =>
  HttpApiBuilder.serve(requestObservabilityMiddleware).pipe(
    Layer.provide(makeApiLayer(config, checks, makeRequestId)),
    Layer.provide(NodeHttpServer.layer(createServer, { port: config.port }))
  );

export const createTestServer = async (
  env: Partial<Record<string, string | undefined>>,
  checks: ReadonlyArray<ReadinessCheck> = defaultChecks,
  makeRequestId: RequestIdGenerator = defaultRequestIdGenerator
) => {
  const config = loadConfig(env);
  const { handler, dispose } = HttpApiBuilder.toWebHandler(
    Layer.mergeAll(makeApiLayer(config, checks, makeRequestId), NodeHttpServer.layerContext),
    {
      middleware: requestObservabilityMiddleware
    }
  );

  return {
    handler,
    dispose
  };
};
