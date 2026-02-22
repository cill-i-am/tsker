const apiBaseUrl = import.meta.env.VITE_API_URL ?? "http://api.localtest.me:3002";

const postAuth = async (path: string, body: Record<string, unknown>) => {
  const response = await fetch(`${apiBaseUrl}${path}`, {
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

export const signUpEmail = (input: { email: string; password: string; name: string }) =>
  postAuth("/api/auth/sign-up/email", input);

export const signInEmail = (input: { email: string; password: string }) =>
  postAuth("/api/auth/sign-in/email", input);

export const signOut = () => postAuth("/api/auth/sign-out", {});
