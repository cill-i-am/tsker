import { describe, expect, it } from "vitest";
import { Effect } from "effect";

import { createTestServer } from "../server.js";
import { ReadinessError } from "../health/errors.js";

describe("health endpoints", () => {
  const fixedRequestId = () => "test-request-id";

  it("returns liveness payload", async () => {
    const { handler, dispose } = await createTestServer(
      { APP_ENV: "local" },
      undefined,
      fixedRequestId
    );

    try {
      const response = await handler(new Request("http://localhost/health/live"));
      const body = (await response.json()) as {
        status: string;
        service: string;
        requestId: string;
      };

      expect(response.status).toBe(200);
      expect(body.status).toBe("ok");
      expect(body.service).toBe("api");
      expect(body.requestId).toBe("test-request-id");
    } finally {
      await dispose();
    }
  });

  it("returns 200 when readiness checks pass", async () => {
    const { handler, dispose } = await createTestServer(
      { APP_ENV: "local" },
      undefined,
      fixedRequestId
    );

    try {
      const response = await handler(new Request("http://localhost/health/ready"));
      const body = (await response.json()) as { status: string; requestId: string };

      expect(response.status).toBe(200);
      expect(body.status).toBe("ready");
      expect(body.requestId).toBe("test-request-id");
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
      ],
      fixedRequestId
    );

    try {
      const response = await handler(new Request("http://localhost/health/ready"));
      const body = (await response.json()) as { status: string; requestId: string };

      expect(response.status).toBe(503);
      expect(body.status).toBe("not_ready");
      expect(body.requestId).toBe("test-request-id");
    } finally {
      await dispose();
    }
  });

  it("returns minimal readiness payload in production", async () => {
    const { handler, dispose } = await createTestServer({
      APP_ENV: "production",
      OTEL_EXPORTER_OTLP_ENDPOINT: "http://collector:4318"
    }, undefined, fixedRequestId);

    try {
      const response = await handler(new Request("http://localhost/health/ready"));
      const body = (await response.json()) as Record<string, unknown>;

      expect(response.status).toBe(200);
      expect(body.status).toBe("ready");
      expect(body.checks).toBeUndefined();
      expect(body.requestId).toBe("test-request-id");
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
      ],
      fixedRequestId
    );

    try {
      const response = await handler(new Request("http://localhost/health/ready"));
      const body = (await response.json()) as Record<string, unknown>;

      expect(response.status).toBe(503);
      expect(body.status).toBe("not_ready");
      expect(body.checks).toBeUndefined();
      expect(body.requestId).toBe("test-request-id");
    } finally {
      await dispose();
    }
  });
});
