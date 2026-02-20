import { HttpApiBuilder } from "@effect/platform";
import { Effect, Layer } from "effect";

import { Api } from "./Api.js";

const HealthHandlers = HttpApiBuilder.group(Api, "health", (handlers) =>
  handlers.handle("up", () =>
    Effect.succeed({
      status: "ok" as const,
      service: "api",
      uptimeSeconds: process.uptime(),
      timestamp: new Date().toISOString()
    })
  )
);

export const HandlersLive = Layer.mergeAll(HealthHandlers);
