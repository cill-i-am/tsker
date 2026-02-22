import { ConfigProvider, Effect } from "effect";

import { AppConfigFromEnv } from "@/config/app-config.js";
import { ConfigLoadError } from "@/errors/config-load-error.js";

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
  effect: Effect.gen(function* effect() {
    const config = yield* AppConfigFromEnv.pipe(
      Effect.mapError(
        (error) =>
          new ConfigLoadError({
            message: `Config provider decode failed: ${error.message}`,
          }),
      ),
    );

    yield* Effect.log("Config loaded", {
      appEnv: config.APP_ENV,
      authCookieDomain: config.AUTH_COOKIE_DOMAIN,
      authUrl: config.BETTER_AUTH_URL,
      logLevel: config.LOG_LEVEL,
      port: config.PORT,
    });

    const get = Effect.fn("AppConfigService.get")(() => Effect.succeed(config));

    return { get };
  }),
}) {}
