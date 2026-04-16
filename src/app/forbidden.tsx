import Link from "next/link";

export default function Forbidden() {
  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-bg-dark relative overflow-hidden">
      <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] rounded-full opacity-15 blur-[120px] pointer-events-none bg-accent" />
      <div className="text-center relative z-10">
        <h1 className="text-6xl font-extrabold text-text-dark mb-4">403</h1>
        <p className="text-lg text-text-dark-muted mb-8">
          You don&apos;t have permission to access this page.
        </p>
        <Link
          href="/dashboard"
          className="inline-block font-semibold px-8 py-3.5 rounded-xl text-sm text-white bg-accent hover:bg-accent-hover transition-all shadow-[0_4px_16px_rgba(51,116,181,0.4)]"
        >
          Go to Dashboard
        </Link>
      </div>
    </div>
  );
}
