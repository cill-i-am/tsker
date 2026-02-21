import { createAuthPool } from "@repo/db";
import { Effect } from "effect";

import { AppConfigService } from "../config/AppConfigService.js";
import { AuthIntegrationError } from "../errors.js";
import { makeAuth, makeAuthDatabase } from "./auth.js";

const toAuthError = (cause: unknown, action: string) =>
  new AuthIntegrationError({
    message: `${action} failed: ${String(cause)}`
  });

export class AuthService extends Effect.Service<AuthService>()("AuthService", {
  accessors: true,
  dependencies: [AppConfigService.Default],
  scoped: Effect.gen(function* () {
    const config = yield* AppConfigService.get();

    const pool = yield* Effect.acquireRelease(
      Effect.sync(() => createAuthPool(config.DATABASE_URL)),
      (pool) => Effect.promise(() => pool.end()).pipe(Effect.orDie)
    );

    const database = makeAuthDatabase(config.DATABASE_URL, pool);
    const auth = makeAuth(config, database);

    const webHandler = auth.handler;

    const getSessionFromHeaders = Effect.fn("AuthService.getSessionFromHeaders")(
      function* (headers: Headers) {
        return yield* Effect.tryPromise({
          try: () => auth.api.getSession({ headers }),
          catch: (cause) => toAuthError(cause, "get session")
        });
      }
    );

    return {
      webHandler,
      getSessionFromHeaders
    };
  })
}) {}
