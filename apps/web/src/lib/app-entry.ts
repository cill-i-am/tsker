export interface AppEntryState {
  activeOrganizationSlug: string | null;
  authenticated: boolean;
  emailVerified: boolean;
}

interface AppEntryLoginDestination {
  to: "/login";
}

interface AppEntryOnboardingDestination {
  to: "/onboarding";
}

interface AppEntryOrganizationDestination {
  params: {
    slug: string;
  };
  to: "/org/$slug";
}

export type AppEntryDestination =
  | AppEntryLoginDestination
  | AppEntryOnboardingDestination
  | AppEntryOrganizationDestination;

export const resolveAppEntryDestination = (state: AppEntryState): AppEntryDestination => {
  if (!state.authenticated) {
    return { to: "/login" };
  }

  if (!state.emailVerified) {
    return { to: "/onboarding" };
  }

  const activeOrganizationSlug = state.activeOrganizationSlug?.trim();

  if (activeOrganizationSlug) {
    return {
      params: { slug: activeOrganizationSlug },
      to: "/org/$slug",
    };
  }

  return { to: "/onboarding" };
};
