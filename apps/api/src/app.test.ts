import { describe, expect, it } from "vitest";
import { Schema } from "effect";
import { createAuthPool } from "@repo/db";

import { UpResponseSchema } from "./features/health/HealthApi.js";
import { createTestServer } from "./server.js";

const decodeUpResponse = Schema.decodeUnknownSync(UpResponseSchema);
const baseEnv = {
  APP_ENV: "local",
  DATABASE_URL: "postgres://postgres:postgres@localhost:5432/tsker_test",
  BETTER_AUTH_SECRET: "test-secret-test-secret-test-secret!",
  BETTER_AUTH_URL: "http://api.localtest.me:3002",
  AUTH_TRUSTED_ORIGINS: "http://app.localtest.me:3000",
  AUTH_COOKIE_DOMAIN: ".localtest.me"
} as const;
const runDbTests = process.env.RUN_DB_TESTS === "true";
const trustedOrigin = "http://app.localtest.me:3000";
const authBaseUrl = baseEnv.BETTER_AUTH_URL;
const dbSchemaStatements = [
  `create table if not exists "user" (
    "id" text primary key,
    "name" text not null,
    "email" text not null,
    "email_verified" boolean not null default false,
    "image" text,
    "created_at" timestamptz not null default now(),
    "updated_at" timestamptz not null default now()
  )`,
  `create unique index if not exists "user_email_unique" on "user" ("email")`,
  `create table if not exists "session" (
    "id" text primary key,
    "user_id" text not null references "user"("id") on delete cascade,
    "token" text not null,
    "expires_at" timestamptz not null,
    "ip_address" text,
    "user_agent" text,
    "created_at" timestamptz not null default now(),
    "updated_at" timestamptz not null default now()
  )`,
  `create unique index if not exists "session_token_unique" on "session" ("token")`,
  `create index if not exists "session_user_id_idx" on "session" ("user_id")`,
  `create table if not exists "account" (
    "id" text primary key,
    "account_id" text not null,
    "provider_id" text not null,
    "user_id" text not null references "user"("id") on delete cascade,
    "access_token" text,
    "refresh_token" text,
    "id_token" text,
    "access_token_expires_at" timestamptz,
    "refresh_token_expires_at" timestamptz,
    "scope" text,
    "password" text,
    "created_at" timestamptz not null default now(),
    "updated_at" timestamptz not null default now()
  )`,
  `create unique index if not exists "account_provider_account_unique" on "account" ("provider_id", "account_id")`,
  `create index if not exists "account_user_id_idx" on "account" ("user_id")`,
  `create table if not exists "verification" (
    "id" text primary key,
    "identifier" text not null,
    "value" text not null,
    "expires_at" timestamptz not null,
    "created_at" timestamptz not null default now(),
    "updated_at" timestamptz not null default now()
  )`,
  `create index if not exists "verification_identifier_idx" on "verification" ("identifier")`
];

const setupAuthTables = async () => {
  const pool = createAuthPool(baseEnv.DATABASE_URL);
  try {
    for (const statement of dbSchemaStatements) {
      await pool.query(statement);
    }
  } finally {
    await pool.end();
  }
};

const clearAuthTables = async () => {
  const pool = createAuthPool(baseEnv.DATABASE_URL);
  try {
    await pool.query(`truncate table "verification", "account", "session", "user" cascade`);
  } finally {
    await pool.end();
  }
};

const readSetCookieHeaders = (response: Response): Array<string> => {
  const headersWithSetCookie = response.headers as Headers & {
    getSetCookie?: () => Array<string>;
  };

  if (typeof headersWithSetCookie.getSetCookie === "function") {
    return headersWithSetCookie.getSetCookie();
  }

  const value = response.headers.get("set-cookie");
  return value ? [value] : [];
};

describe("up endpoint", () => {
  it("returns up payload", async () => {
    const { handler, dispose } = await createTestServer(baseEnv);

    try {
      const response = await handler(new Request("http://localhost/up"));
      const body = decodeUpResponse(await response.json());

      expect(response.status).toBe(200);
      expect(body.status).toBe("ok");
      expect(body.service).toBe("api");
      expect(typeof body.uptimeSeconds).toBe("number");
      expect(typeof body.timestamp).toBe("string");
    } finally {
      await dispose();
    }
  });
});

