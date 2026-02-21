import * as SqlClient from "@effect/sql/SqlClient";
import * as PgClient from "@effect/sql-pg/PgClient";
import { Effect, Layer, Redacted } from "effect";

export const makeSqlClientLayer = (databaseUrl: string) =>
  PgClient.layer({
    url: Redacted.make(databaseUrl)
  });

export class DbService extends Effect.Service<DbService>()("DbService", {
  accessors: true,
  effect: Effect.gen(function* () {
    const sql = yield* SqlClient.SqlClient;

    const ping = Effect.fn("DbService.ping")(function* () {
      const rows = yield* sql<{ readonly ok: number }>`select 1 as ok`;
      return rows[0]?.ok === 1;
    });

    const now = Effect.fn("DbService.now")(function* () {
      const rows = yield* sql<{ readonly now: Date }>`select now() as now`;
      return rows[0]?.now ?? null;
    });

    return {
      ping,
      now
    };
  })
}) {}

export const makeDbServiceLayer = (databaseUrl: string) =>
  DbService.Default.pipe(Layer.provide(makeSqlClientLayer(databaseUrl)));
