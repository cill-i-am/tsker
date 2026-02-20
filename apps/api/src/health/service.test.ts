import { describe, expect, it } from "vitest";
import { Effect } from "effect";

import { makeReadinessReport } from "./service";
import { ReadinessError } from "./errors";

describe("makeReadinessReport", () => {
  it("returns ready when all checks pass", async () => {
    const report = await Effect.runPromise(
      makeReadinessReport({
        checks: [
          {
            name: "self",
            critical: true,
            run: Effect.void
          }
        ],
        checkTimeoutMs: 50,
        totalTimeoutMs: 200
      })
    );

    expect(report.status).toBe("ready");
    expect(report.checks).toHaveLength(1);
    expect(report.checks[0]?.ok).toBe(true);
  });

  it("returns not_ready when a critical check fails", async () => {
    const report = await Effect.runPromise(
      makeReadinessReport({
        checks: [
          {
            name: "critical",
            critical: true,
            run: Effect.fail(new ReadinessError({ message: "boom" }))
          }
        ],
        checkTimeoutMs: 50,
        totalTimeoutMs: 200
      })
    );

    expect(report.status).toBe("not_ready");
    expect(report.checks[0]?.ok).toBe(false);
  });

  it("times out slow checks", async () => {
    const report = await Effect.runPromise(
      makeReadinessReport({
        checks: [
          {
            name: "slow",
            critical: true,
            run: Effect.never
          }
        ],
        checkTimeoutMs: 10,
        totalTimeoutMs: 100
      })
    );

    expect(report.status).toBe("not_ready");
    expect(report.checks[0]?.message).toMatch(/timeout/i);
  });
});
