import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-bg-light px-4">
      <div className="text-center max-w-md">
        <div className="text-7xl font-extrabold text-text-light/10 mb-4">404</div>
        <h1 className="text-3xl font-extrabold text-text-light mb-3 tracking-tight">
          Page Not Found
        </h1>
        <p className="text-text-light-muted mb-8">
          The page you&apos;re looking for doesn&apos;t exist or has been moved.
        </p>
        <div className="flex items-center justify-center gap-4">
          <Link
            href="/"
            className="px-6 py-3 rounded-xl font-semibold text-white text-sm bg-accent hover:bg-accent-hover transition-all shadow-[0_2px_10px_rgba(51,116,181,0.3)]"
          >
            Go Home
          </Link>
          <Link
            href="/contact"
            className="px-6 py-3 rounded-xl font-semibold text-text-light text-sm border-2 border-border-light hover:bg-bg-light transition-all"
          >
            Contact Us
          </Link>
        </div>
      </div>
    </div>
  );
}
