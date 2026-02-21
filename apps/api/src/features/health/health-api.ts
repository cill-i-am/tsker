import { HttpApiEndpoint, HttpApiGroup } from "@effect/platform";
import { Schema } from "effect";

export const UpResponseSchema = Schema.Struct({
  service: Schema.String,
  status: Schema.Literal("ok"),
  timestamp: Schema.String,
  uptimeSeconds: Schema.Number,
});

export const HealthApi = HttpApiGroup.make("health").add(
  HttpApiEndpoint.get("up", "/up").addSuccess(UpResponseSchema),
);
