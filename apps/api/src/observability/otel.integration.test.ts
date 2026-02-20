import { describe, expect, it } from "vitest";

import { createTestServer } from "../server";

describe("telemetry fail-open", () => {
  it("serves traffic even when OTLP endpoint is unreachable", async () => {
    const { handler, dispose } = await createTestServer({
      APP_ENV: "local",
      OTEL_EXPORTER_OTLP_ENDPOINT: "http://127.0.0.1:1"
    });

    try {
      const response = await handler(new Request("http://localhost/health/live"));
      expect(response.status).toBe(200);
    } finally {
      await dispose();
    }
  });
});
