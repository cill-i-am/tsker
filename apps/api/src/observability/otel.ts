import { FetchHttpClient } from "@effect/platform";
import { Otlp } from "@effect/opentelemetry";
import { Layer } from "effect";

import type { AppConfig } from "../config.js";

const parseHeaders = (rawHeaders: string | undefined): Record<string, string> => {
  if (!rawHeaders) {
    return {};
  }

  return rawHeaders
    .split(",")
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0)
    .reduce<Record<string, string>>((acc, entry) => {
      const [key, ...rest] = entry.split("=");
      if (!key || rest.length === 0) {
        return acc;
      }
      acc[key.trim()] = rest.join("=").trim();
      return acc;
    }, {});
};

export const makeOtelLayer = (config: AppConfig) => {
  if (!config.otlpEndpoint) {
    return Layer.empty;
  }

  return Otlp.layerJson({
    baseUrl: config.otlpEndpoint,
    headers: parseHeaders(config.otlpHeaders),
    resource: {
      serviceName: "api",
      attributes: {
        "deployment.environment": config.appEnv
      }
    }
  }).pipe(Layer.provide(FetchHttpClient.layer));
};
