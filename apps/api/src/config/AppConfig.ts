import { Config } from "effect";

export const AppConfigFromEnv = Config.all({
  PORT: Config.integer("PORT").pipe(Config.withDefault(3002)),
  APP_ENV: Config.literal("local", "staging", "production")("APP_ENV").pipe(
    Config.withDefault("local")
  ),
  LOG_LEVEL: Config.literal("trace", "debug", "info", "warn", "error", "fatal")(
    "LOG_LEVEL"
  ).pipe(Config.withDefault("info")),
  DATABASE_URL: Config.string("DATABASE_URL"),
  BETTER_AUTH_SECRET: Config.string("BETTER_AUTH_SECRET"),
  BETTER_AUTH_URL: Config.string("BETTER_AUTH_URL"),
  AUTH_TRUSTED_ORIGINS: Config.string("AUTH_TRUSTED_ORIGINS"),
  AUTH_COOKIE_DOMAIN: Config.string("AUTH_COOKIE_DOMAIN")
});

export type AppConfigType = Config.Config.Success<typeof AppConfigFromEnv>;
