import { HttpMiddleware, type HttpApp } from "@effect/platform";

import type { AppConfig } from "../../config.js";

export const requestObservabilityMiddleware = (config: AppConfig) => {
  void config;

  return <E, R>(httpApp: HttpApp.Default<E, R>): HttpApp.Default<E, R> =>
    HttpMiddleware.logger(httpApp);
};
