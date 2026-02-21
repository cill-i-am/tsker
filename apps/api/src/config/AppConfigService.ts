import { ConfigProvider, Effect } from "effect";

import { ConfigLoadError } from "../errors.js";
import { AppConfigFromEnv } from "./AppConfig.js";

export const makeConfigProvider = (env: Partial<Record<string, string | undefined>>) => {
  const map = new Map<string, string>();
  for (const [key, value] of Object.entries(env)) {
    if (value !== undefined) {
      map.set(key, value);
    }
  }
  return ConfigProvider.fromMap(map);
};

export class AppConfigService extends Effect.Service<AppConfigService>()("AppConfigService", {
  accessors: true,
  effect: Effect.gen(function* () {
    const config = yield* AppConfigFromEnv.pipe(
      Effect.mapError(
        (error) =>
          new ConfigLoadError({
            message: `Config provider decode failed: ${error.message}`
          })
      )
    );

    yield* Effect.log("Config loaded", {
      port: config.PORT,
      appEnv: config.APP_ENV,
      logLevel: config.LOG_LEVEL,
      authUrl: config.BETTER_AUTH_URL,
      authCookieDomain: config.AUTH_COOKIE_DOMAIN
    });

    const get = Effect.fn("AppConfigService.get")(() => Effect.succeed(config));

    return { get };
  })
}) {}
