export default function DashboardLoading() {
  return (
    <div className="min-h-screen bg-bg-light">
      {/* Header skeleton */}
      <div className="sticky top-0 z-50 px-4 py-3 flex items-center justify-between bg-surface-light border-b border-border-light">
        <div className="h-9 w-32 rounded bg-border-light animate-pulse" />
        <div className="flex items-center gap-4">
          <div className="h-4 w-24 rounded bg-border-light animate-pulse" />
          <div className="w-9 h-9 rounded-full bg-border-light animate-pulse" />
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-6 flex gap-6">
        {/* Sidebar skeleton */}
        <aside className="hidden md:block w-56 shrink-0 space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-10 rounded-xl bg-border-light/50 animate-pulse" />
          ))}
        </aside>

        {/* Content skeleton */}
        <div className="flex-1 space-y-6">
          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-24 rounded-2xl bg-surface-light animate-pulse shadow-[var(--shadow-sm)]" />
            ))}
          </div>
          {/* Main content */}
          <div className="rounded-2xl bg-surface-light h-64 animate-pulse shadow-[var(--shadow-sm)]" />
          <div className="rounded-2xl bg-surface-light h-48 animate-pulse shadow-[var(--shadow-sm)]" />
        </div>
      </div>
    </div>
  );
}
