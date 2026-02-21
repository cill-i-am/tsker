import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { tanstackStartCookies } from "better-auth/tanstack-start";
import { authSchema, createAuthDrizzleClient } from "@repo/db";
import type { Pool } from "pg";

import type { AppConfigType } from "../config/AppConfig.js";

const parseTrustedOrigins = (value: string): Array<string> =>
  value
    .split(",")
    .map((origin) => origin.trim())
    .filter((origin) => origin.length > 0);

export type AuthDatabase = ReturnType<typeof createAuthDrizzleClient>;
export type AuthInstance = ReturnType<typeof betterAuth>;

export const makeAuth = (config: AppConfigType, database: AuthDatabase): AuthInstance => {
  const trustedOrigins = parseTrustedOrigins(config.AUTH_TRUSTED_ORIGINS);

  return betterAuth({
    appName: "tsker",
    secret: config.BETTER_AUTH_SECRET,
    baseURL: config.BETTER_AUTH_URL,
    basePath: "/api/auth",
    trustedOrigins,
    database: drizzleAdapter(database, {
      provider: "pg",
      schema: authSchema
    }),
    emailAndPassword: {
      enabled: true
    },
    advanced: {
      useSecureCookies: config.APP_ENV !== "local",
      crossSubDomainCookies: {
        enabled: true,
        domain: config.AUTH_COOKIE_DOMAIN
      }
    },
    plugins: [tanstackStartCookies()]
  });
};

export const makeAuthDatabase = (_databaseUrl: string, pool: Pool) =>
  createAuthDrizzleClient(pool);
