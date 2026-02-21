import { describe, expect, it } from "vitest";
import { Effect, Exit, Layer } from "effect";

import { AppConfigService, makeConfigProvider } from "./AppConfigService.js";

const requiredAuthEnv = {
  DATABASE_URL: "postgres://postgres:postgres@localhost:5432/tsker",
  BETTER_AUTH_SECRET: "test-secret-test-secret-test-secret!",
  BETTER_AUTH_URL: "https://api.localtest.me",
  AUTH_TRUSTED_ORIGINS: "https://app.localtest.me",
  AUTH_COOKIE_DOMAIN: ".localtest.me"
} as const;

const loadConfig = (env: Partial<Record<string, string | undefined>>) =>
  AppConfigService.get().pipe(
    Effect.provide(
      Layer.provide(
        AppConfigService.Default,
        Layer.setConfigProvider(makeConfigProvider(env))
      )
    )
  );

describe("AppConfigService", () => {
  it("uses sane defaults", async () => {
    const config = await Effect.runPromise(loadConfig(requiredAuthEnv));

    expect(config.PORT).toBe(3002);
    expect(config.APP_ENV).toBe("local");
    expect(config.LOG_LEVEL).toBe("info");
  });

  it("allows production without telemetry env", async () => {
    const config = await Effect.runPromise(
      loadConfig({
        ...requiredAuthEnv,
        APP_ENV: "production",
      })
    );

    expect(config.APP_ENV).toBe("production");
  });

  it("fails when LOG_LEVEL is invalid", async () => {
    const exit = await Effect.runPromiseExit(
      loadConfig({
        ...requiredAuthEnv,
        LOG_LEVEL: "verbose"
      })
    );

    expect(Exit.isFailure(exit)).toBe(true);
  });

  it("fails when numeric values are malformed", async () => {
    const exit = await Effect.runPromiseExit(
      loadConfig({
        ...requiredAuthEnv,
        PORT: "nope"
      })
    );

    expect(Exit.isFailure(exit)).toBe(true);
  });

  it("fails when BETTER_AUTH_SECRET is missing", async () => {
    const exit = await Effect.runPromiseExit(
      loadConfig({
        DATABASE_URL: requiredAuthEnv.DATABASE_URL,
        BETTER_AUTH_URL: requiredAuthEnv.BETTER_AUTH_URL,
        AUTH_TRUSTED_ORIGINS: requiredAuthEnv.AUTH_TRUSTED_ORIGINS,
        AUTH_COOKIE_DOMAIN: requiredAuthEnv.AUTH_COOKIE_DOMAIN
      })
    );

    expect(Exit.isFailure(exit)).toBe(true);
  });

  it("fails when AUTH_TRUSTED_ORIGINS is missing", async () => {
    const exit = await Effect.runPromiseExit(
      loadConfig({
        DATABASE_URL: requiredAuthEnv.DATABASE_URL,
        BETTER_AUTH_SECRET: requiredAuthEnv.BETTER_AUTH_SECRET,
        BETTER_AUTH_URL: requiredAuthEnv.BETTER_AUTH_URL,
        AUTH_COOKIE_DOMAIN: requiredAuthEnv.AUTH_COOKIE_DOMAIN
      })
    );

    expect(Exit.isFailure(exit)).toBe(true);
  });
});
