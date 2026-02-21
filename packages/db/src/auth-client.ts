import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import type { PoolConfig } from "pg";

import { authSchema } from "./schema.js";

export const createAuthPool = (
  databaseUrl: string,
  config: Omit<PoolConfig, "connectionString"> = {},
) =>
  new Pool({
    connectionString: databaseUrl,
    ...config,
  });

export const createAuthDrizzleClient = (pool: Pool) =>
  drizzle(pool, {
    schema: authSchema,
  });
