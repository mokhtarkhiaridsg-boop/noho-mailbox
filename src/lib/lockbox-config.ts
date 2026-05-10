// iter-171 — Lockbox state primitives.
// Lives outside any "use server" file so the admin board UI + the
// dispatcher can both import the type vocabulary.

export type LockboxState = "closed" | "open" | "ajar" | "fault";

export const LOCKBOX_STATES: Array<{ key: LockboxState; label: string; emoji: string }> = [
  { key: "closed", label: "Closed",  emoji: "🔒" },
  { key: "open",   label: "Open",    emoji: "🔓" },
  { key: "ajar",   label: "Ajar",    emoji: "⚠️" },
  { key: "fault",  label: "Fault",   emoji: "🛠" },
];

// Default close window: a normal pickup is under 60s. We mark a box
// "overdue" past 5 minutes, which lights the tile red on the board.
export const DEFAULT_OPEN_WINDOW_SEC = 5 * 60;

export type LockboxOpenReason =
  | "pickup"
  | "drop_off"
  | "admin_manual"
  | "service"
  | "keypad_unknown";

export const OPEN_REASON_LABELS: Record<LockboxOpenReason, string> = {
  pickup:        "📦 Pickup",
  drop_off:      "📥 Drop-off",
  admin_manual:  "🔑 Admin manual",
  service:       "🛠 Service",
  keypad_unknown: "❓ Unknown code",
};

export function fmtDuration(sec: number): string {
  if (sec < 60) return `${sec}s`;
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  if (m < 60) return s > 0 ? `${m}m ${s}s` : `${m}m`;
  const h = Math.floor(m / 60);
  return `${h}h ${m % 60}m`;
}
