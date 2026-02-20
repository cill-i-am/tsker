export type AppEnv = "local" | "staging" | "production";
export type LogLevel = "trace" | "debug" | "info" | "warn" | "error" | "fatal";

export interface AppConfig {
  readonly port: number;
  readonly appEnv: AppEnv;
  readonly logLevel: LogLevel;
  readonly otlpEndpoint?: string;
  readonly otlpHeaders?: string;
  readonly healthCheckTimeoutMs: number;
  readonly healthTotalTimeoutMs: number;
}

const appEnvs = new Set<AppEnv>(["local", "staging", "production"]);
const logLevels = new Set<LogLevel>(["trace", "debug", "info", "warn", "error", "fatal"]);

const parseNumber = (value: string | undefined, fallback: number): number => {
  if (!value) {
    return fallback;
  }

  const parsed = Number.parseInt(value, 10);
  return Number.isNaN(parsed) ? fallback : parsed;
};

export const loadConfig = (
  env: Partial<Record<string, string | undefined>> = process.env
): AppConfig => {
  const appEnv = (env.APP_ENV ?? "local") as AppEnv;
  const logLevel = (env.LOG_LEVEL ?? "info") as LogLevel;

  if (!appEnvs.has(appEnv)) {
    throw new Error(`APP_ENV must be one of: local, staging, production. Received: ${appEnv}`);
  }

  if (!logLevels.has(logLevel)) {
    throw new Error(
      `LOG_LEVEL must be one of: trace, debug, info, warn, error, fatal. Received: ${logLevel}`
    );
  }

  const config: AppConfig = {
    port: parseNumber(env.PORT, 3002),
    appEnv,
    logLevel,
    otlpEndpoint: env.OTEL_EXPORTER_OTLP_ENDPOINT,
    otlpHeaders: env.OTEL_EXPORTER_OTLP_HEADERS,
    healthCheckTimeoutMs: parseNumber(env.HEALTH_CHECK_TIMEOUT_MS, 250),
    healthTotalTimeoutMs: parseNumber(env.HEALTH_TOTAL_TIMEOUT_MS, 1000)
  };

  if (
    (config.appEnv === "production" || config.appEnv === "staging") &&
    !config.otlpEndpoint
  ) {
    throw new Error(
      "OTEL_EXPORTER_OTLP_ENDPOINT is required when APP_ENV is staging or production"
    );
  }

  return config;
};
