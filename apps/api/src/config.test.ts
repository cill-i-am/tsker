import { describe, expect, it } from "vitest";

import { loadConfig } from "./config.js";

describe("loadConfig", () => {
  it("uses sane defaults", () => {
    const config = loadConfig({});

    expect(config.port).toBe(3002);
    expect(config.appEnv).toBe("local");
    expect(config.healthCheckTimeoutMs).toBe(250);
    expect(config.healthTotalTimeoutMs).toBe(1000);
  });

  it("throws when production omits OTLP endpoint", () => {
    expect(() =>
      loadConfig({
        APP_ENV: "production"
      })
    ).toThrow(/OTEL_EXPORTER_OTLP_ENDPOINT/);
  });

  it("allows production when OTLP endpoint is set", () => {
    const config = loadConfig({
      APP_ENV: "production",
      OTEL_EXPORTER_OTLP_ENDPOINT: "http://collector:4318"
    });

    expect(config.otlpEndpoint).toBe("http://collector:4318");
  });

  it("throws when LOG_LEVEL is invalid", () => {
    expect(() =>
      loadConfig({
        LOG_LEVEL: "verbose"
      })
    ).toThrow(/LOG_LEVEL must be one of/);
  });
});
