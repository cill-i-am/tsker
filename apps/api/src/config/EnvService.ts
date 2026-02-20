import { Effect } from "effect";

export class EnvService extends Effect.Service<EnvService>()("EnvService", {
  accessors: true,
  effect: Effect.gen(function* () {
    const getAll = Effect.fn("EnvService.getAll")(function* (keys: readonly string[]) {
      const result: Record<string, string> = {};
      for (const key of keys) {
        const value = process.env[key];
        if (value !== undefined) {
          result[key] = value;
        }
      }

      yield* Effect.log("Environment variables read", {
        requestedKeys: keys.length,
        foundKeys: Object.keys(result).length
      });

      return result;
    });

    return { getAll };
  })
}) {}
