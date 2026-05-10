// iter-211 — Door-camera Vision OCR for walk-ins (Tier 15 #120).
//
// Reuses the iter-108 / iter-194 AI plumbing (direct fetch, base64-
// encoded image, claude-haiku-4-5, 12s timeout, graceful no-op when
// ANTHROPIC_API_KEY unset). Asks Vision to extract any visible
// printed text the person is holding (pickup pass, ID card, badge)
// + classify what it sees (suite # / member name / ID type / face).

const API_URL = "https://api.anthropic.com/v1/messages";
const MODEL = "claude-haiku-4-5";
const ANTHROPIC_VERSION = "2023-06-01";
const MAX_TOKENS = 512;
const TIMEOUT_MS = 12_000;

export type DoorOcrHints = {
  suiteNumber: string | null;          // e.g. "042" if visible on a pass
  memberName: string | null;           // e.g. "K. Saadi" if visible on an ID
  idType: string | null;               // "DL" | "Passport" | "Pickup pass" | null
  hasFace: boolean;
  isHolding: boolean;                  // is the person clearly holding something
};

export type DoorOcrResult = {
  ok: true;
  ocrText: string;
  ocrConfidence: number;               // 0..1, model's self-rating
  hints: DoorOcrHints;
  model: string;
  analyzedAtIso: string;
} | {
  ok: false;
  reason: string;
  detail?: string;
};

const SYSTEM_PROMPT = `You analyze a single still frame from a virtual-mailbox bureau's door camera.
A person walked up to the door but the system didn't recognize them. Your job is to
help the front-desk admin identify them faster.

Return ONLY this JSON object (no prose, no fences):

{
  "ocrText":      "<all visible printed text in the frame, line-broken; max 2000 chars>",
  "ocrConfidence": <0..1, your confidence the OCR is accurate>,
  "hints": {
    "suiteNumber": "<3-digit suite number visible on a pass/label, or null>",
    "memberName":  "<short name on an ID card or badge, or null>",
    "idType":      "<'DL' | 'Passport' | 'Pickup pass' | 'Other' | null>",
    "hasFace":     <true if a human face is visible>,
    "isHolding":   <true if the person is clearly holding something printed (ID, paper, phone)>
  }
}

Rules:
- Be conservative. Only fill suiteNumber when you're CERTAIN the digits are a suite number.
- Names: only the visible name. If you see "JOHN SMITH" return "JOHN SMITH" — don't infer.
- Don't hallucinate text that isn't in the frame.
- This is a security context: false positives waste admin time, but false negatives are safer than guessing.`;

const USER_QUESTION = "Analyze this door-camera frame. Respond with the JSON object only.";

async function fetchImageAsBase64(url: string): Promise<{ data: string; mediaType: string }> {
  const res = await fetch(url, { signal: AbortSignal.timeout(TIMEOUT_MS) });
  if (!res.ok) throw new Error(`image fetch ${res.status}`);
  const ct = res.headers.get("content-type") ?? "";
  const mediaType = ct.startsWith("image/") ? ct.split(";")[0] : "image/jpeg";
  const buf = await res.arrayBuffer();
  if (buf.byteLength > 5 * 1024 * 1024) throw new Error("image > 5MB");
  const data = typeof Buffer !== "undefined"
    ? Buffer.from(buf).toString("base64")
    : btoa(String.fromCharCode(...new Uint8Array(buf)));
  return { data, mediaType };
}

export async function runDoorWalkInOcr(input: { imageUrl: string }): Promise<DoorOcrResult> {
  const apiKey = process.env.ANTHROPIC_API_KEY?.trim();
  if (!apiKey) return { ok: false, reason: "no_api_key" };
  if (!input.imageUrl) return { ok: false, reason: "no_image_url" };

  let img: { data: string; mediaType: string };
  try {
    img = await fetchImageAsBase64(input.imageUrl);
  } catch (e) {
    return { ok: false, reason: "image_fetch_failed", detail: e instanceof Error ? e.message : String(e) };
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
    return { ok: false, reason: "fetch_failed", detail: e instanceof Error ? e.message : String(e) };
  }
  if (res.status === 429) return { ok: false, reason: "rate_limited" };
  if (!res.ok) return { ok: false, reason: "api_error", detail: `HTTP ${res.status}` };

  let body: unknown;
  try { body = await res.json(); } catch { return { ok: false, reason: "parse_failed", detail: "non-json response" }; }
  const text = (body as { content?: Array<{ type?: string; text?: string }> })?.content?.find((c) => c.type === "text")?.text ?? "";
  const cleaned = text.trim().replace(/^```(?:json)?\s*|\s*```$/g, "");
  let parsed: unknown;
  try { parsed = JSON.parse(cleaned); } catch { return { ok: false, reason: "parse_failed", detail: cleaned.slice(0, 200) }; }
  const obj = parsed as Record<string, unknown>;
  const ocrText = typeof obj.ocrText === "string" ? obj.ocrText.trim().slice(0, 2000) : "";
  const ocrConfidence = typeof obj.ocrConfidence === "number" && obj.ocrConfidence >= 0 && obj.ocrConfidence <= 1 ? obj.ocrConfidence : 0;
  const rawHints = typeof obj.hints === "object" && obj.hints !== null ? obj.hints as Record<string, unknown> : {};
  const hints: DoorOcrHints = {
    suiteNumber: typeof rawHints.suiteNumber === "string" && /^\d{1,5}$/.test(rawHints.suiteNumber) ? rawHints.suiteNumber : null,
    memberName: typeof rawHints.memberName === "string" ? rawHints.memberName.trim().slice(0, 80) || null : null,
    idType: typeof rawHints.idType === "string" ? rawHints.idType : null,
    hasFace: rawHints.hasFace === true,
    isHolding: rawHints.isHolding === true,
  };
  return { ok: true, ocrText, ocrConfidence, hints, model: MODEL, analyzedAtIso: new Date().toISOString() };
}
