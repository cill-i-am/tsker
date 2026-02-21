import { Config } from "effect";

export const AppConfigFromEnv = Config.all({
  APP_ENV: Config.literal(
    "local",
    "staging",
    "production",
  )("APP_ENV").pipe(Config.withDefault("local")),
  AUTH_COOKIE_DOMAIN: Config.string("AUTH_COOKIE_DOMAIN"),
  AUTH_TRUSTED_ORIGINS: Config.string("AUTH_TRUSTED_ORIGINS"),
  BETTER_AUTH_SECRET: Config.string("BETTER_AUTH_SECRET"),
  BETTER_AUTH_URL: Config.string("BETTER_AUTH_URL"),
  DATABASE_URL: Config.string("DATABASE_URL"),
  LOG_LEVEL: Config.literal(
    "trace",
    "debug",
    "info",
    "warn",
    "error",
    "fatal",
  )("LOG_LEVEL").pipe(Config.withDefault("info")),
  PORT: Config.integer("PORT").pipe(Config.withDefault(3002)),
});

export type AppConfigType = Config.Config.Success<typeof AppConfigFromEnv>;
