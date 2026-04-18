export default function AdminLoading() {
  return (
    <div className="min-h-screen bg-[#f4f6f8]">
      {/* Wix-style header skeleton */}
      <div
        className="sticky top-0 z-50 px-5 h-14 flex items-center justify-between bg-white"
        style={{ borderBottom: "1px solid rgba(22,45,58,0.1)" }}
      >
        <div className="flex items-center gap-5">
          <div className="h-8 w-28 rounded-lg bg-[#162d3a]/10 animate-pulse" />
          <div className="h-7 w-32 rounded-md bg-[#162d3a] animate-pulse hidden sm:block" />
          <div className="h-3.5 w-40 rounded bg-[#162d3a]/10 animate-pulse hidden md:block" />
        </div>
        <div className="flex items-center gap-3">
          <div className="h-7 w-48 rounded-md bg-[#162d3a]/08 animate-pulse hidden md:block" style={{ border: "1px solid rgba(22,45,58,0.1)" }} />
          <div className="h-7 w-20 rounded animate-pulse hidden sm:block" />
          <div className="w-8 h-8 rounded-full bg-[#3374B5]/30 animate-pulse" />
        </div>
      </div>

      <div className="flex">
        {/* Dark navy sidebar skeleton */}
        <aside
          className="hidden lg:flex flex-col w-60 shrink-0 sticky top-14 self-start"
          style={{ height: "calc(100vh - 56px)", background: "#162d3a" }}
        >
          <div className="px-4 pt-5 pb-3">
            <div className="h-3 w-24 rounded bg-white/10 animate-pulse" />
          </div>
          <div className="px-3 space-y-1 flex-1">
            {Array.from({ length: 14 }).map((_, i) => (
              <div
                key={i}
                className="h-9 rounded-xl animate-pulse"
                style={{
                  background: i === 0 ? "rgba(255,255,255,0.15)" : "rgba(255,255,255,0.04)",
                  animationDelay: `${i * 40}ms`,
                }}
              />
            ))}
          </div>
        </aside>

        {/* Main content skeleton */}
        <div className="flex-1 p-6 space-y-6 min-w-0">
          {/* Quick action buttons */}
          <div className="flex flex-wrap gap-2 mb-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="h-9 w-32 rounded-xl animate-pulse bg-white"
                style={{ border: "1px solid rgba(22,45,58,0.1)", animationDelay: `${i * 50}ms` }}
              />
            ))}
          </div>

          {/* Stats cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="h-28 rounded-2xl bg-white animate-pulse"
                style={{ boxShadow: "0 1px 3px rgba(22,45,58,0.06)", animationDelay: `${i * 60}ms` }}
              />
            ))}
          </div>

          {/* Two column area */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="rounded-2xl bg-white animate-pulse" style={{ height: 280, boxShadow: "0 1px 3px rgba(22,45,58,0.06)" }}>
              <div className="px-5 py-4 flex items-center justify-between" style={{ borderBottom: "1px solid rgba(22,45,58,0.06)" }}>
                <div className="h-3.5 w-32 rounded bg-[#162d3a]/10 animate-pulse" />
                <div className="h-7 w-20 rounded-lg bg-[#162d3a]/08 animate-pulse" />
              </div>
              <div className="p-5 space-y-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-3" style={{ animationDelay: `${i * 80}ms` }}>
                    <div className="w-8 h-8 rounded-full bg-[#162d3a]/08 animate-pulse shrink-0" />
                    <div className="flex-1 space-y-1">
                      <div className="h-3 w-28 rounded bg-[#162d3a]/08 animate-pulse" />
                      <div className="h-2.5 w-20 rounded bg-[#162d3a]/05 animate-pulse" />
                    </div>
                    <div className="h-5 w-14 rounded-full bg-[#162d3a]/08 animate-pulse" />
                  </div>
                ))}
              </div>
            </div>
            <div className="rounded-2xl bg-white animate-pulse" style={{ height: 280, boxShadow: "0 1px 3px rgba(22,45,58,0.06)" }}>
              <div className="px-5 py-4 flex items-center justify-between" style={{ borderBottom: "1px solid rgba(22,45,58,0.06)" }}>
                <div className="h-3.5 w-28 rounded bg-[#162d3a]/10 animate-pulse" />
                <div className="h-7 w-24 rounded-lg bg-[#162d3a]/08 animate-pulse" />
              </div>
              <div className="p-5 space-y-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-3" style={{ animationDelay: `${i * 90}ms` }}>
                    <div className="w-2 h-2 rounded-full bg-[#3374B5]/30 animate-pulse shrink-0" />
                    <div className="flex-1 h-3 rounded bg-[#162d3a]/08 animate-pulse" />
                    <div className="h-5 w-16 rounded-full bg-[#162d3a]/05 animate-pulse" />
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Full width table skeleton */}
          <div className="rounded-2xl bg-white animate-pulse" style={{ boxShadow: "0 1px 3px rgba(22,45,58,0.06)" }}>
            <div className="px-5 py-4 flex items-center justify-between" style={{ borderBottom: "1px solid rgba(22,45,58,0.06)" }}>
              <div className="h-3.5 w-36 rounded bg-[#162d3a]/10 animate-pulse" />
              <div className="h-7 w-28 rounded-lg bg-[#162d3a]/08 animate-pulse" />
            </div>
            <div className="divide-y divide-[rgba(22,45,58,0.05)]">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="px-5 py-3.5 flex items-center gap-4" style={{ animationDelay: `${i * 70}ms` }}>
                  <div className="w-8 h-8 rounded-full bg-[#162d3a]/08 animate-pulse shrink-0" />
                  <div className="flex-1 space-y-1">
                    <div className="h-3 w-36 rounded bg-[#162d3a]/08 animate-pulse" />
                    <div className="h-2.5 w-24 rounded bg-[#162d3a]/05 animate-pulse" />
                  </div>
                  <div className="h-5 w-12 rounded-full bg-[#162d3a]/08 animate-pulse hidden sm:block" />
                  <div className="h-5 w-14 rounded-full bg-[#162d3a]/08 animate-pulse hidden sm:block" />
                  <div className="h-7 w-16 rounded-lg bg-[#162d3a]/05 animate-pulse" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
