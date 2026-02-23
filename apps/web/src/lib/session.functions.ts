import { createServerFn } from "@tanstack/react-start";
import { getRequestHeaders } from "@tanstack/react-start/server";

import { getForwardedOrigin } from "@/lib/request-origin";

const getAuthBaseUrl = () =>
  process.env.AUTH_URL ||
  process.env.VITE_AUTH_URL ||
  import.meta.env.VITE_AUTH_URL ||
  "http://auth.tsker.localhost:1355";

export interface ProtectedSessionResponse {
  authenticated: boolean;
  payload: unknown;
  status: number;
}

export interface ActiveOrganizationResponse {
  id: string;
  name: string;
  slug: string;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const getAuthRequestHeaders = (): Record<string, string> => {
  const headers = getRequestHeaders();
  const origin = getForwardedOrigin(headers);
  const requestHeaders: Record<string, string> = {
    cookie: headers.get("cookie") ?? "",
  };

  if (origin) {
    requestHeaders.origin = origin;
  }

  return requestHeaders;
};

const toActiveOrganizationResponse = (payload: unknown): ActiveOrganizationResponse | null => {
  const candidate =
    isRecord(payload) && isRecord(payload.organization) ? payload.organization : payload;

  if (!isRecord(candidate)) {
    return null;
  }

  const { id } = candidate;
  const { name } = candidate;
  const { slug } = candidate;

  if (typeof id !== "string" || typeof name !== "string" || typeof slug !== "string") {
    return null;
  }

  return {
    id,
    name,
    slug,
  };
};

export const fetchProtectedSession = createServerFn({ method: "GET" }).handler(async () => {
  const requestHeaders = getAuthRequestHeaders();

  const response = await fetch(`${getAuthBaseUrl()}/api/auth/get-session`, {
    credentials: "include",
    headers: requestHeaders,
  });

  const payload = await response.json().catch(() => null);
  const authenticated = Boolean(
    payload && typeof payload === "object" && "session" in payload && "user" in payload,
  );

  return {
    authenticated,
    payload,
    status: response.status,
  } satisfies ProtectedSessionResponse;
});

export const fetchActiveOrganization = createServerFn({ method: "GET" }).handler(async () => {
  const response = await fetch(`${getAuthBaseUrl()}/api/auth/organization/active`, {
    credentials: "include",
    headers: getAuthRequestHeaders(),
  });

  if (!response.ok) {
    return null;
  }

  const payload = await response.json().catch(() => null);
  return toActiveOrganizationResponse(payload);
});
