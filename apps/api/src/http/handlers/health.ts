import { HttpApiBuilder, HttpServerResponse } from "@effect/platform";
import { Effect } from "effect";

import type { AppConfig } from "../../config";
import type { ReadinessCheck } from "../../health/check";
import type { ReadinessCheckResult } from "../../health/check";
import { makeReadinessReport } from "../../health/service";
import { Api } from "../api";

const normalizeChecks = (checks: ReadonlyArray<ReadinessCheckResult>) =>
  checks.map((check) => ({
    ...check,
    message: check.message ?? null
  }));

export const makeHealthHandlers = (
  config: AppConfig,
  checks: ReadonlyArray<ReadinessCheck>
) => {
  type UnsafeHandlers = {
    handle: (name: string, handler: () => Effect.Effect<unknown>) => UnsafeHandlers;
  };

  const unsafeGroup = HttpApiBuilder.group as unknown as (
    api: unknown,
    groupName: string,
    build: (handlers: UnsafeHandlers) => UnsafeHandlers
  ) => unknown;

  return unsafeGroup(Api, "health", (handlers) =>
    handlers
      .handle("live", () =>
        Effect.succeed({
          status: "ok" as const,
          service: "api",
          uptimeSeconds: process.uptime(),
          timestamp: new Date().toISOString(),
          requestId: crypto.randomUUID()
        })
      )
      .handle("ready", () =>
        Effect.gen(function* () {
          const report = yield* makeReadinessReport({
            checks,
            checkTimeoutMs: config.healthCheckTimeoutMs,
            totalTimeoutMs: config.healthTotalTimeoutMs
          });

          if (config.appEnv === "production") {
            const status = report.status === "ready" ? 200 : 503;
            return yield* HttpServerResponse.json(
              {
                status: report.status,
                timestamp: report.timestamp,
                requestId: crypto.randomUUID()
              },
              { status }
            ).pipe(Effect.orDie);
          }

          const response = {
            ...report,
            checks: normalizeChecks(report.checks),
            requestId: crypto.randomUUID()
          };

          if (report.status === "ready") {
            return response;
          }

          return yield* HttpServerResponse.json(response, { status: 503 }).pipe(Effect.orDie);
        })
      )
  );
};
