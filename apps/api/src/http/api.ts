import { HttpApi, HttpApiEndpoint, HttpApiGroup } from "@effect/platform";

import { LiveResponseSchema, ReadyResponseSchema } from "./schemas";

export const HealthGroup = HttpApiGroup.make("health")
  .add(HttpApiEndpoint.get("live", "/health/live").addSuccess(LiveResponseSchema))
  .add(HttpApiEndpoint.get("ready", "/health/ready").addSuccess(ReadyResponseSchema));

export const Api = HttpApi.make("api").add(HealthGroup);
