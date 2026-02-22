import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/protected")({
  beforeLoad: () => {
    throw redirect({ to: "/" });
  },
  component: () => null,
});
