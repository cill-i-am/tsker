const authBaseUrl = import.meta.env.VITE_AUTH_URL ?? "http://auth.tsker.localhost:1355";

export interface AuthRequestResult {
  body: unknown;
  status: number;
}

export const postAuthRequest = async (
  path: string,
  body: Record<string, unknown>,
): Promise<AuthRequestResult> => {
  const response = await fetch(`${authBaseUrl}${path}`, {
    body: JSON.stringify(body),
    credentials: "include",
    headers: {
      "content-type": "application/json",
    },
    method: "POST",
  });

  return {
    body: await response.json().catch(() => null),
    status: response.status,
  };
};
