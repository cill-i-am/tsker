import { Effect } from "effect";

export const handleUp = Effect.fn("HealthHandlers.handleUp")(
  function* handleUp() {
    return {
      service: "api",
      status: "ok" as const,
      timestamp: new Date().toISOString(),
      uptimeSeconds: process.uptime(),
    };
  }
);
