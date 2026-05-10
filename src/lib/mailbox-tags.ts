// iter-193 — Mailbox color-tag system: small lib of presets + color helpers.
//
// Why a presets list: most bureau workflows (VIP / Compliance flag /
// Translator-needed / Snowbird-Q4) are universal across NOHO + every
// future bureau, so seeding from a curated palette gives admin a
// 0-friction starting point. Custom tags still allowed.

export const TAG_COLOR_PALETTE = [
  "#E70013", // brand red
  "#F59E0B", // amber
  "#15803D", // green
  "#1976FF", // blue
  "#7C3AED", // violet
  "#DB2777", // pink
  "#0F766E", // teal
  "#A16207", // bronze
  "#1F2937", // ink
] as const;

export type TagPreset = { name: string; color: string; description: string };

export const TAG_PRESETS: TagPreset[] = [
  { name: "VIP",                 color: "#7C3AED", description: "High-touch member — alert admin on every package, never auto-bin." },
  { name: "Compliance flag",     color: "#E70013", description: "Pending KYC issue / ID expiring / Form 1583 incomplete — review before acting." },
  { name: "Translator needed",   color: "#1976FF", description: "Member primary language ≠ English — route messages to bilingual staff." },
  { name: "Snowbird Q4",         color: "#F59E0B", description: "Forwards everything Oct–Mar; auto-pause regular pickup notifications." },
  { name: "High value",          color: "#15803D", description: "Frequent insured packages or wallet > $200 — prioritize storage location." },
  { name: "Behind on rent",      color: "#A16207", description: "Plan due / wallet negative — surface dunning on every interaction." },
  { name: "Notary regular",      color: "#0F766E", description: "Books notary monthly+ — mention next available slot when in lobby." },
  { name: "Watch list",          color: "#DB2777", description: "Internal — admin keeping closer eye for any reason." },
];

// True if hex is "dark enough" that white text reads on it. Naive but
// good enough for our 9-color palette. Used to pick chip foreground.
export function tagIsDark(hex: string): boolean {
  const m = /^#([0-9a-fA-F]{6})$/.exec(hex);
  if (!m) return false;
  const r = parseInt(m[1].slice(0, 2), 16);
  const g = parseInt(m[1].slice(2, 4), 16);
  const b = parseInt(m[1].slice(4, 6), 16);
  // sRGB perceived luminance
  const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return lum < 0.55;
}

export function tagChipStyle(color: string): { background: string; color: string; border: string } {
  const dark = tagIsDark(color);
  return {
    background: color,
    color: dark ? "white" : "#1F2937",
    border: `1px solid ${color}`,
  };
}

// Soft tinted variant for surfaces like the heatmap cell — keeps cell
// readable but still color-codes by the strongest tag.
export function tagSoftStyle(color: string): { background: string; color: string; border: string } {
  return {
    background: `${color}22`,
    color,
    border: `1px solid ${color}66`,
  };
}

export function isHexColor(s: string): boolean {
  return /^#[0-9a-fA-F]{6}$/.test(s);
}
