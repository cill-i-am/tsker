import { serve } from "@hono/node-server";
import { createAuthPool } from "@repo/db/auth-client";
import { Effect, Layer } from "effect";
import { Hono } from "hono";

import { makeAuth, makeAuthDatabase } from "@/auth/auth.js";
import { AppConfigService, makeConfigProvider } from "@/config/app-config-service.js";
import type { AppConfigType } from "@/config/app-config.js";
import { AuthIntegrationError } from "@/errors/auth-integration-error.js";

const makeConfigLayer = (env?: Partial<Record<string, string | undefined>>) => {
  if (env) {
    return Layer.provide(
      AppConfigService.Default,
      Layer.setConfigProvider(makeConfigProvider(env)),
    );
  }
  return AppConfigService.Default;
};

const loadConfig = (env?: Partial<Record<string, string | undefined>>) =>
  Effect.runPromise(AppConfigService.get().pipe(Effect.provide(makeConfigLayer(env))));

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

const resolveOriginState = (
  request: Request,
  trustedOrigins: ReadonlySet<string>,
): {
  origin: string | null;
  originIsTrusted: boolean;
  normalizedOrigin: string | undefined;
} => {
  const origin = request.headers.get("origin");
  const normalizedOrigin = origin ? normalizeOrigin(origin) : undefined;

  return {
    normalizedOrigin,
    origin,
    originIsTrusted: normalizedOrigin ? trustedOrigins.has(normalizedOrigin) : false,
  };
};

const forbiddenOriginResponse = () =>
  Response.json(
    {
      error: "forbidden_origin",
      message: "Origin is not trusted",
    },
    {
      status: 403,
    },
  );

const authProxyFailedResponse = (error: unknown) =>
  Response.json(
    {
      error: "auth_proxy_failed",
      message: String(error),
    },
    {
      status: 500,
    },
  );

const makePreflightResponse = (
  request: Request,
  originIsTrusted: boolean,
  normalizedOrigin?: string,
) => {
  if (request.method.toUpperCase() !== "OPTIONS" || !normalizedOrigin) {
    return;
  }

  if (!originIsTrusted) {
    return forbiddenOriginResponse();
  }

  return new Response(null, {
    headers: makeCorsHeaders(
      normalizedOrigin,
      request.headers.get("access-control-request-headers"),
    ),
    status: 204,
  });
};

const withCorsHeaders = (
  response: Response,
  request: Request,
  originIsTrusted: boolean,
  normalizedOrigin?: string,
) => {
  if (!normalizedOrigin || !originIsTrusted) {
    return response;
  }

  const nextResponse = new Response(response.body, response);
  const corsHeaders = makeCorsHeaders(
    normalizedOrigin,
    request.headers.get("access-control-request-headers"),
  );
  for (const [key, value] of Object.entries(corsHeaders)) {
    nextResponse.headers.set(key, value);
  }

  return nextResponse;
};

const handleAuthRequest = async (
  request: Request,
  webHandler: (request: Request) => Promise<Response>,
  trustedOrigins: ReadonlySet<string>,
): Promise<Response> => {
  const { origin, originIsTrusted, normalizedOrigin } = resolveOriginState(request, trustedOrigins);
  const preflightResponse = makePreflightResponse(request, originIsTrusted, normalizedOrigin);

  if (preflightResponse) {
    return preflightResponse;
  }

  if (isMutationMethod(request.method) && origin && !originIsTrusted) {
    return forbiddenOriginResponse();
  }

  try {
    const webResponse = await Effect.runPromise(
      Effect.tryPromise({
        catch: toAuthError,
        try: () => webHandler(request),
      }),
    );

    return withCorsHeaders(webResponse, request, originIsTrusted, normalizedOrigin);
  } catch (error) {
    return authProxyFailedResponse(error);
  }
};

const createRuntime = async (env?: Partial<Record<string, string | undefined>>) => {
  const config = await loadConfig(env);
  const pool = createAuthPool(config.DATABASE_URL);
  const database = makeAuthDatabase(config.DATABASE_URL, pool);
  const auth = makeAuth(config, database);

  return {
    config,
    dispose: () => pool.end(),
    trustedOrigins: parseTrustedOrigins(config.AUTH_TRUSTED_ORIGINS),
    webHandler: auth.handler,
  };
};

const createAuthApp = (runtime: {
  config: AppConfigType;
  trustedOrigins: ReadonlySet<string>;
  webHandler: (request: Request) => Promise<Response>;
}) => {
  const app = new Hono();
  const startedAt = Date.now();

  app.get("/up", (c) =>
    c.json({
      service: "auth",
      status: "ok",
      timestamp: new Date().toISOString(),
      uptimeSeconds: Math.floor((Date.now() - startedAt) / 1000),
    }),
  );

  const authHandler = (request: Request) =>
    handleAuthRequest(request, runtime.webHandler, runtime.trustedOrigins);

  app.all("/api/auth", (c) => authHandler(c.req.raw));
  app.all("/api/auth/*", (c) => authHandler(c.req.raw));

  return app;
};

export const createTestServer = async (env: Partial<Record<string, string | undefined>>) => {
  const runtime = await createRuntime(env);
  const app = createAuthApp(runtime);

  return {
    dispose: runtime.dispose,
    handler: (request: Request) => app.fetch(request),
  };
};

export const runServer = async (env?: Partial<Record<string, string | undefined>>) => {
  const runtime = await createRuntime(env);
  const app = createAuthApp(runtime);
  serve({
    fetch: app.fetch,
    port: runtime.config.PORT,
  });
};
