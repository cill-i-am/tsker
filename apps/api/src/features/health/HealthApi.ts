import { HttpApiEndpoint, HttpApiGroup } from "@effect/platform";
import { Schema } from "effect";

export const UpResponseSchema = Schema.Struct({
  status: Schema.Literal("ok"),
  service: Schema.String,
  uptimeSeconds: Schema.Number,
  timestamp: Schema.String
});

export const HealthApi = HttpApiGroup.make("health").add(
  HttpApiEndpoint.get("up", "/up").addSuccess(UpResponseSchema)
);
