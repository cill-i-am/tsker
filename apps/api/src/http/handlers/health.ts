import { HttpApiBuilder, HttpServerResponse } from "@effect/platform";
import { Effect } from "effect";

import type { AppConfig } from "../../config.js";
import type { ReadinessCheck } from "../../health/check.js";
import type { ReadinessCheckResult } from "../../health/check.js";
import { makeReadinessReport } from "../../health/service.js";
import { Api } from "../api.js";

const normalizeChecks = (checks: ReadonlyArray<ReadinessCheckResult>) =>
  checks.map((check) => ({
    ...check,
    message: check.message ?? null
  }));

export type RequestIdGenerator = () => string;

export const makeHealthHandlers = (
  config: AppConfig,
  checks: ReadonlyArray<ReadinessCheck>,
  makeRequestId: RequestIdGenerator = () => crypto.randomUUID()
) =>
  HttpApiBuilder.group(Api, "health", (handlers) =>
    handlers
      .handle("live", () =>
        Effect.succeed({
          status: "ok" as const,
          service: "api",
          uptimeSeconds: process.uptime(),
          timestamp: new Date().toISOString(),
          requestId: makeRequestId()
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
            return HttpServerResponse.unsafeJson(
              {
                status: report.status,
                timestamp: report.timestamp,
                requestId: makeRequestId()
              },
              { status }
            );
          }

          const response = {
            ...report,
            checks: normalizeChecks(report.checks),
            requestId: makeRequestId()
          };

          if (report.status === "ready") {
            return response;
          }

          return HttpServerResponse.unsafeJson(response, { status: 503 });
        })
      )
  );
