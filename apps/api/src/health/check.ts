import type { Effect } from "effect/Effect";

import type { ReadinessError } from "./errors";

export interface ReadinessCheck {
  readonly name: string;
  readonly critical: boolean;
  readonly run: Effect<void, ReadinessError, never>;
}

export interface ReadinessCheckResult {
  readonly name: string;
  readonly critical: boolean;
  readonly ok: boolean;
  readonly latencyMs: number;
  readonly message?: string;
}

export interface ReadinessReport {
  readonly status: "ready" | "not_ready";
  readonly checks: ReadonlyArray<ReadinessCheckResult>;
  readonly timestamp: string;
}
