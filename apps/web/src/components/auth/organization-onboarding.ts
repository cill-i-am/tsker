const normalizeSlugPart = (value: string): string =>
  value
    .trim()
    .toLowerCase()
    .replaceAll(/[^a-z0-9]+/g, "-")
    .replaceAll(/^-+|-+$/g, "");

export const normalizeOrganizationSlug = (value: string): string => normalizeSlugPart(value);

export const resolveCreateOrganizationSlug = (input: { name: string; slug: string }): string => {
  const explicitSlug = normalizeOrganizationSlug(input.slug);

  if (explicitSlug.length > 0) {
    return explicitSlug;
  }

  return normalizeOrganizationSlug(input.name);
};

export const getPendingInvitations = <T extends { status?: string }>(
  invitations: readonly T[] | null | undefined,
): T[] => (invitations ?? []).filter((invitation) => invitation.status === "pending");
