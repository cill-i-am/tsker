import { FetchHttpClient } from "@effect/platform";
import { Otlp } from "@effect/opentelemetry";
import { Layer } from "effect";

import type { AppConfig } from "../config.js";

const splitHeaderEntries = (rawHeaders: string): ReadonlyArray<string> => {
  const entries: Array<string> = [];
  let current = "";
  let inQuotes = false;

  for (const char of rawHeaders) {
    if (char === "\"") {
      inQuotes = !inQuotes;
      current += char;
      continue;
    }

    if (char === "," && !inQuotes) {
      entries.push(current);
      current = "";
      continue;
    }

    current += char;
  }

  entries.push(current);
  return entries;
};

const stripSurroundingQuotes = (value: string): string => {
  if (value.length >= 2 && value.startsWith("\"") && value.endsWith("\"")) {
    return value.slice(1, -1);
  }

  return value;
};

export const parseOtlpHeaders = (rawHeaders: string | undefined): Record<string, string> => {
  if (!rawHeaders) {
    return {};
  }

  return splitHeaderEntries(rawHeaders)
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0)
    .reduce<Record<string, string>>((acc, entry) => {
      const [key, ...rest] = entry.split("=");
      if (!key || rest.length === 0) {
        return acc;
      }

      const normalizedKey = key.trim();
      const normalizedValue = stripSurroundingQuotes(rest.join("=").trim());
      if (!normalizedKey || !normalizedValue) {
        return acc;
      }

      acc[normalizedKey] = normalizedValue;
      return acc;
    }, {});
};

export const makeOtelLayer = (config: AppConfig) => {
  if (!config.otlpEndpoint) {
    return Layer.empty;
  }

  return Otlp.layerJson({
    baseUrl: config.otlpEndpoint,
    headers: parseOtlpHeaders(config.otlpHeaders),
    resource: {
      serviceName: "api",
      attributes: {
        "deployment.environment": config.appEnv
      }
    }
  }).pipe(Layer.provide(FetchHttpClient.layer));
};
