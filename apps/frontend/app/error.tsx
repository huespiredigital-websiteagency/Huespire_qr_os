"use client";

import { useEffect } from "react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 p-6 text-center">
      <div className="max-w-md space-y-6">
        <h2 className="text-3xl font-bold text-slate-900">Something went wrong!</h2>
        <p className="text-slate-600">
          We encountered an unexpected error. Please try resetting the page or contact support if the issue persists.
        </p>
        <div className="flex justify-center gap-4">
          <button
            onClick={() => reset()}
            className="rounded-lg bg-indigo-600 px-4 py-2 font-semibold text-white hover:bg-indigo-700 transition"
          >
            Try again
          </button>
          <a
            href="/"
            className="rounded-lg border border-slate-300 bg-white px-4 py-2 font-semibold text-slate-700 hover:bg-slate-50 transition"
          >
            Go Home
          </a>
        </div>
      </div>
    </div>
  );
}
