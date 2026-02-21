import {
  HttpApiSwagger,
  HttpLayerRouter,
  HttpServerRequest,
  HttpServerResponse
} from "@effect/platform";
import { NodeHttpServer } from "@effect/platform-node";
import { Effect, Layer } from "effect";
import { createServer } from "node:http";

import { Api } from "./api/Api.js";
import { HandlersLive } from "./api/Handlers.js";
import { AuthService } from "./auth/AuthService.js";
import type { AppConfigType } from "./config/AppConfig.js";
import { AppConfigService, makeConfigProvider } from "./config/AppConfigService.js";
import { AuthIntegrationError } from "./errors.js";

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

const apiRoutesLayer = HttpLayerRouter.addHttpApi(Api).pipe(Layer.provide(HandlersLive));

const toAuthError = (cause: unknown) =>
  new AuthIntegrationError({
    message: `Auth proxy failed: ${String(cause)}`
  });

const makeAuthProxyHandler =
  (webHandler: (request: Request) => Promise<Response>) =>
  (request: HttpServerRequest.HttpServerRequest) =>
    Effect.gen(function* () {
    const webRequest = yield* HttpServerRequest.toWeb(request);
    const webResponse = yield* Effect.tryPromise({
      try: () => webHandler(webRequest),
      catch: toAuthError
    });
    return HttpServerResponse.fromWeb(webResponse);
  }).pipe(
    Effect.catchAll((error) =>
      Effect.succeed(
        HttpServerResponse.unsafeJson(
          {
            error: "auth_proxy_failed",
            message: String(error)
          },
          {
            status: 500
          }
        )
      )
    )
  );

const makeAuthRoutesLayer = () =>
  HttpLayerRouter.use((router) =>
    Effect.gen(function* () {
      const auth = yield* AuthService;
      const handler = makeAuthProxyHandler(auth.webHandler);

      yield* router.add("*", "/api/auth", handler);
      yield* router.add("*", "/api/auth/*", handler);
    })
  );

const makeRoutesLayer = (configLayer: ReturnType<typeof makeConfigLayer>) => {
  const authLayer = makeAuthRoutesLayer().pipe(
    Layer.provide(AuthService.Default),
    Layer.provide(configLayer)
  );
  const docsLayer = Layer.unwrapEffect(
    Effect.gen(function* () {
      const config = yield* AppConfigService.get();
      if (!shouldExposeSwagger(config.APP_ENV)) {
        return Layer.empty;
      }
      return HttpApiSwagger.layerHttpLayerRouter({ api: Api, path: "/docs" });
    })
  ).pipe(Layer.provide(configLayer));

  return Layer.mergeAll(apiRoutesLayer, authLayer, docsLayer);
};

export const makeServerLayer = (env?: Partial<Record<string, string | undefined>>) => {
  const configLayer = makeConfigLayer(env);
  const routesLayer = makeRoutesLayer(configLayer);
  const serverLayer = Layer.unwrapEffect(
    Effect.gen(function* () {
      const config = yield* AppConfigService.get();
      return NodeHttpServer.layer(createServer, { port: config.PORT });
    })
  ).pipe(Layer.provide(configLayer));

  return HttpLayerRouter.serve(routesLayer).pipe(Layer.provide(serverLayer));
};

export const createTestServer = async (env: Partial<Record<string, string | undefined>>) => {
  const configLayer = makeConfigLayer(env);
  const routesLayer = makeRoutesLayer(configLayer).pipe(Layer.provide(NodeHttpServer.layerContext));
  const { handler, dispose } = HttpLayerRouter.toWebHandler(routesLayer);

  return {
    handler,
    dispose
  };
};
