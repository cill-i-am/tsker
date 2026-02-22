import { createAuthPool } from "@repo/db/auth-client";
import { Effect } from "effect";

import { makeAuth, makeAuthDatabase } from "@/auth/auth.js";
import { AppConfigService } from "@/config/app-config-service.js";
import { AuthIntegrationError } from "@/errors/auth-integration-error.js";

const toAuthError = (cause: unknown, action: string) =>
  new AuthIntegrationError({
    message: `${action} failed: ${String(cause)}`,
  });

export class AuthService extends Effect.Service<AuthService>()("AuthService", {
  accessors: true,
  dependencies: [AppConfigService.Default],
  scoped: Effect.gen(function* scoped() {
    const config = yield* AppConfigService.get();

    const pool = yield* Effect.acquireRelease(
      Effect.sync(() => createAuthPool(config.DATABASE_URL)),
      (connectionPool) => Effect.promise(() => connectionPool.end()).pipe(Effect.orDie),
    );

    const database = makeAuthDatabase(config.DATABASE_URL, pool);
    const auth = makeAuth(config, database);

    const webHandler = auth.handler;

    const getSessionFromHeaders = Effect.fn("AuthService.getSessionFromHeaders")(
      function* getSessionFromHeaders(headers: Headers) {
        return yield* Effect.tryPromise({
          catch: (cause) => toAuthError(cause, "get session"),
          try: () => auth.api.getSession({ headers }),
        });
      },
    );

    return {
      getSessionFromHeaders,
      webHandler,
    };
  }),
}) {}
