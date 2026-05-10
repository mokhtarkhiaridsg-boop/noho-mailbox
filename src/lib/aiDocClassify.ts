// iter-218 — Document classifier (Tier 16 #127).
//
// Heuristic + AI hybrid: first runs a fast regex pass against the
// OCR'd text from iter-194 translation; falls back to Claude (text
// completion, not vision — cheaper) when the regex is uncertain.
//
// The regex pass catches the common 80% (IRS forms, utility bills,
// medical EOBs) without an API call. Vision-OCR'd text is messy
// enough that the regex isn't perfect, hence the AI fallback.

const API_URL = "https://api.anthropic.com/v1/messages";
const MODEL = "claude-haiku-4-5";
const ANTHROPIC_VERSION = "2023-06-01";
const MAX_TOKENS = 256;
const TIMEOUT_MS = 8_000;

export type DocCategory =
  | "tax_form"
  | "utility_bill"
  | "medical"
  | "legal"
  | "bank_statement"
  | "government"
  | "court_summons"
  | "voter_card"
  | "insurance"
  | "credit_card"
  | "subscription"
  | "official"
  | "other";

export type DocVaultKind = "Scan" | "Invoice" | "Receipt" | "POD" | "Form1583" | "Other";

export type DocClassification = {
  ok: true;
  category: DocCategory;
  vaultKind: DocVaultKind;
  title: string;                  // suggested title for VaultItem
  tags: string[];                 // searchable tags ("irs", "1099", "tax_year_2025")
  shouldArchive: boolean;         // false → member upload only, don't auto-vault
  confidence: number;             // 0..1
  source: "regex" | "ai";
} | {
  ok: false;
  reason: string;
};

const REGEX_RULES: Array<{ category: DocCategory; vaultKind: DocVaultKind; title: string; tags: string[]; pattern: RegExp; shouldArchive: boolean }> = [
  { category: "tax_form",       vaultKind: "Other", title: "IRS form",                  tags: ["irs", "tax"],                pattern: /\b(internal revenue|IRS|Form 1099|Form 1040|W-2|W-9|1095-A)\b/i, shouldArchive: true },
  { category: "tax_form",       vaultKind: "Other", title: "State tax notice",          tags: ["state", "tax"],              pattern: /\b(Franchise Tax Board|state tax|state of california tax)\b/i,  shouldArchive: true },
  { category: "utility_bill",   vaultKind: "Invoice", title: "Utility bill",            tags: ["utility", "bill"],           pattern: /\b(SCE|Southern California Edison|SoCalGas|LADWP|water and power|gas company)\b/i, shouldArchive: true },
  { category: "medical",        vaultKind: "Other", title: "Medical document",          tags: ["medical", "health"],         pattern: /\b(EOB|explanation of benefits|Kaiser Permanente|Medicare|Medi-Cal|Anthem Blue Cross|prescription)\b/i, shouldArchive: true },
  { category: "bank_statement", vaultKind: "Other", title: "Bank statement",            tags: ["bank", "statement"],         pattern: /\b(account statement|monthly statement|Bank of America|Chase|Wells Fargo|Citibank|Capital One|debit summary)\b/i, shouldArchive: true },
  { category: "government",     vaultKind: "Other", title: "Government correspondence", tags: ["government", "official"],    pattern: /\b(Department of Motor Vehicles|DMV|Social Security|Selective Service|US Citizenship|USCIS|Department of State)\b/i, shouldArchive: true },
  { category: "court_summons",  vaultKind: "Other", title: "Court summons",             tags: ["court", "legal", "summons"], pattern: /\b(jury duty|summons|appear before|case number|civil court|superior court)\b/i, shouldArchive: true },
  { category: "voter_card",     vaultKind: "Other", title: "Voter registration",        tags: ["voter", "election"],         pattern: /\b(voter registration|polling place|sample ballot|secretary of state)\b/i, shouldArchive: true },
  { category: "insurance",      vaultKind: "Other", title: "Insurance document",        tags: ["insurance"],                 pattern: /\b(policy number|claim number|premium|deductible|insurance company|Geico|State Farm|Allstate|Progressive|Liberty Mutual)\b/i, shouldArchive: true },
  { category: "legal",          vaultKind: "Other", title: "Legal correspondence",      tags: ["legal", "law"],              pattern: /\b(attorney|legal notice|cease and desist|notice of default|eviction|small claims)\b/i, shouldArchive: true },
  { category: "credit_card",    vaultKind: "Other", title: "Credit card document",      tags: ["credit_card"],               pattern: /\b(credit card statement|annual percentage rate|APR|card ending in)\b/i, shouldArchive: true },
];

