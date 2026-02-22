import type { ReactNode } from "react";

interface AuthLayoutShellProps {
  children: ReactNode;
}

export const AuthLayoutShell = ({ children }: AuthLayoutShellProps) => (
  <main className="relative flex min-h-[calc(100vh-4rem)] items-center justify-center overflow-hidden px-4 py-10">
    <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top,oklch(0.96_0_0)_0%,transparent_55%)]" />
    <div className="pointer-events-none absolute inset-0 -z-10 bg-[linear-gradient(120deg,transparent_0%,oklch(0.97_0_0)_45%,transparent_100%)]" />
    {children}
  </main>
);
