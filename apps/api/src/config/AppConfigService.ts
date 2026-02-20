import { ConfigProvider, Effect, Schema } from "effect";

import { ConfigLoadError } from "../errors.js";
import { APP_CONFIG_KEYS, AppConfig, AppConfigFromEnv } from "./AppConfig.js";
import { EnvService } from "./EnvService.js";

export class AppConfigService extends Effect.Service<AppConfigService>()("AppConfigService", {
  accessors: true,
  effect: Effect.gen(function* () {
    const env = yield* EnvService;

    const envValues = yield* env.getAll(APP_CONFIG_KEYS);
    const provider = ConfigProvider.fromMap(new Map(Object.entries(envValues)));

    const rawConfig = yield* AppConfigFromEnv.pipe(
      Effect.withConfigProvider(provider),
      Effect.mapError(
        (error) =>
          new ConfigLoadError({
            message: `Config provider decode failed: ${error.message}`
          })
      )
    );

    const config = yield* Schema.decodeUnknown(AppConfig)(rawConfig).pipe(
      Effect.mapError(
        (error) =>
          new ConfigLoadError({
            message: `Schema validation failed: ${error.message}`
          })
      )
    );

    yield* Effect.log("Config loaded", {
      port: config.PORT,
      appEnv: config.APP_ENV,
      logLevel: config.LOG_LEVEL
    });

    const get = Effect.fn("AppConfigService.get")(function* () {
      return config;
    });

    return { get };
  })
}) {}
