import { describe, expect, it } from "vitest";

import { shouldExposeSwagger } from "./swagger.js";

describe("shouldExposeSwagger", () => {
  it("exposes docs in local", () => {
    expect(shouldExposeSwagger("local")).toBe(true);
  });

  it("exposes docs in staging", () => {
    expect(shouldExposeSwagger("staging")).toBe(true);
  });

  it("hides docs in production", () => {
    expect(shouldExposeSwagger("production")).toBe(false);
  });
});
