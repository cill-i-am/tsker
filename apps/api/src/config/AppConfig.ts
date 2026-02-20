import { Config } from "effect";

export const AppConfigFromEnv = Config.all({
  PORT: Config.integer("PORT").pipe(Config.withDefault(3002)),
  APP_ENV: Config.literal("local", "staging", "production")("APP_ENV").pipe(
    Config.withDefault("local")
  ),
  LOG_LEVEL: Config.literal("trace", "debug", "info", "warn", "error", "fatal")(
    "LOG_LEVEL"
  ).pipe(Config.withDefault("info"))
});

export type AppConfigType = Config.Config.Success<typeof AppConfigFromEnv>;
