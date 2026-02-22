import { Effect, Exit, Layer, Option } from "effect";

import { AppConfigService, makeConfigProvider } from "@/config/app-config-service.js";

const requiredAuthEnv = {
  AUTH_COOKIE_DOMAIN: ".localtest.me",
  AUTH_TRUSTED_ORIGINS: "https://app.localtest.me",
  BETTER_AUTH_SECRET: "test-secret-test-secret-test-secret!",
  BETTER_AUTH_URL: "https://auth.localtest.me",
  DATABASE_URL: "postgres://postgres:postgres@localhost:5432/tsker",
} as const;

const loadConfig = (env: Partial<Record<string, string | undefined>>) =>
  AppConfigService.get().pipe(
    Effect.provide(
      Layer.provide(AppConfigService.Default, Layer.setConfigProvider(makeConfigProvider(env))),
    ),
  );

describe("app config service", () => {
  it("uses sane defaults", async () => {
    const config = await Effect.runPromise(loadConfig(requiredAuthEnv));

    expect({
      appEnv: config.APP_ENV,
      logLevel: config.LOG_LEVEL,
      port: config.PORT,
      resendApiKey: Option.getOrUndefined(config.RESEND_API_KEY),
      resendFromEmail: Option.getOrUndefined(config.RESEND_FROM_EMAIL),
      webBaseUrl: Option.getOrUndefined(config.WEB_BASE_URL),
    }).toStrictEqual({
      appEnv: "local",
      logLevel: "info",
      port: 3003,
      resendApiKey: undefined,
      resendFromEmail: undefined,
      webBaseUrl: undefined,
    });
  });

  it("decodes resend and web env vars when provided", async () => {
    const config = await Effect.runPromise(
      loadConfig({
        ...requiredAuthEnv,
        RESEND_API_KEY: "re_test_123",
        RESEND_FROM_EMAIL: "auth@example.com",
        WEB_BASE_URL: "https://app.localtest.me",
      }),
    );

    expect({
      resendApiKey: Option.getOrUndefined(config.RESEND_API_KEY),
      resendFromEmail: Option.getOrUndefined(config.RESEND_FROM_EMAIL),
      webBaseUrl: Option.getOrUndefined(config.WEB_BASE_URL),
    }).toStrictEqual({
      resendApiKey: "re_test_123",
      resendFromEmail: "auth@example.com",
      webBaseUrl: "https://app.localtest.me",
    });
  });

  it("allows production without telemetry env", async () => {
    const config = await Effect.runPromise(
      loadConfig({
        ...requiredAuthEnv,
        APP_ENV: "production",
      }),
    );

    expect(config.APP_ENV).toBe("production");
  });

  it("fails when LOG_LEVEL is invalid", async () => {
    const exit = await Effect.runPromiseExit(
      loadConfig({
        ...requiredAuthEnv,
        LOG_LEVEL: "verbose",
      }),
    );

    expect(Exit.isFailure(exit)).toBeTruthy();
  });

  it("fails when numeric values are malformed", async () => {
    const exit = await Effect.runPromiseExit(
      loadConfig({
        ...requiredAuthEnv,
        PORT: "nope",
      }),
    );

    expect(Exit.isFailure(exit)).toBeTruthy();
  });

  it("fails when BETTER_AUTH_SECRET is missing", async () => {
    const exit = await Effect.runPromiseExit(
      loadConfig({
        AUTH_COOKIE_DOMAIN: requiredAuthEnv.AUTH_COOKIE_DOMAIN,
        AUTH_TRUSTED_ORIGINS: requiredAuthEnv.AUTH_TRUSTED_ORIGINS,
        BETTER_AUTH_URL: requiredAuthEnv.BETTER_AUTH_URL,
        DATABASE_URL: requiredAuthEnv.DATABASE_URL,
      }),
    );

    expect(Exit.isFailure(exit)).toBeTruthy();
  });

  it("fails when AUTH_TRUSTED_ORIGINS is missing", async () => {
    const exit = await Effect.runPromiseExit(
      loadConfig({
        AUTH_COOKIE_DOMAIN: requiredAuthEnv.AUTH_COOKIE_DOMAIN,
        BETTER_AUTH_SECRET: requiredAuthEnv.BETTER_AUTH_SECRET,
        BETTER_AUTH_URL: requiredAuthEnv.BETTER_AUTH_URL,
        DATABASE_URL: requiredAuthEnv.DATABASE_URL,
      }),
    );

    expect(Exit.isFailure(exit)).toBeTruthy();
  });
});
