export default function DashboardLoading() {
  return (
    <div className="min-h-screen bg-[#f4f1eb]">
      {/* Header skeleton */}
      <div
        className="sticky top-0 z-50 px-4 py-3 flex items-center justify-between"
        style={{
          background: "linear-gradient(155deg, #2D1D0F 0%, #1a1108 60%, #0d1e35 100%)",
          borderBottom: "1px solid rgba(247,230,194,0.08)",
        }}
      >
        <div className="h-9 w-32 rounded bg-white/10 animate-pulse" />
        <div className="flex items-center gap-4">
          <div className="h-4 w-24 rounded bg-white/10 animate-pulse" />
          <div className="w-9 h-9 rounded-full bg-white/10 animate-pulse" />
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-6 flex gap-6">
        {/* Sidebar skeleton */}
        <aside className="hidden md:block w-56 shrink-0 space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-10 rounded-xl bg-[#2D1D0F]/5 animate-pulse" />
          ))}
        </aside>

        {/* Content skeleton */}
        <div className="flex-1 space-y-6">
          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-24 rounded-2xl bg-white animate-pulse" style={{ boxShadow: "0 1px 3px rgba(45,29,15,0.04)" }} />
            ))}
          </div>
          {/* Main content */}
          <div className="rounded-2xl bg-white h-64 animate-pulse" style={{ boxShadow: "0 1px 3px rgba(45,29,15,0.04)" }} />
          <div className="rounded-2xl bg-white h-48 animate-pulse" style={{ boxShadow: "0 1px 3px rgba(45,29,15,0.04)" }} />
        </div>
      </div>
    </div>
  );
}
