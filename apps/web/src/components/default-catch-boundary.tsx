import { ErrorComponent, useRouter } from "@tanstack/react-router";

export const DefaultCatchBoundary = ({ error }: { error: Error }) => {
  const router = useRouter();

  return (
    <main className="mx-auto max-w-3xl p-6 text-white">
      <h2 className="text-2xl font-semibold">Something went wrong</h2>
      <p className="mt-2 text-slate-300">An unexpected error occurred while rendering this page.</p>

      <div className="mt-4 rounded border border-rose-700 bg-rose-950/60 p-4">
        <ErrorComponent error={error} />
      </div>

      <button
        type="button"
        onClick={() => router.invalidate()}
        className="mt-4 rounded bg-cyan-600 px-4 py-2 font-medium hover:bg-cyan-500"
      >
        Try again
      </button>
    </main>
  );
};