describe("swagger exposure", () => {
  it("exposes docs in local", async () => {
    const { handler, dispose } = await createTestServer(baseEnv);

    try {
      const response = await handler(new Request("http://localhost/docs"));
      expect(response.status).not.toBe(404);
    } finally {
      await dispose();
    }
  });

  it("hides docs in production", async () => {
    const { handler, dispose } = await createTestServer({
      ...baseEnv,
      APP_ENV: "production"
    });

    try {
      const response = await handler(new Request("http://localhost/docs"));
      expect(response.status).toBe(404);
    } finally {
      await dispose();
    }
  });
});

describe("auth routes", () => {
  it("mounts /api/auth/* handlers", async () => {
    const { handler, dispose } = await createTestServer(baseEnv);

    try {
      const response = await handler(
        new Request(`${authBaseUrl}/api/auth/get-session`, {
          headers: {
            origin: trustedOrigin
          }
        })
      );

      expect(response.status).not.toBe(404);
    } finally {
      await dispose();
    }
  });

  it.skipIf(!runDbTests)("rejects untrusted origins for auth mutations", async () => {
    await setupAuthTables();
    await clearAuthTables();

    const { handler, dispose } = await createTestServer(baseEnv);

    try {
      const response = await handler(
        new Request(`${authBaseUrl}/api/auth/sign-up/email`, {
          method: "POST",
          headers: {
            "content-type": "application/json",
            origin: "http://evil.localtest.me:3000"
          },
          body: JSON.stringify({
            email: "test@example.com",
            password: "password123!",
            name: "Test User"
          })
        })
      );

      expect(response.status).toBeGreaterThanOrEqual(400);
      expect(response.status).toBeLessThan(500);
      expect(response.status).not.toBe(404);
    } finally {
      await dispose();
    }
  });

  it.skipIf(!runDbTests)(
    "supports TanStack-style cookie session flow across sibling subdomains",
    async () => {
      await setupAuthTables();
      await clearAuthTables();

      const { handler, dispose } = await createTestServer(baseEnv);

      try {
        const email = `flow-${Date.now()}@example.com`;
        const password = "password123!";

        const signUpResponse = await handler(
          new Request(`${authBaseUrl}/api/auth/sign-up/email`, {
            method: "POST",
            headers: {
              "content-type": "application/json",
              origin: trustedOrigin
            },
            body: JSON.stringify({
              email,
              password,
              name: "Session Flow User"
            })
          })
        );

        expect(signUpResponse.status).toBeLessThan(400);

        const setCookieHeaders = readSetCookieHeaders(signUpResponse);
        expect(setCookieHeaders.length).toBeGreaterThan(0);
        expect(
          setCookieHeaders.some((cookie) => /domain=\.?localtest\.me/i.test(cookie))
        ).toBe(true);

        const cookieHeader = setCookieHeaders
          .map((cookie) => cookie.split(";")[0])
          .join("; ");

        const authenticatedSessionResponse = await handler(
          new Request(`${authBaseUrl}/api/auth/get-session`, {
            headers: {
              origin: trustedOrigin,
              cookie: cookieHeader
            }
          })
        );

        const authenticatedSessionBody = (await authenticatedSessionResponse.json()) as {
          session: unknown;
          user?: {
            email?: string;
          } | null;
        };
        expect(authenticatedSessionResponse.status).toBe(200);
        expect(authenticatedSessionBody.session).toBeTruthy();
        expect(authenticatedSessionBody.user?.email).toBe(email);

        const unauthenticatedSessionResponse = await handler(
          new Request(`${authBaseUrl}/api/auth/get-session`, {
            headers: {
              origin: trustedOrigin
            }
          })
        );
        const unauthenticatedSessionBody = (await unauthenticatedSessionResponse.json()) as
          | {
              session?: unknown | null;
            }
          | null;

        expect(unauthenticatedSessionResponse.status).toBe(200);
        expect(unauthenticatedSessionBody?.session ?? null).toBeNull();
      } finally {
        await dispose();
      }
    }
  );
});
