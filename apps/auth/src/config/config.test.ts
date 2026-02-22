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

    expect(config.PORT).toBe(3003);
    expect(config.APP_ENV).toBe("local");
    expect(config.LOG_LEVEL).toBe("info");
    expect(Option.isNone(config.RESEND_API_KEY)).toBeTruthy();
    expect(Option.isNone(config.RESEND_FROM_EMAIL)).toBeTruthy();
    expect(Option.isNone(config.WEB_BASE_URL)).toBeTruthy();
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

    expect(Option.isSome(config.RESEND_API_KEY)).toBeTruthy();
    expect(Option.isSome(config.RESEND_FROM_EMAIL)).toBeTruthy();
    expect(Option.isSome(config.WEB_BASE_URL)).toBeTruthy();
    if (Option.isSome(config.RESEND_API_KEY)) {
      expect(config.RESEND_API_KEY.value).toBe("re_test_123");
    }
    if (Option.isSome(config.RESEND_FROM_EMAIL)) {
      expect(config.RESEND_FROM_EMAIL.value).toBe("auth@example.com");
    }
    if (Option.isSome(config.WEB_BASE_URL)) {
      expect(config.WEB_BASE_URL.value).toBe("https://app.localtest.me");
    }
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
