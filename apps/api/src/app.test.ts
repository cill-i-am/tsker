import { createAuthPool } from "@repo/db/auth-client";
import { Schema } from "effect";

import { UpResponseSchema } from "@/features/health/health-api.js";
import { createTestServer } from "@/server.js";

const decodeUpResponse = Schema.decodeUnknownSync(UpResponseSchema);
const baseEnv = {
  APP_ENV: "local",
  AUTH_COOKIE_DOMAIN: ".localtest.me",
  AUTH_TRUSTED_ORIGINS: "http://app.localtest.me:3000",
  BETTER_AUTH_SECRET: "test-secret-test-secret-test-secret!",
  BETTER_AUTH_URL: "http://api.localtest.me:3002",
  DATABASE_URL: "postgres://postgres:postgres@localhost:5432/tsker_test",
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
  `create index if not exists "verification_identifier_idx" on "verification" ("identifier")`,
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

const readSetCookieHeaders = (response: Response): string[] => {
  const headersWithSetCookie = response.headers as Headers & {
    getSetCookie?: () => string[];
  };

  if (typeof headersWithSetCookie.getSetCookie === "function") {
    return headersWithSetCookie.getSetCookie();
  }

  const value = response.headers.get("set-cookie");
  return value ? [value] : [];
};

const getSessionValue = (body: { session?: unknown | null } | null) => body?.session ?? null;

const signUpEmail = (
  handler: (request: Request) => Promise<Response>,
  {
    email,
    name,
    origin,
    password,
  }: {
    email: string;
    name: string;
    origin: string;
    password: string;
  },
) =>
  handler(
    new Request(`${authBaseUrl}/api/auth/sign-up/email`, {
      body: JSON.stringify({
        email,
        name,
        password,
      }),
      headers: {
        "content-type": "application/json",
        origin,
      },
      method: "POST",
    }),
  );

const signInEmail = (
  handler: (request: Request) => Promise<Response>,
  {
    email,
    origin,
    password,
  }: {
    email: string;
    origin: string;
    password: string;
  },
) =>
  handler(
    new Request(`${authBaseUrl}/api/auth/sign-in/email`, {
      body: JSON.stringify({
        email,
        password,
      }),
      headers: {
        "content-type": "application/json",
        origin,
      },
      method: "POST",
    }),
  );

const getSession = (handler: (request: Request) => Promise<Response>, cookieHeader?: string) =>
  handler(
    new Request(`${authBaseUrl}/api/auth/get-session`, {
      headers: cookieHeader
        ? {
            cookie: cookieHeader,
            origin: trustedOrigin,
          }
        : {
            origin: trustedOrigin,
          },
    }),
  );

const runAuthenticatedSessionFlow = async (
  handler: (request: Request) => Promise<Response>,
  email: string,
  password: string,
) => {
  const signUpResponse = await signUpEmail(handler, {
    email,
    name: "Session Flow User",
    origin: trustedOrigin,
    password,
  });
  const setCookieHeaders = readSetCookieHeaders(signUpResponse);
  const cookieHeader = setCookieHeaders.map((cookie) => cookie.split(";")[0]).join("; ");
  const authenticatedSessionResponse = await getSession(handler, cookieHeader);
  const authenticatedSessionBody = (await authenticatedSessionResponse.json()) as {
    session: unknown;
    user?: {
      email?: string;
    } | null;
  };

  return {
    authenticatedSessionBody,
    authenticatedSessionResponse,
    setCookieHeaders,
    signUpResponse,
  };
};

const withDbServer = async (
  run: (handler: (request: Request) => Promise<Response>) => Promise<void>,
) => {
  await setupAuthTables();
  await clearAuthTables();
  const { handler, dispose } = await createTestServer(baseEnv);

  try {
    await run(handler);
  } finally {
    await dispose();
  }
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
      expectTypeOf(body.uptimeSeconds).toBeNumber();
      expectTypeOf(body.timestamp).toBeString();
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
      APP_ENV: "production",
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
            origin: trustedOrigin,
          },
        }),
      );

      expect(response.status).not.toBe(404);
    } finally {
      await dispose();
    }
  });

  it("allows CORS preflight for trusted auth origins", async () => {
    const { handler, dispose } = await createTestServer(baseEnv);

    try {
      const response = await handler(
        new Request(`${authBaseUrl}/api/auth/sign-in/email`, {
          headers: {
            "access-control-request-headers": "content-type",
            "access-control-request-method": "POST",
            origin: trustedOrigin,
          },
          method: "OPTIONS",
        }),
      );

      expect(response.status).toBe(204);
      expect(response.headers.get("access-control-allow-origin")).toBe(trustedOrigin);
      expect(response.headers.get("access-control-allow-credentials")).toBe("true");
    } finally {
      await dispose();
    }
  });

  it("rejects CORS preflight for untrusted auth origins", async () => {
    const { handler, dispose } = await createTestServer(baseEnv);

    try {
      const response = await handler(
        new Request(`${authBaseUrl}/api/auth/sign-in/email`, {
          headers: {
            "access-control-request-headers": "content-type",
            "access-control-request-method": "POST",
            origin: "http://evil.localtest.me:3000",
          },
          method: "OPTIONS",
        }),
      );
      const body = (await response.json()) as {
        error?: string;
      };

      expect(response.status).toBe(403);
      expect(body.error).toBe("forbidden_origin");
    } finally {
      await dispose();
    }
  });
});

