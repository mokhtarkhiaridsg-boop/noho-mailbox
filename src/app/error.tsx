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
    <div className="min-h-screen flex items-center justify-center bg-[#F7E6C2] px-4">
      <div className="text-center max-w-md">
        <div className="text-6xl mb-6">📬</div>
        <h1 className="text-3xl font-black text-[#2D1D0F] mb-3">
          Something went wrong
        </h1>
        <p className="text-[#2D1D0F]/60 mb-8">
          We encountered an unexpected error. Please try again or head back to the
          homepage.
        </p>
        <div className="flex items-center justify-center gap-4">
          <button
            onClick={reset}
            className="px-6 py-3 rounded-xl font-black text-white text-sm"
            style={{
              background: "linear-gradient(135deg, #3374B5, #2055A0)",
              boxShadow: "0 2px 10px rgba(51,116,181,0.3)",
            }}
          >
            Try Again
          </button>
          <Link
            href="/"
            className="px-6 py-3 rounded-xl font-black text-[#2D1D0F] text-sm"
            style={{ border: "2px solid rgba(45,29,15,0.15)" }}
          >
            Go Home
          </Link>
        </div>
        {error.digest && (
          <p className="mt-6 text-[10px] text-[#2D1D0F]/30 font-mono">
            Error ID: {error.digest}
          </p>
        )}
      </div>
    </div>
  );
}
