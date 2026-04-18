export default function DashboardLoading() {
  return (
    <div className="min-h-screen" style={{ background: "radial-gradient(ellipse at top left, #F0EDE8 0%, #F8F2EA 60%, #f4f8fd 100%)" }}>
      {/* Header skeleton */}
      <div
        className="sticky top-0 z-50 px-4 sm:px-6 h-16 flex items-center justify-between"
        style={{ background: "rgba(255,255,255,0.85)", borderBottom: "1px solid #E8DDD0", backdropFilter: "blur(14px)" }}
      >
        <div className="flex items-center gap-4">
          <div className="h-9 w-32 rounded-xl bg-[#E8DDD0] animate-pulse" />
          <div className="h-5 w-16 rounded-full bg-[#E8DDD0] animate-pulse hidden sm:block" />
        </div>
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-[#E8DDD0] animate-pulse" />
          <div className="w-9 h-9 rounded-full bg-[#3374B5]/20 animate-pulse" />
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-3 sm:px-6 py-6 sm:py-8 flex gap-8">
        {/* Sidebar skeleton */}
        <aside className="hidden md:block w-60 shrink-0">
          <div className="space-y-1.5">
            {Array.from({ length: 9 }).map((_, i) => (
              <div
                key={i}
                className="h-11 rounded-2xl animate-pulse"
                style={{
                  background: i === 0 ? "rgba(51,116,181,0.15)" : "rgba(255,255,255,0.6)",
                  border: "1px solid #E8DDD0",
                  animationDelay: `${i * 60}ms`,
                }}
              />
            ))}
          </div>
          {/* Address card skeleton */}
          <div
            className="mt-6 h-32 rounded-3xl animate-pulse"
            style={{ background: "linear-gradient(135deg, rgba(51,116,181,0.3), rgba(41,96,160,0.3))" }}
          />
        </aside>

        {/* Main content skeleton */}
        <div className="flex-1 min-w-0 space-y-6">
          {/* Mobile tab pills */}
          <div className="md:hidden flex gap-1.5 overflow-hidden">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-8 w-20 rounded-full bg-white animate-pulse shrink-0" style={{ border: "1px solid #E8DDD0" }} />
            ))}
          </div>

          {/* Welcome line */}
          <div className="space-y-1.5">
            <div className="h-3 w-24 rounded bg-[#3374B5]/20 animate-pulse" />
            <div className="h-8 w-40 rounded-xl bg-[#2D1D0F]/10 animate-pulse" />
            <div className="h-3 w-56 rounded bg-[#E8DDD0] animate-pulse" />
          </div>

          {/* Upsell grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-16 rounded-xl sm:rounded-2xl bg-white animate-pulse" style={{ border: "1px solid #E8DDD0", animationDelay: `${i * 50}ms` }} />
            ))}
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="h-24 sm:h-28 rounded-2xl animate-pulse"
                style={{
                  background: i === 1 ? "rgba(51,116,181,0.2)" : "white",
                  border: i !== 1 ? "1px solid #E8DDD0" : "none",
                  animationDelay: `${i * 70}ms`,
                }}
              />
            ))}
          </div>

          {/* Main panel */}
          <div className="rounded-3xl animate-pulse" style={{ background: "white", border: "1px solid #E8DDD0", height: 320 }}>
            <div className="px-6 py-4 flex items-center gap-2.5" style={{ borderBottom: "1px solid #E8DDD0" }}>
              <div className="w-4 h-4 rounded bg-[#3374B5]/20 animate-pulse" />
              <div className="h-3 w-28 rounded bg-[#2D1D0F]/10 animate-pulse" />
            </div>
            <div className="p-6 space-y-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex items-center gap-4 p-4 rounded-2xl" style={{ background: "#F8F2EA", animationDelay: `${i * 80}ms` }}>
                  <div className="w-11 h-11 rounded-2xl bg-[#3374B5]/15 animate-pulse shrink-0" />
                  <div className="flex-1 space-y-1.5">
                    <div className="h-3 w-32 rounded bg-[#2D1D0F]/10 animate-pulse" />
                    <div className="h-2.5 w-24 rounded bg-[#E8DDD0] animate-pulse" />
                  </div>
                  <div className="h-6 w-20 rounded-full bg-[#E8DDD0] animate-pulse" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
