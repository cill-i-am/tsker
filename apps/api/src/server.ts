import { HttpApiBuilder, HttpApiSwagger, type HttpApp } from "@effect/platform";
import { NodeHttpServer } from "@effect/platform-node";
import { Layer } from "effect";
import { createServer } from "node:http";

import type { AppConfig } from "./config.js";
import { loadConfig } from "./config.js";
import type { ReadinessCheck } from "./health/check.js";
import { selfReadinessCheck } from "./health/checks/self.js";
import { Api } from "./http/api.js";
import { makeHealthHandlers } from "./http/handlers/health.js";
import { requestObservabilityMiddleware } from "./http/middleware/request-observability.js";
import { shouldExposeSwagger } from "./http/swagger.js";
import { makeOtelLayer } from "./observability/otel.js";

const defaultChecks: ReadonlyArray<ReadinessCheck> = [selfReadinessCheck];

const makeApiLayer = (config: AppConfig, checks: ReadonlyArray<ReadinessCheck>) => {
  const handlersLayer = makeHealthHandlers(config, checks) as unknown as Layer.Layer<
    unknown,
    never,
    never
  >;
  const apiLayer = HttpApiBuilder.api(Api).pipe(Layer.provide(handlersLayer));
  const docsLayer = shouldExposeSwagger(config.appEnv)
    ? HttpApiSwagger.layer({ path: "/docs" }).pipe(Layer.provide(apiLayer))
    : Layer.empty;

  return Layer.mergeAll(
    apiLayer,
    docsLayer,
    makeOtelLayer(config)
  ) as unknown as Layer.Layer<unknown, never, never>;
};

export const makeServerLayer = (
  config: AppConfig,
  checks: ReadonlyArray<ReadinessCheck> = defaultChecks
) =>
  HttpApiBuilder.serve(requestObservabilityMiddleware(config) as unknown as never).pipe(
    Layer.provide(makeApiLayer(config, checks) as unknown as Layer.Layer<unknown, never, never>),
    Layer.provide(NodeHttpServer.layer(createServer, { port: config.port }))
  );

export const createTestServer = async (
  env: Partial<Record<string, string | undefined>>,
  checks: ReadonlyArray<ReadinessCheck> = defaultChecks
) => {
  const config = loadConfig(env);
  const { handler, dispose } = HttpApiBuilder.toWebHandler(
    makeApiLayer(config, checks) as unknown as Layer.Layer<unknown, never, never>,
    {
      middleware: requestObservabilityMiddleware(config) as unknown as (
        httpApp: HttpApp.Default
      ) => HttpApp.Default
    }
  );

  return {
    handler,
    dispose
  };
};
