"use client";

import { useEffect, useState, useTransition, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  listBusinessClients,
  updateBusinessClient,
  deleteBusinessClient,
} from "@/app/actions/businessClients";

type BC = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  package: string;
  stage: string;
  progress: number;
  priceCents: number;
  paidCents: number;
  notes: string | null;
  createdAt: string | Date;
  updatedAt: string | Date;
};

const STAGES = ["Intake", "In Progress", "Review", "Completed", "Paused"] as const;

const NOHO_BLUE = "#337485";
const NOHO_BLUE_DEEP = "#23596A";
const NOHO_INK = "#2D100F";
const NOHO_AMBER = "#F5A623";
const NOHO_RED = "#E70013";
const NOHO_CREAM = "#F7E6C2";

const STAGE_META: Record<
  (typeof STAGES)[number],
  { label: string; color: string; tint: string; sub: string; emoji: string }
> = {
  Intake: {
    label: "Intake",
    color: NOHO_AMBER,
    tint: "rgba(245,166,35,0.10)",
    sub: "Just signed up",
    emoji: "📥",
  },
  "In Progress": {
    label: "In Progress",
    color: NOHO_BLUE,
    tint: "rgba(51,116,133,0.10)",
    sub: "Active build",
    emoji: "⚙️",
  },
  Review: {
    label: "Review",
    color: "#7C3AED",
    tint: "rgba(124,58,237,0.10)",
    sub: "QA / approval",
    emoji: "🔍",
  },
  Completed: {
    label: "Completed",
    color: "#16A34A",
    tint: "rgba(22,163,74,0.10)",
    sub: "Delivered",
    emoji: "✅",
  },
  Paused: {
    label: "Paused",
    color: `${NOHO_INK}`,
    tint: "rgba(45,16,15,0.08)",
    sub: "On hold",
    emoji: "⏸",
  },
};

