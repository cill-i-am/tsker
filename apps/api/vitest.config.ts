import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": new URL("src", import.meta.url).pathname,
      "@repo/db/auth-client": new URL("../../packages/db/src/auth-client.ts", import.meta.url)
        .pathname,
      "@repo/db/schema": new URL("../../packages/db/src/schema.ts", import.meta.url).pathname,
    },
  },
  test: {
    globals: true,
  },
});
