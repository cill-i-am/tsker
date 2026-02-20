import { HttpMiddleware, type HttpApp } from "@effect/platform";

export const requestObservabilityMiddleware = <E, R>(
  httpApp: HttpApp.Default<E, R>
): HttpApp.Default<E, R> => HttpMiddleware.logger(httpApp);
