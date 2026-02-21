import { HttpApiBuilder } from "@effect/platform";
import { Layer } from "effect";

import { Api } from "@/api/api.js";
import { handleUp } from "@/features/health/health-handlers.js";

const HealthHandlers = HttpApiBuilder.group(Api, "health", (handlers) =>
  handlers.handle("up", handleUp),
);

export const HandlersLive = Layer.mergeAll(HealthHandlers);
