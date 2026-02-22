import { defineConfig } from "tsdown";

export default defineConfig({
  clean: true,
  dts: true,
  entry: {
    "auth-client": "./src/auth-client.ts",
    effect: "./src/effect.ts",
    schema: "./src/schema.ts",
  },
  format: "esm",
  platform: "node",
  unbundle: true,
});
