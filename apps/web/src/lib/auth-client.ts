import { createAuthClient } from "better-auth/react";

export const authClient = createAuthClient({
  baseURL: import.meta.env.VITE_AUTH_URL ?? "http://auth.localtest.me:3003",
  fetchOptions: {
    credentials: "include",
  },
});