function classifyByRegex(text: string): DocClassification | null {
  for (const rule of REGEX_RULES) {
    if (rule.pattern.test(text)) {
      return {
        ok: true,
        category: rule.category,
        vaultKind: rule.vaultKind,
        title: rule.title,
        tags: rule.tags,
        shouldArchive: rule.shouldArchive,
        confidence: 0.85,
        source: "regex",
      };
    }
  }
  return null;
}

const SYSTEM_PROMPT = `You classify a piece of mail based on its OCR'd text. Members will
search for these later by keyword, so titles + tags should be useful + concrete.

Return ONLY this JSON (no prose, no fences):
{
  "category": "<tax_form | utility_bill | medical | legal | bank_statement | government | court_summons | voter_card | insurance | credit_card | subscription | official | other>",
  "vaultKind": "<Scan | Invoice | Receipt | POD | Form1583 | Other>",
  "title": "<≤60-char human title, e.g. 'Q3 SCE bill' or 'IRS Form 1099-NEC'>",
  "tags": ["lowercase","keywords","≤6 total","≤20 chars each"],
  "shouldArchive": <true if this is the kind of document a person should keep; false for marketing/junk>,
  "confidence": <0..1>
}

Rules:
- Pick "other" + shouldArchive:false for ads, catalogs, postcards, generic marketing.
- For bills/statements always include the company name in tags if visible.
- Be terse — these are dashboard chips not paragraphs.`;

export async function classifyDocText(input: { text: string }): Promise<DocClassification> {
  const text = input.text.trim();
  if (!text) return { ok: false, reason: "empty_text" };

  // Pass 1: regex.
  const regexHit = classifyByRegex(text);
  if (regexHit) return regexHit;

  // Pass 2: AI fallback. Cheap because text-only, not vision.
  const apiKey = process.env.ANTHROPIC_API_KEY?.trim();
  if (!apiKey) return { ok: false, reason: "no_api_key" };

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
        messages: [{ role: "user", content: `OCR'd text from a scanned letter:\n\n${text.slice(0, 4000)}` }],
      }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch (e) {
    return { ok: false, reason: "fetch_failed", ...(typeof e === "object" ? {} : {}) };
  }
  if (!res.ok) return { ok: false, reason: `api_${res.status}` };

  let body: unknown;
  try { body = await res.json(); } catch { return { ok: false, reason: "parse_failed" }; }
  const out = (body as { content?: Array<{ type?: string; text?: string }> })?.content?.find((c) => c.type === "text")?.text ?? "";
  const cleaned = out.trim().replace(/^```(?:json)?\s*|\s*```$/g, "");
  let parsed: Record<string, unknown>;
  try { parsed = JSON.parse(cleaned) as Record<string, unknown>; } catch { return { ok: false, reason: "parse_failed_json" }; }

  const validCategories = ["tax_form","utility_bill","medical","legal","bank_statement","government","court_summons","voter_card","insurance","credit_card","subscription","official","other"];
  const validKinds = ["Scan","Invoice","Receipt","POD","Form1583","Other"];
  const category = (typeof parsed.category === "string" && validCategories.includes(parsed.category) ? parsed.category : "other") as DocCategory;
  const vaultKind = (typeof parsed.vaultKind === "string" && validKinds.includes(parsed.vaultKind) ? parsed.vaultKind : "Other") as DocVaultKind;
  const title = typeof parsed.title === "string" ? parsed.title.trim().slice(0, 60) : "Scanned document";
  const tagsRaw = Array.isArray(parsed.tags) ? parsed.tags : [];
  const tags = tagsRaw.filter((t): t is string => typeof t === "string").map((t) => t.toLowerCase().slice(0, 20)).slice(0, 6);
  const shouldArchive = parsed.shouldArchive === true;
  const confidence = typeof parsed.confidence === "number" && parsed.confidence >= 0 && parsed.confidence <= 1 ? parsed.confidence : 0.5;

  return { ok: true, category, vaultKind, title, tags, shouldArchive, confidence, source: "ai" };
}
