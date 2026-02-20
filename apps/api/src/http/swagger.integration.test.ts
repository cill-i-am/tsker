import { describe, expect, it } from "vitest";

import { createTestServer } from "../server";

describe("swagger exposure", () => {
  it("exposes docs in local", async () => {
    const { handler, dispose } = await createTestServer({ APP_ENV: "local" });

    try {
      const response = await handler(new Request("http://localhost/docs"));
      expect(response.status).not.toBe(404);
    } finally {
      await dispose();
    }
  });

  it("hides docs in production", async () => {
    const { handler, dispose } = await createTestServer({
      APP_ENV: "production",
      OTEL_EXPORTER_OTLP_ENDPOINT: "http://collector:4318"
    });

    try {
      const response = await handler(new Request("http://localhost/docs"));
      expect(response.status).toBe(404);
    } finally {
      await dispose();
    }
  });
});
