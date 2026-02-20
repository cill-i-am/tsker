import { HttpApiBuilder } from "@effect/platform";
import { Layer } from "effect";

import { Api } from "./Api.js";
import { handleUp } from "../features/health/HealthHandlers.js";

const HealthHandlers = HttpApiBuilder.group(Api, "health", (handlers) =>
  handlers.handle("up", handleUp)
);

export const HandlersLive = Layer.mergeAll(HealthHandlers);
