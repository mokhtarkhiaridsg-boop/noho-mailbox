// ─── Admin Loading Skeleton ─────────────────────────────────────────────
//
// Mirrors the live shell exactly — 44px cream command bar, 56px brown
// icon dock, cream canvas. The previous skeleton showed a 240px navy
// sidebar that no longer exists; the visual jump on every tab change
// looked broken. This new skeleton has the same chrome the user sees
// after data loads, so the transition is invisible.
export default function AdminLoading() {
  return (
    <div className="min-h-screen" style={{ background: "#FAFAF8" }}>
      {/* 44px cream command bar — matches MailOsCommandBar */}
      <div
        className="sticky top-0 z-50 h-11 px-4 flex items-center gap-3"
        style={{
          background:
            "linear-gradient(180deg, rgba(247,230,194,0.96) 0%, rgba(244,236,219,0.94) 100%)",
          borderBottom: "1px solid rgba(0,0,0,0.12)",
        }}
      >
        {/* Logo placeholder */}
        <div
          className="h-6 w-24 rounded animate-pulse"
          style={{ background: "rgba(0,0,0,0.08)" }}
        />
        <span
          className="hidden sm:inline-block w-px h-4"
          style={{ background: "rgba(0,0,0,0.18)" }}
        />
        {/* Breadcrumb placeholder */}
        <div
          className="h-3 w-32 rounded animate-pulse hidden sm:block"
          style={{ background: "rgba(0,0,0,0.08)" }}
        />

        <span className="flex-1" />
        {/* ⌘K pill placeholder */}
        <div
          className="h-7 w-48 rounded-lg animate-pulse hidden md:block"
          style={{
            background: "rgba(255,255,255,0.65)",
            border: "1px solid rgba(0,0,0,0.12)",
          }}
        />
        <span className="flex-1" />

        {/* Member chip + avatar placeholders */}
        <div
          className="h-7 w-20 rounded-lg animate-pulse hidden sm:block"
          style={{
            background: "rgba(255,255,255,0.55)",
            border: "1px solid rgba(0,0,0,0.1)",
          }}
        />
        <div
          className="w-7 h-7 rounded-full animate-pulse"
          style={{ background: "rgba(0,0,0,0.12)" }}
        />
      </div>

      <div className="flex">
        {/* 56px brown icon dock — matches the live slim dock */}
        <aside
          className="hidden lg:flex flex-col w-14 shrink-0 sticky top-11 self-start"
          style={{
            height: "calc(100vh - 44px)",
            background: "#2D100F",
            borderRight: "1px solid rgba(247,230,194,0.05)",
          }}
        >
          <nav className="flex-1 px-1 py-2 space-y-1">
            {Array.from({ length: 14 }).map((_, i) => (
              <div
                key={i}
                className="w-12 h-9 mx-auto rounded-md animate-pulse"
                style={{
                  background:
                    i === 0
                      ? "rgba(247,230,194,0.10)"
                      : "rgba(247,230,194,0.04)",
                  animationDelay: `${i * 35}ms`,
                }}
              />
            ))}
          </nav>
          <div
            className="px-4 py-2.5 flex items-center gap-2 text-[10px]"
            style={{
              borderTop: "1px solid rgba(247,230,194,0.06)",
              color: "rgba(247,230,194,0.40)",
            }}
          >
            <span
              aria-hidden="true"
              className="w-1.5 h-1.5 rounded-full"
              style={{ background: "#16A34A" }}
            />
            <span>System online</span>
          </div>
        </aside>

        {/* Main canvas — cream bg, white inner card */}
        <div
          className="flex-1 min-w-0 px-3 sm:px-5 py-4 sm:py-5 pb-6"
          style={{ background: "#FAFAF8" }}
        >
          <div
            className="mx-auto max-w-[1400px] rounded-2xl overflow-hidden"
            style={{
              background: "#FFFFFF",
              border: "1px solid rgba(0,0,0,0.08)",
              boxShadow:
                "0 1px 0 rgba(255,255,255,0.6) inset, 0 8px 28px rgba(0,0,0,0.06), 0 1px 3px rgba(0,0,0,0.04)",
            }}
          >
            <div className="px-3 sm:px-5 py-4 sm:py-6 space-y-6">
              {/* 4 KPI tiles — matches the Overview metric strip */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div
                    key={i}
                    className="rounded-lg p-4 animate-pulse"
                    style={{
                      background: "#FFFFFF",
                      border: "1px solid rgba(0,0,0,0.08)",
                      animationDelay: `${i * 50}ms`,
                    }}
                  >
                    <div
                      className="h-2.5 w-20 rounded mb-3"
                      style={{ background: "rgba(0,0,0,0.08)" }}
                    />
                    <div
                      className="h-8 w-16 rounded"
                      style={{ background: "rgba(0,0,0,0.12)" }}
                    />
                  </div>
                ))}
              </div>

              {/* Two-column action queues + quick actions */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div
                  className="md:col-span-2 rounded-lg p-5 animate-pulse"
                  style={{
                    background: "#FFFFFF",
                    border: "1px solid rgba(0,0,0,0.08)",
                  }}
                >
                  <div
                    className="h-2.5 w-32 rounded mb-4"
                    style={{ background: "rgba(0,0,0,0.08)" }}
                  />
                  <div className="space-y-3">
                    {Array.from({ length: 3 }).map((_, i) => (
                      <div
                        key={i}
                        className="flex items-center gap-3"
                        style={{ animationDelay: `${i * 80}ms` }}
                      >
                        <div className="flex-1 space-y-1.5">
                          <div
                            className="h-3 w-32 rounded"
                            style={{ background: "rgba(0,0,0,0.08)" }}
                          />
                          <div
                            className="h-2.5 w-44 rounded"
                            style={{ background: "rgba(0,0,0,0.05)" }}
                          />
                        </div>
                        <div
                          className="h-6 w-8 rounded"
                          style={{ background: "rgba(0,0,0,0.08)" }}
                        />
                        <div
                          className="h-7 w-14 rounded"
                          style={{ background: "rgba(0,0,0,0.06)" }}
                        />
                      </div>
                    ))}
                  </div>
                </div>
                <div
                  className="rounded-lg p-5 animate-pulse"
                  style={{
                    background: "#FFFFFF",
                    border: "1px solid rgba(0,0,0,0.08)",
                  }}
                >
                  <div
                    className="h-2.5 w-24 rounded mb-4"
                    style={{ background: "rgba(0,0,0,0.08)" }}
                  />
                  <div className="space-y-2">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <div
                        key={i}
                        className="h-9 rounded"
                        style={{
                          background: "rgba(0,0,0,0.04)",
                          animationDelay: `${i * 60}ms`,
                        }}
                      />
                    ))}
                  </div>
                </div>
              </div>

              {/* Two-up bottom: recent mail + notary queue */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {Array.from({ length: 2 }).map((_, col) => (
                  <div
                    key={col}
                    className="rounded-lg p-5 animate-pulse"
                    style={{
                      background: "#FFFFFF",
                      border: "1px solid rgba(0,0,0,0.08)",
                    }}
                  >
                    <div className="flex items-center justify-between mb-4">
                      <div
                        className="h-2.5 w-24 rounded"
                        style={{ background: "rgba(0,0,0,0.08)" }}
                      />
                      <div
                        className="h-3 w-14 rounded"
                        style={{ background: "rgba(0,0,0,0.06)" }}
                      />
                    </div>
                    <div className="space-y-3">
                      {Array.from({ length: 4 }).map((_, i) => (
                        <div
                          key={i}
                          className="flex items-center gap-3"
                          style={{ animationDelay: `${i * 70 + col * 100}ms` }}
                        >
                          <div className="flex-1 space-y-1.5">
                            <div
                              className="h-3 w-28 rounded"
                              style={{ background: "rgba(0,0,0,0.08)" }}
                            />
                            <div
                              className="h-2.5 w-40 rounded"
                              style={{ background: "rgba(0,0,0,0.05)" }}
                            />
                          </div>
                          <div
                            className="h-5 w-16 rounded"
                            style={{ background: "rgba(0,0,0,0.06)" }}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
