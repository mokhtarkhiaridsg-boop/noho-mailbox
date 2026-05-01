"use client";

import Link from "next/link";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-bg-light px-4">
      <div className="text-center max-w-md">
        <div className="text-6xl mb-6">📬</div>
        <h1 className="text-3xl font-extrabold text-text-light mb-3 tracking-tight">
          Something went wrong
        </h1>
        <p className="text-text-light-muted mb-8">
          We encountered an unexpected error. Please try again or head back to the
          homepage.
        </p>
        <div className="flex items-center justify-center gap-4">
          <button
            onClick={reset}
            className="px-6 py-3 rounded-xl font-semibold text-white text-sm bg-accent hover:bg-accent-hover transition-all shadow-[0_2px_10px_rgba(51,116,133,0.3)]"
          >
            Try Again
          </button>
          <Link
            href="/"
            className="px-6 py-3 rounded-xl font-semibold text-text-light text-sm border-2 border-border-light hover:bg-bg-light transition-all"
          >
            Go Home
          </Link>
        </div>
        {error.digest && (
          <p className="mt-6 text-[10px] text-text-light-muted/50 font-mono">
            Error ID: {error.digest}
          </p>
        )}
      </div>
    </div>
  );
}
