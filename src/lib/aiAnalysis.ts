// iter-108 — AI photo analysis (Claude Vision).
//
// Analyzes a package exterior photo for compliance + handling warnings.
// Uses fetch directly against api.anthropic.com so we don't pull in the
// SDK as a dependency. Gracefully no-ops if ANTHROPIC_API_KEY is unset
// — caller code can call this in any signup/intake path without
// branching.
//
// We use Claude Haiku 4.5 (fast + cheap) and request a JSON-shaped
// response by giving the model a strict shape in the prompt. Result is
// parsed & validated server-side; anything not matching the shape is
// recorded as a parse failure rather than crashing.

const API_URL = "https://api.anthropic.com/v1/messages";
const MODEL = "claude-haiku-4-5";
const ANTHROPIC_VERSION = "2023-06-01";
const MAX_TOKENS = 512;
const TIMEOUT_MS = 12_000;
const PROMPT_VERSION = "v1";

export type AiWarning =
  | "fragile"
  | "this_side_up"
  | "hazmat"
  | "leaking"
  | "damaged_box"
  | "perishable"
  | "high_value"
  | "irregular_shape";

export type AiAnalysisResult = {
  ok: true;
  promptVersion: string;
  model: string;
  warnings: AiWarning[];
  carrierGuess: string | null;        // "UPS" | "USPS" | "FedEx" | "DHL" | "Amazon" | null
  hasTrackingLabel: boolean;
  notes: string | null;               // short human-readable summary, max ~120 chars
  analyzedAtIso: string;
};

export type AiAnalysisFailure = {
  ok: false;
  reason: string;                     // "no_api_key" | "fetch_failed" | "parse_failed" | "rate_limited" | etc.
  detail?: string;
  attemptedAtIso: string;
};

const SYSTEM_PROMPT = `You are a package-intake assistant for a virtual mailbox business.
You will be shown a single photo of a package's exterior. Analyze it and
return ONLY a JSON object matching this exact shape (no prose, no fences):

{
  "warnings": ["fragile" | "this_side_up" | "hazmat" | "leaking" | "damaged_box" | "perishable" | "high_value" | "irregular_shape"],
  "carrierGuess": "UPS" | "USPS" | "FedEx" | "DHL" | "Amazon" | null,
  "hasTrackingLabel": true | false,
  "notes": "<= 120 chars summary or null"
}

Rules:
- Only emit warnings you can SEE in the photo (printed sticker, condition).
- Prefer empty warnings array over guessing.
- carrierGuess must match a visible carrier logo; null otherwise.
- Be conservative. False positives cost more than false negatives.`;

const USER_QUESTION = "Analyze this package exterior photo. Respond with the JSON object only.";

function isAiWarning(s: unknown): s is AiWarning {
  return s === "fragile" || s === "this_side_up" || s === "hazmat" ||
    s === "leaking" || s === "damaged_box" || s === "perishable" ||
    s === "high_value" || s === "irregular_shape";
}

// Fetch a public image and return its base64 + media-type. Used for both
// Vercel Blob URLs and any other public HTTPS image. Caps body size at
// 5MB so a malformed URL can't blow up RAM.
async function fetchImageAsBase64(url: string): Promise<{ data: string; mediaType: string }> {
  const res = await fetch(url, { signal: AbortSignal.timeout(TIMEOUT_MS) });
  if (!res.ok) throw new Error(`image fetch ${res.status}`);
  const ct = res.headers.get("content-type") ?? "";
  const mediaType = ct.startsWith("image/") ? ct.split(";")[0] : "image/jpeg";
  const buf = await res.arrayBuffer();
  if (buf.byteLength > 5 * 1024 * 1024) throw new Error("image > 5MB");
  // base64-encode without intermediate string allocs.
  const bytes = new Uint8Array(buf);
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.byteLength; i += chunk) {
    binary += String.fromCharCode.apply(null, Array.from(bytes.subarray(i, i + chunk)));
  }
  // Node + browser both expose btoa.
  const data = typeof Buffer !== "undefined" ? Buffer.from(buf).toString("base64") : btoa(binary);
  return { data, mediaType };
}

