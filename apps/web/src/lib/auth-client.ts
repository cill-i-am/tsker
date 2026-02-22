import { createAuthClient } from "better-auth/react";

export const authClient = createAuthClient({
  baseURL: import.meta.env.VITE_API_URL ?? "http://api.localhost:1355",
  fetchOptions: {
    credentials: "include",
  },
});
