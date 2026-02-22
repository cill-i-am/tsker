import { Link, createFileRoute, useLoaderData } from "@tanstack/react-router";

import { sessionQueryOptions } from "@/lib/session-query";

const ProtectedPage = () => {
  const data = useLoaderData({ from: "/protected" });

  return (
    <main className="mx-auto max-w-3xl p-6 text-white">
      <h2 className="text-2xl font-semibold">Protected Session Check</h2>
      <p className="mt-2 text-gray-300">
        This route does a server-side call to the auth origin <code>/api/auth/get-session</code>{" "}
        while forwarding the incoming cookie header.
      </p>

      <div className="mt-6 rounded border border-slate-700 bg-slate-900 p-4">
        <p>
          <strong>Status:</strong> {data.status}
        </p>
        <p>
          <strong>Authenticated:</strong> {data.authenticated ? "yes" : "no"}
        </p>
      </div>

      <pre className="mt-4 overflow-auto rounded border border-slate-700 bg-slate-950 p-4 text-xs text-slate-200">
        {JSON.stringify(data.payload, null, 2)}
      </pre>

      <Link
        to="/"
        className="mt-4 inline-block rounded bg-cyan-600 px-4 py-2 font-medium text-white hover:bg-cyan-500"
      >
        Back Home
      </Link>
    </main>
  );
};

export const Route = createFileRoute("/protected")({
  component: ProtectedPage,
  loader: ({ context }) => context.queryClient.ensureQueryData(sessionQueryOptions()),
});
