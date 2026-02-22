import { queryOptions } from "@tanstack/react-query";

import { fetchProtectedSession } from "@/lib/session.functions";

export const sessionQueryOptions = () =>
  queryOptions({
    queryFn: () => fetchProtectedSession(),
    queryKey: ["session", "protected"],
    staleTime: 30_000,
  });
