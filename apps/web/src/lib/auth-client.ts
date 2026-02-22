import { createAuthClient } from "better-auth/react";

export const authClient = createAuthClient({
  baseURL: import.meta.env.VITE_AUTH_URL ?? "http://auth.tsker.localhost:1355",
  fetchOptions: {
    credentials: "include",
  },
});
