import { createAuthDrizzleClient } from "@repo/db/auth-client";
import { authSchema } from "@repo/db/schema";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { tanstackStartCookies } from "better-auth/tanstack-start";
import type { Pool } from "pg";

import type { AppConfigType } from "@/config/app-config.js";

const parseTrustedOrigins = (value: string): string[] =>
  value
    .split(",")
    .map((origin) => origin.trim())
    .filter((origin) => origin.length > 0);

export type AuthDatabase = ReturnType<typeof createAuthDrizzleClient>;
export type AuthInstance = ReturnType<typeof betterAuth>;

export const makeAuth = (config: AppConfigType, database: AuthDatabase): AuthInstance => {
  const trustedOrigins = parseTrustedOrigins(config.AUTH_TRUSTED_ORIGINS);

  return betterAuth({
    advanced: {
      crossSubDomainCookies: {
        domain: config.AUTH_COOKIE_DOMAIN,
        enabled: true,
      },
      useSecureCookies: config.APP_ENV !== "local",
    },
    appName: "tsker",
    basePath: "/api/auth",
    baseURL: config.BETTER_AUTH_URL,
    database: drizzleAdapter(database, {
      provider: "pg",
      schema: authSchema,
    }),
    emailAndPassword: {
      enabled: true,
    },
    plugins: [tanstackStartCookies()],
    secret: config.BETTER_AUTH_SECRET,
    trustedOrigins,
  });
};

export const makeAuthDatabase = (_databaseUrl: string, pool: Pool) => createAuthDrizzleClient(pool);
