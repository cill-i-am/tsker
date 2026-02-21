import { Effect } from "effect";

export const handleUp = Effect.fn("HealthHandlers.handleUp")(() =>
  Effect.succeed({
    status: "ok" as const,
    service: "api",
    uptimeSeconds: process.uptime(),
    timestamp: new Date().toISOString()
  })
);
