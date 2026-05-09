/**
 * Suite maintenance — types + constants. Lives outside the "use server"
 * boundary so non-async exports don't break the admin shell at runtime.
 */

export type MaintKind = "cleaned" | "inspected" | "repaired" | "lock_changed" | "other";

export const MAINT_KINDS: Array<{ key: MaintKind; label: string; emoji: string }> = [
  { key: "cleaned",      label: "Cleaned",       emoji: "🧹" },
  { key: "inspected",    label: "Inspected",     emoji: "🔍" },
  { key: "repaired",     label: "Repaired",      emoji: "🔧" },
  { key: "lock_changed", label: "Lock changed",  emoji: "🔑" },
  { key: "other",        label: "Other",         emoji: "📝" },
];

export type SuiteMaintStatus = "good" | "due_soon" | "overdue" | "never";
