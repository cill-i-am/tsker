import { queryOptions } from "@tanstack/react-query";

import { fetchActiveOrganization, fetchProtectedSession } from "@/lib/session.functions";

export const sessionQueryOptions = () =>
  queryOptions({
    queryFn: () => fetchProtectedSession(),
    queryKey: ["session", "protected"],
    staleTime: 30_000,
  });

export const activeOrganizationQueryOptions = () =>
  queryOptions({
    queryFn: () => fetchActiveOrganization(),
    queryKey: ["organization", "active"],
    staleTime: 30_000,
  });
