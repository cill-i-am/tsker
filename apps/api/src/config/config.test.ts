import { Effect, Exit, Layer } from "effect";

import { AppConfigService, makeConfigProvider } from "@/config/app-config-service.js";

const loadConfig = (env: Partial<Record<string, string | undefined>>) =>
  AppConfigService.get().pipe(
    Effect.provide(
      Layer.provide(AppConfigService.Default, Layer.setConfigProvider(makeConfigProvider(env))),
    ),
  );

describe("app config service", () => {
  it("uses sane defaults", async () => {
    const config = await Effect.runPromise(loadConfig({}));

    expect(config.PORT).toBe(3002);
    expect(config.APP_ENV).toBe("local");
    expect(config.LOG_LEVEL).toBe("info");
  });

  it("allows production without extra env", async () => {
    const config = await Effect.runPromise(
      loadConfig({
        APP_ENV: "production",
      }),
    );

    expect(config.APP_ENV).toBe("production");
  });

  it("fails when LOG_LEVEL is invalid", async () => {
    const exit = await Effect.runPromiseExit(
      loadConfig({
        LOG_LEVEL: "verbose",
      }),
    );

    expect(Exit.isFailure(exit)).toBeTruthy();
  });

  it("fails when numeric values are malformed", async () => {
    const exit = await Effect.runPromiseExit(
      loadConfig({
        PORT: "nope",
      }),
    );

    expect(Exit.isFailure(exit)).toBeTruthy();
  });
});
