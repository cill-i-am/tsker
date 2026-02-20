import { Config, Schema } from "effect";

const AppEnv = Schema.Literal("local", "staging", "production");
const LogLevel = Schema.Literal("trace", "debug", "info", "warn", "error", "fatal");

export const AppConfig = Schema.Struct({
  PORT: Schema.NumberFromString.pipe(Schema.int()),
  APP_ENV: AppEnv,
  LOG_LEVEL: LogLevel
});
export type AppConfigType = Schema.Schema.Type<typeof AppConfig>;

export const APP_CONFIG_KEYS = ["PORT", "APP_ENV", "LOG_LEVEL"] as const;

export const AppConfigFromEnv = Config.all({
  PORT: Config.string("PORT").pipe(Config.withDefault("3002")),
  APP_ENV: Config.string("APP_ENV").pipe(Config.withDefault("local")),
  LOG_LEVEL: Config.string("LOG_LEVEL").pipe(Config.withDefault("info"))
});