function dollars(cents: number) {
  return `$${(cents / 100).toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })}`;
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function huesFor(seed: string): { from: string; to: string } {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  const PAIRS: Array<[string, string]> = [
    [NOHO_BLUE, NOHO_BLUE_DEEP],
    [NOHO_INK, "#1F0807"],
    ["#7C3AED", "#5B21B6"],
    ["#B07030", "#8B5A24"],
    ["#16A34A", "#166534"],
    [NOHO_RED, "#991b1b"],
  ];
  const [from, to] = PAIRS[h % PAIRS.length];
  return { from, to };
}

function relTime(iso: string | Date): string {
  const ms = Date.now() - new Date(iso).getTime();
  const d = Math.floor(ms / (1000 * 60 * 60 * 24));
  if (d <= 0) return "today";
  if (d === 1) return "1d ago";
  if (d < 7) return `${d}d ago`;
  if (d < 30) return `${Math.floor(d / 7)}w ago`;
  return `${Math.floor(d / 30)}mo ago`;
}

type Props = {
  setShowNewClientModal: (show: boolean) => void;
};

export function AdminBusinessPanel({ setShowNewClientModal }: Props) {
  const router = useRouter();
  const [clients, setClients] = useState<BC[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [view, setView] = useState<"board" | "list">("board");

  async function refresh() {
    try {
      const data = await listBusinessClients();
      setClients(data as unknown as BC[]);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed to load");
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  const stats = useMemo(() => {
    const list = clients ?? [];
    const total = list.length;
    const active = list.filter((c) => c.stage !== "Completed" && c.stage !== "Paused").length;
    const completed = list.filter((c) => c.stage === "Completed").length;
    const paused = list.filter((c) => c.stage === "Paused").length;
    const totalPaid = list.reduce((s, c) => s + c.paidCents, 0);
    const totalContracted = list.reduce((s, c) => s + c.priceCents, 0);
    const outstanding = totalContracted - totalPaid;
    return { total, active, completed, paused, totalPaid, totalContracted, outstanding };
  }, [clients]);

  const byStage = useMemo(() => {
    const buckets: Record<(typeof STAGES)[number], BC[]> = {
      Intake: [],
      "In Progress": [],
      Review: [],
      Completed: [],
      Paused: [],
    };
    (clients ?? []).forEach((c) => {
      const s = (c.stage in buckets ? c.stage : "Intake") as (typeof STAGES)[number];
      buckets[s].push(c);
    });
    return buckets;
  }, [clients]);

  function patch(id: string, data: Parameters<typeof updateBusinessClient>[1]) {
    startTransition(async () => {
      await updateBusinessClient(id, data);
      await refresh();
      router.refresh();
    });
  }

  function remove(id: string, name: string) {
    if (!confirm(`Delete business client "${name}"? This cannot be undone.`)) return;
    startTransition(async () => {
      await deleteBusinessClient(id);
      await refresh();
      router.refresh();
    });
  }

  return (
    <div className="space-y-5">
      {/* Hero strip */}
      <div
        className="relative overflow-hidden rounded-2xl"
        style={{
          background: `linear-gradient(135deg, ${NOHO_INK} 0%, #1F0807 50%, #3a1816 100%)`,
          boxShadow: "0 8px 28px rgba(45,16,15,0.30)",
        }}
      >
        {/* Subtle pinstripe pattern */}
        <div
          className="absolute inset-0 opacity-[0.05] pointer-events-none"
          style={{
            backgroundImage: `repeating-linear-gradient(45deg, ${NOHO_CREAM} 0 1px, transparent 1px 16px)`,
          }}
        />
        {/* Briefcase corner mark */}
        <div className="absolute right-6 top-6 opacity-15">
          <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke={NOHO_CREAM} strokeWidth="1.2">
            <rect x="2" y="7" width="20" height="14" rx="2" />
            <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
            <path d="M2 13h20" />
          </svg>
        </div>

        <div className="relative p-6">
          <div className="flex items-center gap-2 mb-2">
            <div
              className="w-1.5 h-1.5 rounded-full animate-pulse"
              style={{ background: NOHO_AMBER }}
            />
            <span
              className="text-[10px] font-black uppercase tracking-[0.2em]"
              style={{ color: NOHO_CREAM }}
            >
              Business Solutions · LLC Formation
            </span>
          </div>
          <h2
            className="font-black tracking-tight mb-1"
            style={{
              fontFamily: "var(--font-baloo, system-ui)",
              fontSize: "clamp(1.5rem, 3vw, 2rem)",
              color: "white",
              textShadow: "0 2px 8px rgba(0,0,0,0.30)",
            }}
          >
            Client Pipeline
          </h2>
          <p className="text-[12px] font-medium max-w-md" style={{ color: `${NOHO_CREAM}cc` }}>
            Track LLC formation, business filing, and consultancy projects. Move clients
            through stages, log payments, monitor delivery progress.
          </p>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <button
              onClick={() => setShowNewClientModal(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-black text-white transition-all hover:scale-105"
              style={{
                background: `linear-gradient(135deg, ${NOHO_AMBER} 0%, #D97706 100%)`,
                boxShadow: `0 4px 14px ${NOHO_AMBER}66`,
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              New Client
            </button>
            <div
              className="inline-flex items-center gap-1 rounded-xl p-1"
              style={{ background: `${NOHO_CREAM}1a` }}
            >
              {(["board", "list"] as const).map((v) => (
                <button
                  key={v}
                  onClick={() => setView(v)}
                  className="text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-lg transition-all"
                  style={{
                    background: view === v ? "white" : "transparent",
                    color: view === v ? NOHO_INK : NOHO_CREAM,
                  }}
                >
                  {v}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {err && (
        <div
          className="rounded-xl border px-4 py-3 text-sm font-bold"
          style={{
            background: `${NOHO_RED}10`,
            borderColor: `${NOHO_RED}33`,
            color: NOHO_RED,
          }}
        >
          {err}
        </div>
      )}

      {/* KPI tiles */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <KpiTile label="Total Clients" value={stats.total} accent={NOHO_INK} />
        <KpiTile
          label="Active"
          value={stats.active}
          accent={NOHO_BLUE}
          pulse={stats.active > 0}
        />
        <KpiTile label="Completed" value={stats.completed} accent="#16A34A" />
        <KpiTile label="Collected" value={dollars(stats.totalPaid)} accent={NOHO_AMBER} />
        <KpiTile
          label="Outstanding"
          value={dollars(Math.max(0, stats.outstanding))}
          accent={stats.outstanding > 0 ? NOHO_RED : NOHO_INK}
        />
      </div>

      {/* Distribution bar */}
      {stats.total > 0 && (
        <div
          className="rounded-2xl p-4 bg-white"
          style={{
            border: `1px solid ${NOHO_INK}11`,
            boxShadow: "0 1px 2px rgba(45,16,15,0.04), 0 4px 12px rgba(45,16,15,0.04)",
          }}
        >
          <div className="flex items-center justify-between mb-2">
            <span
              className="text-[10px] font-black uppercase tracking-[0.15em]"
              style={{ color: NOHO_INK }}
            >
              Pipeline Distribution
            </span>
            <span className="text-[10px] font-bold" style={{ color: `${NOHO_INK}88` }}>
              {stats.total} clients
            </span>
          </div>
          <div
            className="flex h-2 rounded-full overflow-hidden"
            style={{ background: `${NOHO_INK}08` }}
          >
            {STAGES.map((s) => {
              const count = byStage[s].length;
              if (count === 0) return null;
              const pct = (count / stats.total) * 100;
              return (
                <div
                  key={s}
                  className="h-full transition-all hover:opacity-80"
                  style={{
                    width: `${pct}%`,
                    background: STAGE_META[s].color,
                  }}
                  title={`${s}: ${count}`}
                />
              );
            })}
          </div>
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
            {STAGES.map((s) => {
              const count = byStage[s].length;
              if (count === 0) return null;
              return (
                <div key={s} className="flex items-center gap-1.5 text-[10px]">
                  <span
                    className="w-2 h-2 rounded-full"
                    style={{ background: STAGE_META[s].color }}
                  />
                  <span className="font-bold" style={{ color: NOHO_INK }}>
                    {s}
                  </span>
                  <span style={{ color: `${NOHO_INK}66` }}>{count}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Board / List */}
      {clients === null ? (
        <div
          className="rounded-2xl p-10 text-center text-sm bg-white"
          style={{ border: `1px solid ${NOHO_INK}11`, color: `${NOHO_INK}66` }}
        >
          Loading…
        </div>
      ) : clients.length === 0 ? (
        <div
          className="rounded-2xl p-12 text-center"
          style={{
            background: `linear-gradient(180deg, ${NOHO_CREAM}66 0%, white 100%)`,
            border: `1px dashed ${NOHO_INK}1a`,
          }}
        >
          <div
            className="w-16 h-16 rounded-2xl mx-auto flex items-center justify-center mb-3"
            style={{ background: `${NOHO_AMBER}20` }}
          >
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={NOHO_AMBER} strokeWidth="2">
              <rect x="2" y="7" width="20" height="14" rx="2" />
              <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
            </svg>
          </div>
          <p className="text-sm font-black" style={{ color: NOHO_INK }}>
            No business clients yet
          </p>
          <p className="text-[11px] mt-1" style={{ color: `${NOHO_INK}88` }}>
            Click &ldquo;+ New Client&rdquo; to start your first LLC formation project.
          </p>
        </div>
      ) : view === "board" ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-3">
          {STAGES.map((stage) => {
            const meta = STAGE_META[stage];
            const items = byStage[stage];
            return (
              <div
                key={stage}
                className="rounded-2xl flex flex-col"
                style={{
                  background: `linear-gradient(180deg, ${meta.tint} 0%, white 80%)`,
                  border: `1px solid ${meta.color}22`,
                  minHeight: 160,
                }}
              >
                {/* Column header */}
                <div className="px-3 py-2.5 flex items-center justify-between">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="text-[14px] leading-none">{meta.emoji}</span>
                    <div className="min-w-0">
                      <p
                        className="text-[11px] font-black uppercase tracking-wider truncate"
                        style={{ color: meta.color }}
                      >
                        {meta.label}
                      </p>
                      <p
                        className="text-[9px] truncate"
                        style={{ color: `${NOHO_INK}77` }}
                      >
                        {meta.sub}
                      </p>
                    </div>
                  </div>
                  <span
                    className="text-[10px] font-black px-1.5 py-0.5 rounded-md tabular-nums"
                    style={{ background: meta.color, color: "white" }}
                  >
                    {items.length}
                  </span>
                </div>

                {/* Cards */}
                <div className="px-2 pb-2 space-y-2 flex-1">
                  {items.length === 0 ? (
                    <div
                      className="text-[10px] text-center py-4 italic"
                      style={{ color: `${NOHO_INK}44` }}
                    >
                      —
                    </div>
                  ) : (
                    items.map((c) => (
                      <ClientCard
                        key={c.id}
                        client={c}
                        isPending={isPending}
                        onPatch={(data) => patch(c.id, data)}
                        onRemove={() => remove(c.id, c.name)}
                      />
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div
          className="rounded-2xl bg-white overflow-hidden"
          style={{
            border: `1px solid ${NOHO_INK}11`,
            boxShadow: "0 1px 2px rgba(45,16,15,0.04), 0 4px 12px rgba(45,16,15,0.04)",
          }}
        >
          {clients.map((c, i) => {
            const isLast = i === clients.length - 1;
            return (
              <ClientRow
                key={c.id}
                client={c}
                isPending={isPending}
                onPatch={(data) => patch(c.id, data)}
                onRemove={() => remove(c.id, c.name)}
                isLast={isLast}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}

function ClientCard({
  client: c,
  isPending,
  onPatch,
  onRemove,
}: {
  client: BC;
  isPending: boolean;
  onPatch: (data: Parameters<typeof updateBusinessClient>[1]) => void;
  onRemove: () => void;
}) {
  const { from, to } = huesFor(c.name);
  const meta = STAGE_META[c.stage as (typeof STAGES)[number]] ?? STAGE_META.Intake;
  const paidPct = c.priceCents > 0 ? Math.min(100, (c.paidCents / c.priceCents) * 100) : 0;

  return (
    <div
      className="rounded-xl bg-white p-2.5 transition-all hover:-translate-y-0.5"
      style={{
        border: `1px solid ${NOHO_INK}0d`,
        boxShadow: "0 1px 3px rgba(45,16,15,0.06)",
      }}
    >
      <div className="flex items-start gap-2">
        <div
          className="w-9 h-9 rounded-lg shrink-0 flex items-center justify-center text-white font-black text-[11px]"
          style={{
            background: `linear-gradient(135deg, ${from} 0%, ${to} 100%)`,
            boxShadow: `0 2px 6px ${from}55`,
          }}
        >
          {initials(c.name)}
        </div>
        <div className="min-w-0 flex-1">
          <p
            className="text-[12px] font-black truncate leading-tight"
            style={{ color: NOHO_INK }}
          >
            {c.name}
          </p>
          <p
            className="text-[10px] truncate"
            style={{ color: `${NOHO_INK}77` }}
          >
            {c.package}
          </p>
        </div>
      </div>

      {/* Progress mini */}
      <div className="mt-2">
        <div className="flex items-center justify-between mb-1">
          <span
            className="text-[9px] font-black uppercase tracking-wider"
            style={{ color: `${NOHO_INK}66` }}
          >
            Build
          </span>
          <span className="text-[10px] font-black" style={{ color: meta.color }}>
            {c.progress}%
          </span>
        </div>
        <div className="relative h-1 rounded-full overflow-hidden" style={{ background: `${NOHO_INK}11` }}>
          <div
            className="absolute inset-y-0 left-0 rounded-full transition-all"
            style={{
              width: `${c.progress}%`,
              background: `linear-gradient(90deg, ${meta.color} 0%, ${from} 100%)`,
            }}
          />
        </div>
      </div>

      {/* Payment mini */}
      <div className="mt-2 flex items-center justify-between text-[10px]">
        <span style={{ color: `${NOHO_INK}88` }}>
          {dollars(c.paidCents)} <span style={{ color: `${NOHO_INK}55` }}>/ {dollars(c.priceCents)}</span>
        </span>
        <span
          className="font-black"
          style={{ color: paidPct >= 100 ? "#16A34A" : paidPct > 0 ? NOHO_AMBER : NOHO_RED }}
        >
          {Math.round(paidPct)}%
        </span>
      </div>

      {/* Stage selector + delete */}
      <div className="mt-2 flex items-center gap-1">
        <select
          disabled={isPending}
          value={c.stage}
          onChange={(e) => onPatch({ stage: e.target.value })}
          className="flex-1 text-[9px] font-black uppercase tracking-wider px-1.5 py-1 rounded-md border"
          style={{
            borderColor: `${meta.color}33`,
            background: meta.tint,
            color: meta.color,
          }}
        >
          {STAGES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <button
          disabled={isPending}
          onClick={onRemove}
          className="text-[9px] font-black px-1.5 py-1 rounded-md transition-colors"
          style={{
            background: `${NOHO_RED}11`,
            color: NOHO_RED,
          }}
          title="Delete"
        >
          ✕
        </button>
      </div>

      <div
        className="mt-1.5 text-[9px] flex items-center justify-between"
        style={{ color: `${NOHO_INK}55` }}
      >
        <span>upd {relTime(c.updatedAt)}</span>
      </div>
    </div>
  );
}

function ClientRow({
  client: c,
  isPending,
  onPatch,
  onRemove,
  isLast,
}: {
  client: BC;
  isPending: boolean;
  onPatch: (data: Parameters<typeof updateBusinessClient>[1]) => void;
  onRemove: () => void;
  isLast: boolean;
}) {
  const { from, to } = huesFor(c.name);
  const meta = STAGE_META[c.stage as (typeof STAGES)[number]] ?? STAGE_META.Intake;
  const paidPct = c.priceCents > 0 ? Math.min(100, (c.paidCents / c.priceCents) * 100) : 0;

  return (
    <div
      className="px-5 py-4"
      style={{
        borderBottom: isLast ? "none" : `1px solid ${NOHO_INK}11`,
      }}
    >
      <div className="flex items-start justify-between gap-3 mb-3 flex-wrap">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <div
            className="w-10 h-10 rounded-lg shrink-0 flex items-center justify-center text-white font-black text-xs"
            style={{
              background: `linear-gradient(135deg, ${from} 0%, ${to} 100%)`,
              boxShadow: `0 3px 8px ${from}55`,
            }}
          >
            {initials(c.name)}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-black truncate" style={{ color: NOHO_INK }}>
              {c.name}
            </p>
            <p className="text-[11px] truncate" style={{ color: `${NOHO_INK}77` }}>
              {c.email}
              {c.phone ? ` · ${c.phone}` : ""} · {c.package}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <select
            disabled={isPending}
            value={c.stage}
            onChange={(e) => onPatch({ stage: e.target.value })}
            className="text-[10px] font-black uppercase tracking-wider px-2 py-1 rounded-lg border"
            style={{
              borderColor: `${meta.color}33`,
              background: meta.tint,
              color: meta.color,
            }}
          >
            {STAGES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          <button
            disabled={isPending}
            onClick={onRemove}
            className="text-[10px] font-black px-2 py-1 rounded-lg transition-colors"
            style={{
              background: `${NOHO_RED}11`,
              color: NOHO_RED,
            }}
          >
            Delete
          </button>
        </div>
      </div>

      <div className="flex items-center gap-2 mb-2">
        <input
          type="range"
          min={0}
          max={100}
          value={c.progress}
          disabled={isPending}
          onChange={(e) => onPatch({ progress: parseInt(e.target.value, 10) })}
          className="flex-1"
          style={{ accentColor: meta.color }}
        />
        <span
          className="text-xs font-black w-12 text-right tabular-nums"
          style={{ color: meta.color }}
        >
          {c.progress}%
        </span>
      </div>

      <div
        className="w-full h-1.5 rounded-full overflow-hidden mb-3"
        style={{ background: `${NOHO_INK}11` }}
      >
        <div
          className="h-full rounded-full transition-all"
          style={{
            width: `${c.progress}%`,
            background: `linear-gradient(90deg, ${meta.color} 0%, ${from} 100%)`,
          }}
        />
      </div>

      <div className="flex items-center gap-3 text-[11px] flex-wrap">
        <span style={{ color: `${NOHO_INK}88` }}>
          Paid:{" "}
          <strong style={{ color: NOHO_INK }}>{dollars(c.paidCents)}</strong>
          <span style={{ color: `${NOHO_INK}55` }}> / {dollars(c.priceCents)}</span>
        </span>
        <span
          className="text-[10px] font-black px-1.5 py-0.5 rounded-md tabular-nums"
          style={{
            background: paidPct >= 100 ? "#16A34A22" : paidPct > 0 ? `${NOHO_AMBER}22` : `${NOHO_RED}11`,
            color: paidPct >= 100 ? "#16A34A" : paidPct > 0 ? "#92400E" : NOHO_RED,
          }}
        >
          {Math.round(paidPct)}%
        </span>
        <input
          type="number"
          step="0.01"
          placeholder="+ payment ($)"
          disabled={isPending}
          className="rounded-md border px-2 py-0.5 text-[10px] w-32"
          style={{ borderColor: `${NOHO_INK}22` }}
          onBlur={(e) => {
            const v = parseFloat(e.target.value);
            if (Number.isFinite(v) && v > 0) {
              onPatch({ paidCents: c.paidCents + Math.round(v * 100) });
              e.target.value = "";
            }
          }}
        />
        <span
          className="text-[10px] ml-auto"
          style={{ color: `${NOHO_INK}55` }}
        >
          updated {relTime(c.updatedAt)}
        </span>
      </div>
    </div>
  );
}

function KpiTile({
  label,
  value,
  accent,
  pulse,
}: {
  label: string;
  value: number | string;
  accent: string;
  pulse?: boolean;
}) {
  return (
    <div
      className="relative overflow-hidden rounded-xl p-3 bg-white"
      style={{
        border: `1px solid ${accent}22`,
        boxShadow:
          "0 1px 2px rgba(45,16,15,0.04), 0 4px 12px rgba(45,16,15,0.04)",
      }}
    >
      <div
        className="absolute left-0 right-0 top-0 h-0.5"
        style={{
          background: `linear-gradient(90deg, ${accent} 0%, ${accent}55 100%)`,
        }}
      />
      <div className="flex items-center justify-between mb-1">
        <span
          className="text-[9px] font-black uppercase tracking-[0.15em]"
          style={{ color: `${NOHO_INK}88` }}
        >
          {label}
        </span>
        {pulse && (
          <span
            className="w-1.5 h-1.5 rounded-full animate-pulse"
            style={{ background: accent, boxShadow: `0 0 6px ${accent}` }}
          />
        )}
      </div>
      <div
        className="font-black tabular-nums leading-none"
        style={{
          fontFamily: "var(--font-baloo, system-ui)",
          fontSize: "1.4rem",
          color: accent,
        }}
      >
        {value}
      </div>
    </div>
  );
}
