import { describe, expect, it } from "vitest";
import { Effect } from "effect";

import { createTestServer } from "../server";
import { ReadinessError } from "../health/errors";

describe("health endpoints", () => {
  it("returns liveness payload", async () => {
    const { handler, dispose } = await createTestServer({ APP_ENV: "local" });

    try {
      const response = await handler(new Request("http://localhost/health/live"));
      const body = (await response.json()) as { status: string; service: string };

      expect(response.status).toBe(200);
      expect(body.status).toBe("ok");
      expect(body.service).toBe("api");
    } finally {
      await dispose();
    }
  });

  it("returns 200 when readiness checks pass", async () => {
    const { handler, dispose } = await createTestServer({ APP_ENV: "local" });

    try {
      const response = await handler(new Request("http://localhost/health/ready"));
      const body = (await response.json()) as { status: string };

      expect(response.status).toBe(200);
      expect(body.status).toBe("ready");
    } finally {
      await dispose();
    }
  });

  it("returns 503 when a critical check fails", async () => {
    const { handler, dispose } = await createTestServer(
      { APP_ENV: "local" },
      [
        {
          name: "failing",
          critical: true,
          run: Effect.fail(new ReadinessError({ message: "dependency down" }))
        }
      ]
    );

    try {
      const response = await handler(new Request("http://localhost/health/ready"));
      const body = (await response.json()) as { status: string };

      expect(response.status).toBe(503);
      expect(body.status).toBe("not_ready");
    } finally {
      await dispose();
    }
  });

  it("returns minimal readiness payload in production", async () => {
    const { handler, dispose } = await createTestServer({
      APP_ENV: "production",
      OTEL_EXPORTER_OTLP_ENDPOINT: "http://collector:4318"
    });

    try {
      const response = await handler(new Request("http://localhost/health/ready"));
      const body = (await response.json()) as Record<string, unknown>;

      expect(response.status).toBe(200);
      expect(body.status).toBe("ready");
      expect(body.checks).toBeUndefined();
    } finally {
      await dispose();
    }
  });

  it("returns 503 with minimal payload in production when not ready", async () => {
    const { handler, dispose } = await createTestServer(
      {
        APP_ENV: "production",
        OTEL_EXPORTER_OTLP_ENDPOINT: "http://collector:4318"
      },
      [
        {
          name: "failing",
          critical: true,
          run: Effect.fail(new ReadinessError({ message: "dependency down" }))
        }
      ]
    );

    try {
      const response = await handler(new Request("http://localhost/health/ready"));
      const body = (await response.json()) as Record<string, unknown>;

      expect(response.status).toBe(503);
      expect(body.status).toBe("not_ready");
      expect(body.checks).toBeUndefined();
    } finally {
      await dispose();
    }
  });
});
