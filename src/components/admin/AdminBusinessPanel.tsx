"use client";

type Props = {
  setShowNewClientModal: (show: boolean) => void;
};

export function AdminBusinessPanel({ setShowNewClientModal }: Props) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="font-black text-lg uppercase tracking-wide text-text-light">Business Solutions</h2>
        <button
          onClick={() => setShowNewClientModal(true)}
          className="px-4 py-2.5 rounded-xl text-sm font-black text-white"
          style={{ background: "linear-gradient(135deg, #3374B5, #2055A0)" }}
        >
          + New Client
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { label: "Active Projects", value: "3", color: "#3374B5" },
          { label: "Completed", value: "12", color: "#1A1714" },
          { label: "Total Revenue", value: "$30,000", color: "#3374B5" },
        ].map((s) => (
          <div key={s.label} className="rounded-2xl p-6 bg-white" style={{ boxShadow: "0 1px 3px rgba(26,23,20,0.04), 0 4px 12px rgba(26,23,20,0.05)" }}>
            <p className="text-3xl font-black" style={{ color: s.color }}>{s.value}</p>
            <p className="text-xs font-bold uppercase tracking-wider text-text-light/35 mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="rounded-2xl overflow-hidden bg-white" style={{ boxShadow: "0 1px 3px rgba(26,23,20,0.04), 0 4px 12px rgba(26,23,20,0.05)" }}>
        <div className="px-5 py-4" style={{ borderBottom: "1px solid rgba(232,229,224,0.5)" }}>
          <h3 className="font-black text-sm uppercase tracking-wide text-text-light">Active Projects</h3>
        </div>
        {[
          { name: "Alex Chen — Startup.io", stage: "Website Build", progress: 70 },
          { name: "David Kim — Kim Law", stage: "LLC Filing", progress: 30 },
          { name: "Lisa Wang — Wang Design", stage: "Brand Book", progress: 85 },
        ].map((p, i) => (
          <div key={p.name} className="px-5 py-4" style={{ borderBottom: i < 2 ? "1px solid rgba(232,229,224,0.35)" : "none" }}>
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-bold text-text-light">{p.name}</p>
              <span className="text-xs font-bold text-accent">{p.progress}%</span>
            </div>
            <p className="text-xs text-text-light/40 mb-2">{p.stage}</p>
            <div className="w-full h-1.5 rounded-full bg-bg-light/50 overflow-hidden">
              <div className="h-full rounded-full" style={{ width: `${p.progress}%`, background: "linear-gradient(90deg, #3374B5, #2055A0)" }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
