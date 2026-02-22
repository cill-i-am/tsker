import { Link } from "@tanstack/react-router";

export const DefaultNotFound = () => (
  <main className="mx-auto max-w-3xl p-6 text-white">
    <h2 className="text-2xl font-semibold">Page not found</h2>
    <p className="mt-2 text-slate-300">The page you requested does not exist.</p>
    <Link
      to="/"
      className="mt-4 inline-block rounded bg-cyan-600 px-4 py-2 font-medium hover:bg-cyan-500"
    >
      Back home
    </Link>
  </main>
);