export async function analyzePackagePhoto(imageUrl: string): Promise<AiAnalysisResult | AiAnalysisFailure> {
  const apiKey = process.env.ANTHROPIC_API_KEY?.trim();
  if (!apiKey) {
    return { ok: false, reason: "no_api_key", attemptedAtIso: new Date().toISOString() };
  }
  if (!imageUrl) {
    return { ok: false, reason: "no_image_url", attemptedAtIso: new Date().toISOString() };
  }

  let img: { data: string; mediaType: string };
  try {
    img = await fetchImageAsBase64(imageUrl);
  } catch (e) {
    return {
      ok: false,
      reason: "image_fetch_failed",
      detail: e instanceof Error ? e.message : String(e),
      attemptedAtIso: new Date().toISOString(),
    };
  }

  let res: Response;
  try {
    res = await fetch(API_URL, {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": ANTHROPIC_VERSION,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: MAX_TOKENS,
        system: SYSTEM_PROMPT,
        messages: [{
          role: "user",
          content: [
            { type: "image", source: { type: "base64", media_type: img.mediaType, data: img.data } },
            { type: "text", text: USER_QUESTION },
          ],
        }],
      }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch (e) {
    return {
      ok: false,
      reason: "fetch_failed",
      detail: e instanceof Error ? e.message : String(e),
      attemptedAtIso: new Date().toISOString(),
    };
  }

  if (res.status === 429) {
    return { ok: false, reason: "rate_limited", attemptedAtIso: new Date().toISOString() };
  }
  if (!res.ok) {
    return {
      ok: false,
      reason: "api_error",
      detail: `HTTP ${res.status}`,
      attemptedAtIso: new Date().toISOString(),
    };
  }

  let body: unknown;
  try {
    body = await res.json();
  } catch {
    return { ok: false, reason: "parse_failed", detail: "non-json response", attemptedAtIso: new Date().toISOString() };
  }

  // Anthropic Messages response shape: { content: [{ type: "text", text: "..." }] }
  const text = (body as { content?: Array<{ type?: string; text?: string }> })
    ?.content?.find((c) => c.type === "text")?.text ?? "";
  // Strip any accidental code fences.
  const cleaned = text.trim().replace(/^```(?:json)?\s*|\s*```$/g, "");
  let parsed: unknown;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    return { ok: false, reason: "parse_failed", detail: cleaned.slice(0, 120), attemptedAtIso: new Date().toISOString() };
  }
  const obj = parsed as Record<string, unknown>;
  const rawWarnings = Array.isArray(obj.warnings) ? obj.warnings.filter(isAiWarning) : [];
  const carrierGuess = typeof obj.carrierGuess === "string" && /^(UPS|USPS|FedEx|DHL|Amazon)$/.test(obj.carrierGuess)
    ? obj.carrierGuess
    : null;
  const hasTrackingLabel = obj.hasTrackingLabel === true;
  const notes = typeof obj.notes === "string" && obj.notes.trim() ? obj.notes.trim().slice(0, 120) : null;

  return {
    ok: true,
    promptVersion: PROMPT_VERSION,
    model: MODEL,
    warnings: rawWarnings,
    carrierGuess,
    hasTrackingLabel,
    notes,
    analyzedAtIso: new Date().toISOString(),
  };
}

// Human-readable label + emoji for a warning (used by UI chips + emails).
export function warningChip(w: AiWarning): { emoji: string; label: string; tone: "warn" | "danger" | "info" } {
  switch (w) {
    case "fragile":         return { emoji: "🚸", label: "Fragile",        tone: "warn" };
    case "this_side_up":    return { emoji: "↑",  label: "This side up",   tone: "info" };
    case "hazmat":          return { emoji: "☢️", label: "Hazmat",         tone: "danger" };
    case "leaking":         return { emoji: "💧", label: "Leaking",        tone: "danger" };
    case "damaged_box":     return { emoji: "📦", label: "Box damaged",    tone: "warn" };
    case "perishable":      return { emoji: "🥶", label: "Perishable",     tone: "warn" };
    case "high_value":      return { emoji: "💎", label: "High value",     tone: "info" };
    case "irregular_shape": return { emoji: "🔷", label: "Irregular shape", tone: "info" };
  }
}
