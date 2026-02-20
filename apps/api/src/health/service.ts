import { Effect, Either } from "effect";

import type { ReadinessCheck, ReadinessCheckResult, ReadinessReport } from "./check";
import { ReadinessError } from "./errors";

interface MakeReadinessReportInput {
  readonly checks: ReadonlyArray<ReadinessCheck>;
  readonly checkTimeoutMs: number;
  readonly totalTimeoutMs: number;
}

const runCheck = (
  check: ReadinessCheck,
  checkTimeoutMs: number
): Effect.Effect<ReadinessCheckResult, never> =>
  Effect.gen(function* () {
    const start = Date.now();

    const outcome = yield* check.run.pipe(
      Effect.timeoutFail({
        duration: `${checkTimeoutMs} millis`,
        onTimeout: () =>
          new ReadinessError({
            message: `timeout after ${checkTimeoutMs}ms`
          })
      }),
      Effect.either
    );

    const normalized = Either.isRight(outcome)
      ? {
          ok: true as const,
          message: undefined
        }
      : {
          ok: false as const,
          message: outcome.left.message
        };

    return {
      name: check.name,
      critical: check.critical,
      ok: normalized.ok,
      message: normalized.message,
      latencyMs: Date.now() - start
    };
  });

const aggregateStatus = (checks: ReadonlyArray<ReadinessCheckResult>): "ready" | "not_ready" => {
  const hasCriticalFailure = checks.some((check) => check.critical && !check.ok);
  return hasCriticalFailure ? "not_ready" : "ready";
};

export const makeReadinessReport = ({
  checks,
  checkTimeoutMs,
  totalTimeoutMs
}: MakeReadinessReportInput): Effect.Effect<ReadinessReport, never> => {
  const runAllChecks = Effect.all(
    checks.map((check) => runCheck(check, checkTimeoutMs))
  ).pipe(
    Effect.timeoutFail({
      duration: `${totalTimeoutMs} millis`,
      onTimeout: () =>
        new ReadinessError({
          message: `readiness timeout after ${totalTimeoutMs}ms`
        })
    })
  );

  return runAllChecks.pipe(
    Effect.match({
      onSuccess: (results) => ({
        status: aggregateStatus(results),
        checks: results,
        timestamp: new Date().toISOString()
      }),
      onFailure: (error) => ({
        status: "not_ready" as const,
        checks: [
          {
            name: "readiness",
            critical: true,
            ok: false,
            latencyMs: totalTimeoutMs,
            message: error.message
          }
        ],
        timestamp: new Date().toISOString()
      })
    })
  );
};
