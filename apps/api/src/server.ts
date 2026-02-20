import { HttpApiBuilder, HttpApiSwagger, HttpMiddleware } from "@effect/platform";
import { NodeHttpServer } from "@effect/platform-node";
import { Effect, Layer } from "effect";
import { createServer } from "node:http";

import { Api } from "./api/Api.js";
import { HandlersLive } from "./api/Handlers.js";
import type { AppConfigType } from "./config/AppConfig.js";
import { AppConfigService } from "./config/AppConfigService.js";
import { EnvService } from "./config/EnvService.js";

const shouldExposeSwagger = (appEnv: AppConfigType["APP_ENV"]): boolean =>
  appEnv === "local" || appEnv === "staging";

const makeEnvLayer = (env: Partial<Record<string, string | undefined>>) =>
  Layer.succeed(
    EnvService,
    EnvService.of({
      _tag: "EnvService",
      getAll: (keys: readonly string[]) =>
        Effect.gen(function* () {
          const result: Record<string, string> = {};
          for (const key of keys) {
            const value = env[key];
            if (value !== undefined) {
              result[key] = value;
            }
          }
          return result;
        })
    })
  );

const makeConfigLayer = (env?: Partial<Record<string, string | undefined>>) => {
  const envLayer = env ? makeEnvLayer(env) : EnvService.Default;
  return AppConfigService.Default.pipe(Layer.provide(envLayer));
};

const makeApiLayer = (configLayer: ReturnType<typeof makeConfigLayer>) => {
  const apiLayer = HttpApiBuilder.api(Api).pipe(
    Layer.provide(HandlersLive),
    Layer.provide(configLayer)
  );

  const docsLayer = Layer.unwrapEffect(
    Effect.gen(function* () {
      const config = yield* AppConfigService.get();
      if (!shouldExposeSwagger(config.APP_ENV)) {
        return Layer.empty;
      }
      return HttpApiSwagger.layer({ path: "/docs" }).pipe(Layer.provide(apiLayer));
    })
  ).pipe(Layer.provide(configLayer));

  return Layer.mergeAll(apiLayer, docsLayer);
};

export const makeServerLayer = (env?: Partial<Record<string, string | undefined>>) => {
  const configLayer = makeConfigLayer(env);

  return HttpApiBuilder.serve(HttpMiddleware.logger).pipe(
    Layer.provide(makeApiLayer(configLayer)),
    Layer.provide(
      Layer.unwrapEffect(
        Effect.gen(function* () {
          const config = yield* AppConfigService.get();
          return NodeHttpServer.layer(createServer, { port: config.PORT });
        })
      ).pipe(Layer.provide(configLayer))
    ),
    Layer.provide(configLayer)
  );
};

export const createTestServer = async (env: Partial<Record<string, string | undefined>>) => {
  const configLayer = makeConfigLayer(env);

  const { handler, dispose } = HttpApiBuilder.toWebHandler(
    Layer.mergeAll(
      makeApiLayer(configLayer),
      NodeHttpServer.layerContext
    ).pipe(Layer.provide(configLayer)),
    {
      middleware: HttpMiddleware.logger
    }
  );

  return {
    handler,
    dispose
  };
};