describe.skipIf(!runDbTests)("auth db routes", () => {
  it("rejects untrusted origins for auth mutations", async () => {
    await withDbServer(async (handler) => {
      const response = await signUpEmail(handler, {
        email: "test@example.com",
        name: "Test User",
        origin: "http://evil.localtest.me:3000",
        password: "password123!",
      });
      expect(response.status).toBeGreaterThanOrEqual(400);
      expect(response.status).toBeLessThan(500);
      expect(response.status).not.toBe(404);
    });
  });

  it("rejects untrusted origins for sign-in mutations with forbidden_origin", async () => {
    await withDbServer(async (handler) => {
      const response = await signInEmail(handler, {
        email: "test@example.com",
        origin: "http://evil.localtest.me:3000",
        password: "password123!",
      });

      const body = (await response.json().catch(() => null)) as {
        error?: string;
      } | null;

      expect(response.status).toBe(403);
      expect(body?.error).toBe("forbidden_origin");
    });
  });

  it("rejects sign-in for unknown users", async () => {
    await withDbServer(async (handler) => {
      const response = await signInEmail(handler, {
        email: `unknown-${Date.now()}@example.com`,
        origin: trustedOrigin,
        password: "password123!",
      });

      expect(response.status).toBeGreaterThanOrEqual(400);
      expect(response.status).toBeLessThan(500);
      expect(response.status).not.toBe(404);
    });
  });

  it("rejects malformed sign-in payloads", async () => {
    await withDbServer(async (handler) => {
      const response = await handler(
        new Request(`${authBaseUrl}/api/auth/sign-in/email`, {
          body: JSON.stringify({
            email: "invalid-payload@example.com",
          }),
          headers: {
            "content-type": "application/json",
            origin: trustedOrigin,
          },
          method: "POST",
        }),
      );

      expect(response.status).toBeGreaterThanOrEqual(400);
      expect(response.status).toBeLessThan(500);
      expect(response.status).not.toBe(404);
    });
  });

  it("rejects sign-in with wrong password", async () => {
    await withDbServer(async (handler) => {
      const email = `wrong-password-${Date.now()}@example.com`;

      const signUpResponse = await signUpEmail(handler, {
        email,
        name: "Wrong Password User",
        origin: trustedOrigin,
        password: "password123!",
      });
      expect(signUpResponse.status).toBeLessThan(400);

      const signInResponse = await signInEmail(handler, {
        email,
        origin: trustedOrigin,
        password: "incorrect-password!",
      });

      expect(signInResponse.status).toBeGreaterThanOrEqual(400);
      expect(signInResponse.status).toBeLessThan(500);
      expect(signInResponse.status).not.toBe(404);
    });
  });

  it("creates cookie sessions across sibling subdomains", async () => {
    await withDbServer(async (handler) => {
      const email = `flow-${Date.now()}@example.com`;
      const flow = await runAuthenticatedSessionFlow(handler, email, "password123!");
      expect(flow.signUpResponse.status).toBeLessThan(400);
      expect(flow.setCookieHeaders.length).toBeGreaterThan(0);
      expect(
        flow.setCookieHeaders.some((cookie) => /domain=\.?localtest\.me/i.test(cookie)),
      ).toBeTruthy();
      expect(flow.authenticatedSessionResponse.status).toBe(200);
      expect(flow.authenticatedSessionBody.user?.email).toBe(email);
    });
  });

  it("returns an unauthenticated session when no cookie is present", async () => {
    await withDbServer(async (handler) => {
      const unauthenticatedSessionResponse = await getSession(handler);
      const unauthenticatedSessionBody = (await unauthenticatedSessionResponse.json()) as {
        session?: unknown | null;
      } | null;
      expect(unauthenticatedSessionResponse.status).toBe(200);
      expect(getSessionValue(unauthenticatedSessionBody)).toBeNull();
    });
  });
});
