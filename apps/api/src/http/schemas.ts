import { Schema } from "effect";

export const ReadinessCheckResultSchema = Schema.Struct({
  name: Schema.String,
  critical: Schema.Boolean,
  ok: Schema.Boolean,
  latencyMs: Schema.Number,
  message: Schema.NullOr(Schema.String)
});

export const LiveResponseSchema = Schema.Struct({
  status: Schema.Literal("ok"),
  service: Schema.String,
  uptimeSeconds: Schema.Number,
  timestamp: Schema.String,
  requestId: Schema.String
});

export const ReadyResponseSchema = Schema.Struct({
  status: Schema.Literal("ready", "not_ready"),
  checks: Schema.optionalWith(Schema.Array(ReadinessCheckResultSchema), {
    exact: true
  }),
  timestamp: Schema.String,
  requestId: Schema.String
});
