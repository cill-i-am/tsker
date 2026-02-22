import { Schema } from "effect";

import { UpResponseSchema } from "@/features/health/health-api.js";
import { createTestServer } from "@/server.js";

const decodeUpResponse = Schema.decodeUnknownSync(UpResponseSchema);
const baseEnv = {
  APP_ENV: "local",
} as const;

describe("up endpoint", () => {
  it("returns up payload", async () => {
    const { handler, dispose } = createTestServer(baseEnv);

    try {
      const response = await handler(new Request("http://localhost/up"));
      const body = decodeUpResponse(await response.json());

      expect(response.status).toBe(200);
      expect(body.status).toBe("ok");
      expect(body.service).toBe("api");
      expectTypeOf(body.uptimeSeconds).toBeNumber();
      expectTypeOf(body.timestamp).toBeString();
    } finally {
      await dispose();
    }
  });
});

describe("swagger exposure", () => {
  it("exposes docs in local", async () => {
    const { handler, dispose } = createTestServer(baseEnv);

    try {
      const response = await handler(new Request("http://localhost/docs"));
      expect(response.status).not.toBe(404);
    } finally {
      await dispose();
    }
  });

  it("hides docs in production", async () => {
    const { handler, dispose } = createTestServer({
      APP_ENV: "production",
    });

    try {
      const response = await handler(new Request("http://localhost/docs"));
      expect(response.status).toBe(404);
    } finally {
      await dispose();
    }
  });
});

describe("auth routing", () => {
  it("does not serve /api/auth/* handlers", async () => {
    const { handler, dispose } = createTestServer(baseEnv);

    try {
      const response = await handler(
        new Request("http://api.localtest.me:3002/api/auth/get-session", {
          headers: {
            origin: "http://app.localtest.me:3000",
          },
        }),
      );

      expect(response.status).toBe(404);
    } finally {
      await dispose();
    }
  });
});
