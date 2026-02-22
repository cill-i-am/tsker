import { resolveAppEntryDestination } from "./app-entry";

describe(resolveAppEntryDestination, () => {
  it("routes unauthenticated users to login", () => {
    expect(
      resolveAppEntryDestination({
        activeOrganizationSlug: null,
        authenticated: false,
        emailVerified: false,
      }),
    ).toStrictEqual({
      to: "/login",
    });
  });

  it("routes authenticated users with unverified email to onboarding", () => {
    expect(
      resolveAppEntryDestination({
        activeOrganizationSlug: "acme",
        authenticated: true,
        emailVerified: false,
      }),
    ).toStrictEqual({
      to: "/onboarding",
    });
  });

  it("routes authenticated verified users without an active org to onboarding", () => {
    expect(
      resolveAppEntryDestination({
        activeOrganizationSlug: null,
        authenticated: true,
        emailVerified: true,
      }),
    ).toStrictEqual({
      to: "/onboarding",
    });
  });

  it("routes authenticated verified users with active org to org workspace", () => {
    expect(
      resolveAppEntryDestination({
        activeOrganizationSlug: "  acme  ",
        authenticated: true,
        emailVerified: true,
      }),
    ).toStrictEqual({
      params: { slug: "acme" },
      to: "/org/$slug",
    });
  });
});
