/**
 * Equipment — types + constants. Lives outside the "use server"
 * boundary so non-async exports don't break the admin shell at runtime.
 */

export type EquipCategory =
  | "printer" | "scanner" | "computer" | "cash_drawer" | "camera" | "terminal" | "other";

export type EquipStatus = "active" | "needs_service" | "retired" | "lost";

export type EquipServiceKind =
  | "service" | "repair" | "calibration" | "battery" | "firmware" | "inspection" | "other";

export const EQUIP_CATEGORIES: Array<{ key: EquipCategory; label: string; emoji: string }> = [
  { key: "printer",     label: "Printer",      emoji: "🖨" },
  { key: "scanner",     label: "Scanner",      emoji: "🔫" },
  { key: "computer",    label: "Computer",     emoji: "🖥" },
  { key: "cash_drawer", label: "Cash drawer",  emoji: "💵" },
  { key: "camera",      label: "Camera",       emoji: "📷" },
  { key: "terminal",    label: "Card terminal", emoji: "💳" },
  { key: "other",       label: "Other",        emoji: "🔧" },
];

export const EQUIP_SERVICE_KINDS: Array<{ key: EquipServiceKind; label: string; emoji: string }> = [
  { key: "service",     label: "Service",     emoji: "🔧" },
  { key: "repair",      label: "Repair",      emoji: "🛠" },
  { key: "calibration", label: "Calibration", emoji: "🎛" },
  { key: "battery",     label: "Battery",     emoji: "🔋" },
  { key: "firmware",    label: "Firmware",    emoji: "⚙️" },
  { key: "inspection",  label: "Inspection",  emoji: "🔍" },
  { key: "other",       label: "Other",       emoji: "📝" },
];
