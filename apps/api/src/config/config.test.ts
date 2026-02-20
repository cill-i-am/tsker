import { describe, expect, it } from "vitest";
import { Effect, Exit, Layer } from "effect";

import { AppConfigService } from "./AppConfigService.js";
import { EnvService } from "./EnvService.js";

const makeEnvLayer = (env: Partial<Record<string, string | undefined>>): Layer.Layer<EnvService> =>
  Layer.succeed(
    EnvService,
    EnvService.of({
      _tag: "EnvService",
      getAll: (keys: readonly string[]) =>
        Effect.gen(function* () {
          const result: Record<string, string> = {};
          for (const key of keys) {
            const value = env[key];
            if (value !== undefined) {
              result[key] = value;
            }
          }
          return result;
        })
    })
  );

const loadConfig = (env: Partial<Record<string, string | undefined>>) =>
  AppConfigService.get().pipe(Effect.provide(AppConfigService.Default.pipe(Layer.provide(makeEnvLayer(env)))));

describe("AppConfigService", () => {
  it("uses sane defaults", async () => {
    const config = await Effect.runPromise(loadConfig({}));

    expect(config.PORT).toBe(3002);
    expect(config.APP_ENV).toBe("local");
    expect(config.LOG_LEVEL).toBe("info");
  });

  it("allows production without telemetry env", async () => {
    const config = await Effect.runPromise(
      loadConfig({
        APP_ENV: "production"
      })
    );

    expect(config.APP_ENV).toBe("production");
  });

  it("fails when LOG_LEVEL is invalid", async () => {
    const exit = await Effect.runPromiseExit(
      loadConfig({
        LOG_LEVEL: "verbose"
      })
    );

    expect(Exit.isFailure(exit)).toBe(true);
  });

  it("fails when numeric values are malformed", async () => {
    const exit = await Effect.runPromiseExit(
      loadConfig({
        PORT: "nope"
      })
    );

    expect(Exit.isFailure(exit)).toBe(true);
  });
});
