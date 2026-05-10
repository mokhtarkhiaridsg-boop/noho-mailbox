// iter-194 — AI translation of scanned mail (Claude Vision OCR + translate).
//
// Mirrors the iter-108 aiAnalysis pattern: same MODEL/API_VERSION/
// ANTHROPIC_API_KEY plumbing, same fetch-image-as-base64 helper, same
// graceful no-op when the key is unset so caller code never branches.
//
// Difference: this asks Vision to (1) OCR the visible text in the
// scanned letter and (2) translate it into a target language (default
// English). Returns both originalText (for verification) and
// translatedText (for the member to read). Source language is reported
// so member can quickly tell "oh, that french medicaid letter".
//
// Why one round-trip OCR+translate instead of two: cuts latency in
// half, halves the API bill, and the model is fluent enough at both
// to do them in one pass without quality loss.

const API_URL = "https://api.anthropic.com/v1/messages";
const MODEL = "claude-haiku-4-5";
const ANTHROPIC_VERSION = "2023-06-01";
const MAX_TOKENS = 2048;
const TIMEOUT_MS = 25_000;
const PROMPT_VERSION = "v1";

export const SUPPORTED_LANGUAGES = [
  { code: "en", label: "English",      flag: "🇺🇸" },
  { code: "es", label: "Spanish",      flag: "🇪🇸" },
  { code: "fr", label: "French",       flag: "🇫🇷" },
  { code: "ar", label: "Arabic",       flag: "🇹🇳" },
  { code: "zh", label: "Chinese",      flag: "🇨🇳" },
  { code: "pt", label: "Portuguese",   flag: "🇵🇹" },
  { code: "de", label: "German",       flag: "🇩🇪" },
  { code: "it", label: "Italian",      flag: "🇮🇹" },
  { code: "ja", label: "Japanese",     flag: "🇯🇵" },
  { code: "ko", label: "Korean",       flag: "🇰🇷" },
  { code: "ru", label: "Russian",      flag: "🇷🇺" },
  { code: "vi", label: "Vietnamese",   flag: "🇻🇳" },
] as const;

export type LanguageCode = typeof SUPPORTED_LANGUAGES[number]["code"];

export function isLanguageCode(s: string): s is LanguageCode {
  return SUPPORTED_LANGUAGES.some((l) => l.code === s);
}

export function languageLabel(code: string): string {
  return SUPPORTED_LANGUAGES.find((l) => l.code === code)?.label ?? code;
}

export type TranslationResult = {
  ok: true;
  promptVersion: string;
  model: string;
  language: LanguageCode;            // target language
  sourceLanguage: string | null;     // detected language code or null when uncertain
  originalText: string;              // OCR'd source text
  translatedText: string;            // translated text
  translatedAtIso: string;
};

export type TranslationFailure = {
  ok: false;
  reason: string;                    // "no_api_key" | "no_image_url" | "image_fetch_failed" | etc.
  detail?: string;
  attemptedAtIso: string;
};

function buildSystemPrompt(target: LanguageCode): string {
  const targetLabel = languageLabel(target);
  return `You are a mail-translation assistant for a virtual mailbox business.
You will be shown a single photo of a scanned letter. Do TWO things:
1. OCR all visible text in the letter (preserve paragraph breaks; ignore
   logos and decorative imagery; skip envelope-back blank space).
2. Translate that text into ${targetLabel}.

Return ONLY a JSON object matching this exact shape (no prose, no fences):

{
  "sourceLanguage": "<ISO 639-1 code of the source, or null if uncertain>",
  "originalText":   "<the OCR'd source text, with \\n between paragraphs>",
  "translatedText": "<the same content translated into ${targetLabel}, with \\n between paragraphs>"
}

Rules:
- If the letter is ALREADY in ${targetLabel}, copy originalText to
  translatedText verbatim and set sourceLanguage to "${target}".
- Preserve names, addresses, dollar amounts, dates, and account numbers
  exactly — do NOT translate proper nouns or numerals.
- Translate idioms naturally; don't translate them word-for-word.
- If the photo doesn't contain a readable letter, return originalText:""
  and translatedText:"" with sourceLanguage:null.`;
}

const USER_QUESTION = "Translate this scanned letter. Respond with the JSON object only.";

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

export async function translateMailScan(input: {
  imageUrl: string;
  targetLanguage?: LanguageCode;
}): Promise<TranslationResult | TranslationFailure> {
  const target: LanguageCode = input.targetLanguage ?? "en";
  const apiKey = process.env.ANTHROPIC_API_KEY?.trim();
  if (!apiKey) return { ok: false, reason: "no_api_key", attemptedAtIso: new Date().toISOString() };
  if (!input.imageUrl) return { ok: false, reason: "no_image_url", attemptedAtIso: new Date().toISOString() };

  let img: { data: string; mediaType: string };
  try {
    img = await fetchImageAsBase64(input.imageUrl);
  } catch (e) {
    return { ok: false, reason: "image_fetch_failed", detail: e instanceof Error ? e.message : String(e), attemptedAtIso: new Date().toISOString() };
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
        system: buildSystemPrompt(target),
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
    return { ok: false, reason: "fetch_failed", detail: e instanceof Error ? e.message : String(e), attemptedAtIso: new Date().toISOString() };
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
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    return { ok: false, reason: "parse_failed", detail: cleaned.slice(0, 200), attemptedAtIso: new Date().toISOString() };
  }
  const obj = parsed as Record<string, unknown>;
  const sourceLanguage = typeof obj.sourceLanguage === "string" && /^[a-z]{2}$/.test(obj.sourceLanguage)
    ? obj.sourceLanguage : null;
  const originalText = typeof obj.originalText === "string" ? obj.originalText.trim().slice(0, 8000) : "";
  const translatedText = typeof obj.translatedText === "string" ? obj.translatedText.trim().slice(0, 8000) : "";
  if (!originalText && !translatedText) {
    return { ok: false, reason: "empty_result", detail: "model returned no text", attemptedAtIso: new Date().toISOString() };
  }
  return {
    ok: true,
    promptVersion: PROMPT_VERSION,
    model: MODEL,
    language: target,
    sourceLanguage,
    originalText,
    translatedText,
    translatedAtIso: new Date().toISOString(),
  };
}
