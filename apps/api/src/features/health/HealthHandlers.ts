import { Effect } from "effect";

export const handleUp = Effect.fn("HealthHandlers.handleUp")(function* () {
  return {
    status: "ok" as const,
    service: "api",
    uptimeSeconds: process.uptime(),
    timestamp: new Date().toISOString()
  };
});
