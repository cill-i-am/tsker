import { createServer } from "node:http";

import {
  HttpApiBuilder,
  HttpApiSwagger,
  HttpMiddleware,
} from "@effect/platform";
import { NodeHttpServer } from "@effect/platform-node";
import { Effect, Layer } from "effect";

import { Api } from "./api/Api.js";
import { HandlersLive } from "./api/Handlers.js";
import type { AppConfigType } from "./config/AppConfig.js";
import {
  AppConfigService,
  makeConfigProvider,
} from "./config/AppConfigService.js";

const shouldExposeSwagger = (appEnv: AppConfigType["APP_ENV"]): boolean =>
  appEnv === "local" || appEnv === "staging";

const makeConfigLayer = (env?: Partial<Record<string, string | undefined>>) => {
  if (env) {
    return Layer.provide(
      AppConfigService.Default,
      Layer.setConfigProvider(makeConfigProvider(env))
    );
  }
  return AppConfigService.Default;
};

const baseApiLayer = HttpApiBuilder.api(Api).pipe(Layer.provide(HandlersLive));

const makeApiLayer = (configLayer: ReturnType<typeof makeConfigLayer>) => {
  const apiLayer = Layer.provide(baseApiLayer, configLayer);
  const docsLayer = Layer.unwrapEffect(
    Effect.gen(function* docsLayer() {
      const config = yield* AppConfigService.get();
      if (!shouldExposeSwagger(config.APP_ENV)) {
        return Layer.empty;
      }
      return HttpApiSwagger.layer({ path: "/docs" }).pipe(
        Layer.provide(apiLayer)
      );
    })
  ).pipe(Layer.provide(configLayer));

  return Layer.mergeAll(apiLayer, docsLayer);
};

export const makeServerLayer = (
  env?: Partial<Record<string, string | undefined>>
) => {
  const configLayer = makeConfigLayer(env);
  const apiLayer = makeApiLayer(configLayer);
  const serverLayer = Layer.unwrapEffect(
    Effect.gen(function* serverLayer() {
      const config = yield* AppConfigService.get();
      return NodeHttpServer.layer(createServer, { port: config.PORT });
    })
  ).pipe(Layer.provide(configLayer));

  return HttpApiBuilder.serve(HttpMiddleware.logger).pipe(
    Layer.provide(Layer.mergeAll(apiLayer, serverLayer))
  );
};

export const createTestServer = async (
  env: Partial<Record<string, string | undefined>>
) => {
  const configLayer = makeConfigLayer(env);

  const { handler, dispose } = HttpApiBuilder.toWebHandler(
    Layer.mergeAll(makeApiLayer(configLayer), NodeHttpServer.layerContext),
    {
      middleware: HttpMiddleware.logger,
    }
  );

  return {
    dispose,
    handler,
  };
};
