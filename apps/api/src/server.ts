import {
  HttpApiSwagger,
  HttpLayerRouter,
  HttpServerRequest,
  HttpServerResponse,
} from "@effect/platform";
import { NodeHttpServer } from "@effect/platform-node";
import { Effect, Layer } from "effect";

import { Api } from "@/api/api.js";
import { HandlersLive } from "@/api/handlers.js";
import { AuthService } from "@/auth/auth-service.js";
import { AppConfigService, makeConfigProvider } from "@/config/app-config-service.js";
import type { AppConfigType } from "@/config/app-config.js";
import { AuthIntegrationError } from "@/errors/auth-integration-error.js";

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

const toAuthError = (cause: unknown) =>
  new AuthIntegrationError({
    message: `Auth proxy failed: ${String(cause)}`,
  });

const normalizeOrigin = (origin: string): string => {
  try {
    return new URL(origin).origin;
  } catch {
    return origin;
  }
};

const parseTrustedOrigins = (value: string): ReadonlySet<string> => {
  const origins = value
    .split(",")
    .map((origin) => origin.trim())
    .filter((origin) => origin.length > 0)
    .map(normalizeOrigin);

  return new Set(origins);
};

const isMutationMethod = (method: string) => {
  const normalizedMethod = method.toUpperCase();
  return (
    normalizedMethod === "POST" ||
    normalizedMethod === "PUT" ||
    normalizedMethod === "PATCH" ||
    normalizedMethod === "DELETE"
  );
};

const makeCorsHeaders = (
  origin: string,
  requestedHeaders: string | null,
): Record<string, string> => ({
  "access-control-allow-credentials": "true",
  "access-control-allow-headers": requestedHeaders ?? "content-type, authorization",
  "access-control-allow-methods": "GET,POST,PUT,PATCH,DELETE,OPTIONS",
  "access-control-allow-origin": origin,
});

const forbiddenOriginResponse = () =>
  HttpServerResponse.unsafeJson(
    {
      error: "forbidden_origin",
      message: "Origin is not trusted",
    },
    {
      status: 403,
    },
  );

const authProxyFailedResponse = (error: unknown) =>
  HttpServerResponse.unsafeJson(
    {
      error: "auth_proxy_failed",
      message: String(error),
    },
    {
      status: 500,
    },
  );

const resolveOriginState = (
  webRequest: Request,
  trustedOrigins: ReadonlySet<string>,
): {
  origin: string | null;
  originIsTrusted: boolean;
  normalizedOrigin: string | undefined;
} => {
  const origin = webRequest.headers.get("origin");
  const normalizedOrigin = origin ? normalizeOrigin(origin) : undefined;

  return {
    normalizedOrigin,
    origin,
    originIsTrusted: normalizedOrigin ? trustedOrigins.has(normalizedOrigin) : false,
  };
};

const makePreflightResponse = (
  webRequest: Request,
  originIsTrusted: boolean,
  normalizedOrigin?: string,
) => {
  if (webRequest.method.toUpperCase() !== "OPTIONS" || !normalizedOrigin) {
    return;
  }

  if (!originIsTrusted) {
    return forbiddenOriginResponse();
  }

  return HttpServerResponse.empty({ status: 204 }).pipe(
    HttpServerResponse.setHeaders(
      makeCorsHeaders(normalizedOrigin, webRequest.headers.get("access-control-request-headers")),
    ),
  );
};

const withCorsHeaders = (
  serverResponse: HttpServerResponse.HttpServerResponse,
  webRequest: Request,
  originIsTrusted: boolean,
  normalizedOrigin?: string,
) => {
  if (!normalizedOrigin || !originIsTrusted) {
    return serverResponse;
  }

  return serverResponse.pipe(
    HttpServerResponse.setHeaders(
      makeCorsHeaders(normalizedOrigin, webRequest.headers.get("access-control-request-headers")),
    ),
  );
};

const runAuthProxyRequest = (
  request: HttpServerRequest.HttpServerRequest,
  webHandler: (request: Request) => Promise<Response>,
  trustedOrigins: ReadonlySet<string>,
) =>
  Effect.gen(function* runAuthProxyRequestEffect() {
    const webRequest = yield* HttpServerRequest.toWeb(request);
    const { origin, originIsTrusted, normalizedOrigin } = resolveOriginState(
      webRequest,
      trustedOrigins,
    );
    const preflightResponse = makePreflightResponse(webRequest, originIsTrusted, normalizedOrigin);

    if (preflightResponse) {
      return preflightResponse;
    }

    if (isMutationMethod(webRequest.method) && origin && !originIsTrusted) {
      return forbiddenOriginResponse();
    }

    const webResponse = yield* Effect.tryPromise({
      catch: toAuthError,
      try: () => webHandler(webRequest),
    });
    const serverResponse = HttpServerResponse.fromWeb(webResponse);

    return withCorsHeaders(serverResponse, webRequest, originIsTrusted, normalizedOrigin);
  });

const makeAuthProxyHandler =
  (webHandler: (request: Request) => Promise<Response>, trustedOrigins: ReadonlySet<string>) =>
  (request: HttpServerRequest.HttpServerRequest) =>
    Effect.gen(function* authProxyHandlerEffect() {
      try {
        return yield* runAuthProxyRequest(request, webHandler, trustedOrigins);
      } catch (error) {
        return authProxyFailedResponse(error);
      }
    });

const makeAuthRoutesLayer = () =>
  HttpLayerRouter.use((router) =>
    Effect.gen(function* authRoutesLayerEffect() {
      const auth = yield* AuthService;
      const config = yield* AppConfigService.get();
      const trustedOrigins = parseTrustedOrigins(config.AUTH_TRUSTED_ORIGINS);
      const handler = makeAuthProxyHandler(auth.webHandler, trustedOrigins);

      yield* router.add("*", "/api/auth", handler);
      yield* router.add("*", "/api/auth/*", handler);
    }),
  );

const makeRoutesLayer = (configLayer: ReturnType<typeof makeConfigLayer>) => {
  const authLayer = makeAuthRoutesLayer().pipe(
    Layer.provide(AuthService.Default),
    Layer.provide(configLayer),
  );
  const docsLayer = Layer.unwrapEffect(
    Effect.gen(function* docsLayer() {
      const config = yield* AppConfigService.get();
      if (!shouldExposeSwagger(config.APP_ENV)) {
        return Layer.empty;
      }
      return HttpApiSwagger.layerHttpLayerRouter({ api: Api, path: "/docs" });
    }),
  ).pipe(Layer.provide(configLayer));

  return Layer.mergeAll(apiRoutesLayer, authLayer, docsLayer);
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
