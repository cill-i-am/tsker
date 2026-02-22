import { HttpApiSwagger, HttpLayerRouter } from "@effect/platform";
import { NodeHttpServer } from "@effect/platform-node";
import { Effect, Layer } from "effect";

import { Api } from "@/api/api.js";
import { HandlersLive } from "@/api/handlers.js";
import { AppConfigService, makeConfigProvider } from "@/config/app-config-service.js";
import type { AppConfigType } from "@/config/app-config.js";

const shouldExposeSwagger = (appEnv: AppConfigType["APP_ENV"]): boolean =>
  appEnv === "local" || appEnv === "staging";

const makeConfigLayer = (env?: Partial<Record<string, string | undefined>>) => {
  if (env) {
    return Layer.provide(
      AppConfigService.Default,
      Layer.setConfigProvider(makeConfigProvider(env)),
    );
  }
  return AppConfigService.Default;
};

const apiRoutesLayer = HttpLayerRouter.addHttpApi(Api).pipe(Layer.provide(HandlersLive));

const makeRoutesLayer = (configLayer: ReturnType<typeof makeConfigLayer>) => {
  const docsLayer = Layer.unwrapEffect(
    Effect.gen(function* docsLayer() {
      const config = yield* AppConfigService.get();
      if (!shouldExposeSwagger(config.APP_ENV)) {
        return Layer.empty;
      }
      return HttpApiSwagger.layerHttpLayerRouter({ api: Api, path: "/docs" });
    }),
  ).pipe(Layer.provide(configLayer));

  return Layer.mergeAll(apiRoutesLayer, docsLayer);
};

export const makeServerLayer = (env?: Partial<Record<string, string | undefined>>) => {
  const configLayer = makeConfigLayer(env);
  const routesLayer = makeRoutesLayer(configLayer);
  const serverLayer = Layer.unwrapEffect(
    Effect.gen(function* serverLayerEffect() {
      const config = yield* AppConfigService.get();
      const nodeHttpSpecifier = ["node", "http"].join(":");
      const { createServer } = yield* Effect.promise(() => import(nodeHttpSpecifier));
      return NodeHttpServer.layer(createServer, { port: config.PORT });
    }),
  ).pipe(Layer.provide(configLayer));

  return HttpLayerRouter.serve(routesLayer).pipe(Layer.provide(serverLayer));
};

export const createTestServer = (env: Partial<Record<string, string | undefined>>) => {
  const configLayer = makeConfigLayer(env);
  const routesLayer = makeRoutesLayer(configLayer).pipe(Layer.provide(NodeHttpServer.layerContext));
  const { handler, dispose } = HttpLayerRouter.toWebHandler(routesLayer);

  return {
    dispose,
    handler,
  };
};
