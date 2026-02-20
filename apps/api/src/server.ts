import { HttpApiBuilder, HttpApiSwagger, type HttpApp } from "@effect/platform";
import { NodeHttpServer } from "@effect/platform-node";
import { Layer } from "effect";
import { createServer } from "node:http";

import type { AppConfig } from "./config";
import { loadConfig } from "./config";
import type { ReadinessCheck } from "./health/check";
import { selfReadinessCheck } from "./health/checks/self";
import { Api } from "./http/api";
import { makeHealthHandlers } from "./http/handlers/health";
import { requestObservabilityMiddleware } from "./http/middleware/request-observability";
import { shouldExposeSwagger } from "./http/swagger";
import { makeOtelLayer } from "./observability/otel";

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
