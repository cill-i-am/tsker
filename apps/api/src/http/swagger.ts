import type { AppEnv } from "../config.js";

export const shouldExposeSwagger = (appEnv: AppEnv): boolean =>
  appEnv === "local" || appEnv === "staging";
