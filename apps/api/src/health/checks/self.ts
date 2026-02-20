import { Effect } from "effect";

import type { ReadinessCheck } from "../check.js";

export const selfReadinessCheck: ReadinessCheck = {
  name: "self",
  critical: true,
  run: Effect.void
};
