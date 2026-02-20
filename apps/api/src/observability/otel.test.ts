import { describe, expect, it } from "vitest";

import { parseOtlpHeaders } from "./otel.js";

describe("parseOtlpHeaders", () => {
  it("returns empty object when no headers are configured", () => {
    expect(parseOtlpHeaders(undefined)).toEqual({});
    expect(parseOtlpHeaders("")).toEqual({});
  });

  it("parses comma-separated key-value pairs", () => {
    expect(parseOtlpHeaders("Authorization=Bearer token,api-key=abc")).toEqual({
      Authorization: "Bearer token",
      "api-key": "abc"
    });
  });

  it("supports quoted values with commas", () => {
    expect(parseOtlpHeaders('x-tenant="org,team",x-role=backend')).toEqual({
      "x-tenant": "org,team",
      "x-role": "backend"
    });
  });

  it("skips malformed entries", () => {
    expect(parseOtlpHeaders("valid=value,invalid,no-key=,=no-value")).toEqual({
      valid: "value"
    });
  });
});
