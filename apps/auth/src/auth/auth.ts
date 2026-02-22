import { createAuthDrizzleClient } from "@repo/db/auth-client";
import { authSchema } from "@repo/db/schema";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { organization } from "better-auth/plugins/organization";
import { tanstackStartCookies } from "better-auth/tanstack-start";
import { Option } from "effect";
import type { Pool } from "pg";

import type { AppConfigType } from "@/config/app-config.js";

const resendEmailEndpoint = "https://api.resend.com/emails";
const invitationPath = "/onboarding";

const parseTrustedOrigins = (value: string): string[] =>
  value
    .split(",")
    .map((origin) => origin.trim())
    .filter((origin) => origin.length > 0);

const toOptionalString = (value: Option.Option<string>): string | undefined => {
  if (Option.isNone(value)) {
    return;
  }

  const trimmed = value.value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
};

const withWebCallbackUrl = (rawUrl: string, webBaseUrl: string): string => {
  try {
    const url = new URL(rawUrl);
    const callbackURL = url.searchParams.get("callbackURL");

    if (!callbackURL || callbackURL === "/") {
      url.searchParams.set("callbackURL", webBaseUrl);
    }

    return url.toString();
  } catch {
    return rawUrl;
  }
};

const resolveWebBaseUrl = (config: AppConfigType) =>
  toOptionalString(config.WEB_BASE_URL) ?? config.BETTER_AUTH_URL;

const buildInvitationUrl = (webBaseUrl: string, invitationId: string): string => {
  try {
    const url = new URL(invitationPath, webBaseUrl);
    url.searchParams.set("invitationId", invitationId);
    return url.toString();
  } catch {
    return `${webBaseUrl.replace(/\/$/, "")}${invitationPath}?invitationId=${encodeURIComponent(invitationId)}`;
  }
};

const buildEmailContent = (
  type: "password_reset" | "email_verification" | "organization_invitation",
  actionUrl: string,
  organizationName?: string,
): {
  html: string;
  subject: string;
  text: string;
} => {
  if (type === "password_reset") {
    return {
      html: `<p>Reset your password for tsker by clicking <a href="${actionUrl}">this link</a>.</p>`,
      subject: "Reset your tsker password",
      text: `Reset your password for tsker: ${actionUrl}`,
    };
  }

  if (type === "organization_invitation") {
    const destination = organizationName ? ` to join ${organizationName}` : "";
    return {
      html: `<p>You have been invited${destination} on tsker. Accept the invitation by clicking <a href="${actionUrl}">this link</a>.</p>`,
      subject: organizationName
        ? `You're invited to ${organizationName} on tsker`
        : "You're invited to a tsker organization",
      text: `You have been invited${destination} on tsker: ${actionUrl}`,
    };
  }

  return {
    html: `<p>Verify your email for tsker by clicking <a href="${actionUrl}">this link</a>.</p>`,
    subject: "Verify your tsker email",
    text: `Verify your email for tsker: ${actionUrl}`,
  };
};

const sendAuthEmail = async (
  config: AppConfigType,
  payload: {
    actionUrl: string;
    organizationName?: string;
    to: string;
    type: "password_reset" | "email_verification" | "organization_invitation";
  },
) => {
  const resendApiKey = toOptionalString(config.RESEND_API_KEY);
  const resendFromEmail = toOptionalString(config.RESEND_FROM_EMAIL);
  const webBaseUrl = resolveWebBaseUrl(config);
  const actionUrl = withWebCallbackUrl(payload.actionUrl, webBaseUrl);

  if (!resendApiKey || !resendFromEmail) {
    if (config.APP_ENV === "production") {
      throw new Error(
        "Email delivery is not configured. Set RESEND_API_KEY and RESEND_FROM_EMAIL for production.",
      );
    }

    console.info(`[auth] ${payload.type} email URL`, {
      appEnv: config.APP_ENV,
      to: payload.to,
      url: actionUrl,
    });
    return;
  }

  const content = buildEmailContent(payload.type, actionUrl, payload.organizationName);
  const response = await fetch(resendEmailEndpoint, {
    body: JSON.stringify({
      from: resendFromEmail,
      html: content.html,
      subject: content.subject,
      text: content.text,
      to: [payload.to],
    }),
    headers: {
      authorization: `Bearer ${resendApiKey}`,
      "content-type": "application/json",
    },
    method: "POST",
  });

  if (!response.ok) {
    const responseBody = await response.text().catch(() => "");
    throw new Error(
      `Resend API request failed (${response.status}): ${responseBody || response.statusText}`,
    );
  }
};

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
      requireEmailVerification: true,
      sendResetPassword: async ({ url, user }) => {
        await sendAuthEmail(config, {
          actionUrl: url,
          to: user.email,
          type: "password_reset",
        });
      },
    },
    emailVerification: {
      sendOnSignUp: true,
      sendVerificationEmail: async ({ url, user }) => {
        await sendAuthEmail(config, {
          actionUrl: url,
          to: user.email,
          type: "email_verification",
        });
      },
    },
    plugins: [
      organization({
        requireEmailVerificationOnInvitation: true,
        schema: {
          invitation: {
            modelName: "invitation",
          },
          member: {
            modelName: "member",
          },
          organization: {
            modelName: "organization",
          },
          session: {
            fields: {
              activeOrganizationId: "activeOrganizationId",
            },
          },
        },
        sendInvitationEmail: async (data) => {
          await sendAuthEmail(config, {
            actionUrl: buildInvitationUrl(resolveWebBaseUrl(config), data.id),
            organizationName: data.organization.name,
            to: data.email,
            type: "organization_invitation",
          });
        },
        teams: {
          enabled: false,
        },
      }),
      tanstackStartCookies(),
    ],
    rateLimit: {
      enabled: config.APP_ENV !== "local",
      max: 100,
      window: 60,
    },
    secret: config.BETTER_AUTH_SECRET,
    trustedOrigins,
  });
};

export const makeAuthDatabase = (_databaseUrl: string, pool: Pool) => createAuthDrizzleClient(pool);
