import { describe, expect, it } from "vitest";

import {
  getPendingInvitations,
  normalizeOrganizationSlug,
  resolveCreateOrganizationSlug,
} from "./organization-onboarding";

describe("organization-onboarding helpers", () => {
  it("normalizes slug input to lowercase kebab-case", () => {
    expect(normalizeOrganizationSlug("  Acme   Product Team  ")).toBe("acme-product-team");
    expect(normalizeOrganizationSlug("ACME___HQ!!")).toBe("acme-hq");
  });

  it("falls back to organization name when slug input is blank", () => {
    expect(resolveCreateOrganizationSlug({ name: "Acme Space", slug: "   " })).toBe("acme-space");
    expect(resolveCreateOrganizationSlug({ name: "", slug: "   " })).toBe("");
  });

  it("filters pending invitations only", () => {
    const invitations = [
      { id: "inv_1", status: "pending" },
      { id: "inv_2", status: "accepted" },
      { id: "inv_3", status: "pending" },
      { id: "inv_4", status: "rejected" },
    ];

    expect(getPendingInvitations(invitations)).toEqual([
      { id: "inv_1", status: "pending" },
      { id: "inv_3", status: "pending" },
    ]);
  });
});
