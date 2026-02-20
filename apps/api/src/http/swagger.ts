import type { AppEnv } from "../config";

export const shouldExposeSwagger = (appEnv: AppEnv): boolean =>
  appEnv === "local" || appEnv === "staging";
