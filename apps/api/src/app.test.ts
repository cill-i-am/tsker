import { describe, expect, it } from "vitest";
import { Schema } from "effect";

import { UpResponseSchema } from "./features/health/HealthApi.js";
import { createTestServer } from "./server.js";

const decodeUpResponse = Schema.decodeUnknownSync(UpResponseSchema);

describe("up endpoint", () => {
  it("returns up payload", async () => {
    const { handler, dispose } = await createTestServer({ APP_ENV: "local" });

    try {
      const response = await handler(new Request("http://localhost/up"));
      const body = decodeUpResponse(await response.json());

      expect(response.status).toBe(200);
      expect(body.status).toBe("ok");
      expect(body.service).toBe("api");
      expect(typeof body.uptimeSeconds).toBe("number");
      expect(typeof body.timestamp).toBe("string");
    } finally {
      await dispose();
    }
  });
});

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
      APP_ENV: "production"
    });

    try {
      const response = await handler(new Request("http://localhost/docs"));
      expect(response.status).toBe(404);
    } finally {
      await dispose();
    }
  });
});
