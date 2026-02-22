import { createServerFn } from "@tanstack/react-start";
import { getRequestHeaders } from "@tanstack/react-start/server";

import { getForwardedOrigin } from "@/lib/request-origin";

const getApiBaseUrl = () =>
  process.env.VITE_API_URL || import.meta.env.VITE_API_URL || "http://api.localhost:1355";

export interface ProtectedSessionResponse {
  authenticated: boolean;
  payload: unknown;
  status: number;
}

export const fetchProtectedSession = createServerFn({ method: "GET" }).handler(async () => {
  const headers = getRequestHeaders();
  const origin = getForwardedOrigin(headers);
  const requestHeaders: Record<string, string> = {
    cookie: headers.get("cookie") ?? "",
  };

  if (origin) {
    requestHeaders.origin = origin;
  }

  const response = await fetch(`${getApiBaseUrl()}/api/auth/get-session`, {
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
