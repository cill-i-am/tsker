import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";

import { signInEmail, signOut, signUpEmail } from "@/lib/auth-api";
import { authClient } from "@/lib/auth-client";

const HomePage = () => {
  const session = authClient.useSession();
  const [email, setEmail] = useState("dev@localtest.me");
  const [password, setPassword] = useState("password123!");
  const [name, setName] = useState("Local User");
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const runAction = async (fn: () => Promise<{ status: number; body: unknown }>) => {
    setBusy(true);
    setStatus(null);
    try {
      const result = await fn();
      await session.refetch();
      setStatus(`HTTP ${result.status}: ${JSON.stringify(result.body)}`);
    } catch (error) {
      setStatus(`Request failed: ${String(error)}`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="mx-auto max-w-4xl p-6 text-white">
      <h2 className="text-3xl font-semibold">Auth Session Validation</h2>
      <p className="mt-2 text-slate-300">
        This TanStack Start app uses cookie-based Better Auth sessions against a sibling API origin.
      </p>

      <div className="mt-6 grid gap-6 md:grid-cols-2">
        <section className="rounded border border-slate-700 bg-slate-900 p-4">
          <h3 className="text-lg font-semibold">Current Session</h3>
          <p className="mt-2 text-sm text-slate-300">Pending: {session.isPending ? "yes" : "no"}</p>
          <pre className="mt-3 overflow-auto rounded bg-slate-950 p-3 text-xs text-slate-200">
            {JSON.stringify(session.data, null, 2)}
          </pre>
          <button
            type="button"
            onClick={() => session.refetch()}
            className="mt-3 rounded bg-slate-700 px-3 py-2 text-sm font-medium hover:bg-slate-600"
          >
            Refresh Session
          </button>
        </section>

        <section className="rounded border border-slate-700 bg-slate-900 p-4">
          <h3 className="text-lg font-semibold">Credentials</h3>
          <div className="mt-3 space-y-3">
            <label className="block text-sm">
              <span className="mb-1 block text-slate-300">Name</span>
              <input
                value={name}
                onChange={(event) => setName(event.target.value)}
                className="w-full rounded border border-slate-600 bg-slate-950 px-3 py-2"
              />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block text-slate-300">Email</span>
              <input
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="w-full rounded border border-slate-600 bg-slate-950 px-3 py-2"
              />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block text-slate-300">Password</span>
              <input
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                type="password"
                className="w-full rounded border border-slate-600 bg-slate-950 px-3 py-2"
              />
            </label>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={() => runAction(() => signUpEmail({ email, name, password }))}
              className="rounded bg-cyan-600 px-3 py-2 text-sm font-medium hover:bg-cyan-500 disabled:opacity-50"
            >
              Sign Up
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => runAction(() => signInEmail({ email, password }))}
              className="rounded bg-emerald-600 px-3 py-2 text-sm font-medium hover:bg-emerald-500 disabled:opacity-50"
            >
              Sign In
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => runAction(() => signOut())}
              className="rounded bg-rose-700 px-3 py-2 text-sm font-medium hover:bg-rose-600 disabled:opacity-50"
            >
              Sign Out
            </button>
          </div>

          {status ? (
            <p className="mt-3 rounded border border-slate-700 bg-slate-950 p-3 text-xs text-slate-200">
              {status}
            </p>
          ) : null}
        </section>
      </div>

      <Link
        to="/protected"
        className="mt-6 inline-block rounded bg-indigo-600 px-4 py-2 font-medium hover:bg-indigo-500"
      >
        Open Protected Route Check
      </Link>
    </main>
  );
};

export const Route = createFileRoute("/")({
  component: HomePage,
});
