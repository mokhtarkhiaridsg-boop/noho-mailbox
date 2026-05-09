// iter-149 — Photo OCR address parser (Tier 9 #59).
//
// Sends an envelope/package photo to Claude Vision and extracts the
// structured fields the admin would otherwise type by hand on intake:
// recipient name, suite number, sender name, carrier, tracking number.
//
// Reuses the same Anthropic Messages API contract as src/lib/aiAnalysis.ts
// (iter-108) but with a different system prompt focused on OCR. We don't
// re-export anything from aiAnalysis.ts because the prompts and result
// shapes differ enough that sharing the wrapper would just be ceremony.

const API_URL = "https://api.anthropic.com/v1/messages";
const MODEL = "claude-haiku-4-5";
const ANTHROPIC_VERSION = "2023-06-01";
const MAX_TOKENS = 600;
const TIMEOUT_MS = 15_000;
const PROMPT_VERSION = "ocr-v1";

export type AddressOcrCarrier = "UPS" | "USPS" | "FedEx" | "DHL" | "Amazon" | null;

export type AddressOcrResult = {
  ok: true;
  promptVersion: string;
  model: string;
  recipientName: string | null;       // primary name on the TO label
  recipientCo: string | null;         // c/o name (when business + person both present)
  suiteNumber: string | null;         // parsed "STE 042" / "Suite #042" / "PMB 042" → "042"
  trackingNumber: string | null;
  carrier: AddressOcrCarrier;
  senderName: string | null;          // top-of-label / return-address name
  confidence: "high" | "medium" | "low";
  notes: string | null;               // short admin-facing note when something looks off
  analyzedAtIso: string;
};

export type AddressOcrFailure = {
  ok: false;
  reason: string;
  detail?: string;
  attemptedAtIso: string;
};

const SYSTEM_PROMPT = `You are an OCR assistant for a virtual mailbox business. The admin has just photographed the front of a package or envelope. Read the printed text and extract the structured intake fields.

Return ONLY a JSON object matching this exact shape (no prose, no fences):

{
  "recipientName": "<primary name on TO label, or null>",
  "recipientCo": "<c/o name when both a person and a business are addressed, else null>",
  "suiteNumber": "<digits-only suite/STE/PMB number, e.g. \\"042\\", or null>",
  "trackingNumber": "<verbatim tracking number string, no spaces, or null>",
  "carrier": "UPS" | "USPS" | "FedEx" | "DHL" | "Amazon" | null,
  "senderName": "<name on the FROM/return block, or null>",
  "confidence": "high" | "medium" | "low",
  "notes": "<short admin-facing note when something looks off, else null>"
}

Rules:
- Read the TO/recipient block as the primary name. The c/o slot is for "Personal Name c/o Business Name" patterns.
- Suite number must be DIGITS ONLY (strip "STE ", "Suite #", "PMB ", "Apt", etc.).
- Tracking number must match an actual barcode label, not the order/PO number. Strip whitespace.
- carrier = the carrier whose logo / printed brand is visible. Use null if unclear.
- confidence = "high" only when you can read every requested field cleanly. "low" when the photo is blurry / dark / partial.
- notes is for the admin: e.g. "address line 1 partially obscured" or "two suite numbers visible".`;

const USER_QUESTION = "Read this envelope/package photo and respond with the JSON object only.";

async function fetchImageAsBase64(url: string): Promise<{ data: string; mediaType: string }> {
  const res = await fetch(url, { signal: AbortSignal.timeout(TIMEOUT_MS) });
  if (!res.ok) throw new Error(`image fetch ${res.status}`);
  const ct = res.headers.get("content-type") ?? "";
  const mediaType = /^image\/(jpeg|png|gif|webp)$/.test(ct) ? ct : "image/jpeg";
  const buf = await res.arrayBuffer();
  let binary = "";
  const bytes = new Uint8Array(buf);
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode.apply(null, Array.from(bytes.subarray(i, i + chunkSize)));
  }
  const data = typeof Buffer !== "undefined" ? Buffer.from(buf).toString("base64") : btoa(binary);
  return { data, mediaType };
}

function isValidCarrier(s: unknown): s is Exclude<AddressOcrCarrier, null> {
  return s === "UPS" || s === "USPS" || s === "FedEx" || s === "DHL" || s === "Amazon";
}
function isValidConfidence(s: unknown): s is "high" | "medium" | "low" {
  return s === "high" || s === "medium" || s === "low";
}
function nstr(v: unknown, max = 120): string | null {
  if (typeof v !== "string") return null;
  const t = v.trim().slice(0, max);
  return t.length > 0 ? t : null;
}

export async function extractEnvelopeAddress(imageUrl: string): Promise<AddressOcrResult | AddressOcrFailure> {
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
      ok: false, reason: "image_fetch_failed",
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
      ok: false, reason: "fetch_failed",
      detail: e instanceof Error ? e.message : String(e),
      attemptedAtIso: new Date().toISOString(),
    };
  }

  if (res.status === 429) return { ok: false, reason: "rate_limited", attemptedAtIso: new Date().toISOString() };
  if (!res.ok) return { ok: false, reason: "api_error", detail: `HTTP ${res.status}`, attemptedAtIso: new Date().toISOString() };

  let body: unknown;
  try {
    body = await res.json();
  } catch {
    return { ok: false, reason: "parse_failed", detail: "non-json response", attemptedAtIso: new Date().toISOString() };
  }

  const text = (body as { content?: Array<{ type?: string; text?: string }> })
    ?.content?.find((c) => c.type === "text")?.text ?? "";
  const cleaned = text.trim().replace(/^```(?:json)?\s*|\s*```$/g, "");
  let parsed: unknown;
  try { parsed = JSON.parse(cleaned); }
  catch { return { ok: false, reason: "parse_failed", detail: cleaned.slice(0, 120), attemptedAtIso: new Date().toISOString() }; }

  const obj = parsed as Record<string, unknown>;

  // Suite normalization — strip prefixes Claude might leave in. Belt-and-
  // suspenders even though the prompt asks for digits only.
  const rawSuite = nstr(obj.suiteNumber, 32) ?? "";
  const suiteDigits = rawSuite.replace(/[^0-9A-Za-z]/g, "").replace(/^(STE|SUITE|PMB|APT|UNIT)/i, "");
  const suiteNumber = suiteDigits.length > 0 ? suiteDigits : null;

  // Tracking — strip whitespace + uppercase to match our existing
  // detectCarrier conventions (iter-141 normalization).
  const rawTracking = nstr(obj.trackingNumber, 64) ?? "";
  const trackingNumber = rawTracking.replace(/[\s-]+/g, "").toUpperCase() || null;

  return {
    ok: true,
    promptVersion: PROMPT_VERSION,
    model: MODEL,
    recipientName: nstr(obj.recipientName),
    recipientCo: nstr(obj.recipientCo),
    suiteNumber,
    trackingNumber,
    carrier: isValidCarrier(obj.carrier) ? obj.carrier : null,
    senderName: nstr(obj.senderName),
    confidence: isValidConfidence(obj.confidence) ? obj.confidence : "low",
    notes: nstr(obj.notes, 240),
    analyzedAtIso: new Date().toISOString(),
  };
}
