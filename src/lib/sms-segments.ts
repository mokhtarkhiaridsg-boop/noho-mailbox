// iter-163 — SMS character/segment math.
//
// Twilio bills per segment. GSM-7 alphabet (most ASCII) keeps 160/153
// (single / per-segment in multi-part). Anything non-GSM (emoji, é, …)
// drops to 70/67 because Twilio falls back to UCS-2 encoding.
//
// We treat ANY non-ASCII character as the conservative path so admin
// sees the higher cost. Both server (`bulkSms.ts`) and client
// (`AdminBulkSmsPanel.tsx`) need this; the live cost preview as you
// type would otherwise require a server roundtrip per keystroke.

export type SegmentInfo = {
  length: number;
  segments: number;
  encoding: "GSM-7" | "UCS-2";
};

export function computeSegments(body: string): SegmentInfo {
  const length = body.length;
  // eslint-disable-next-line no-control-regex
  const isGsm = /^[\x00-\x7F\s]*$/.test(body);
  if (isGsm) {
    if (length === 0) return { length: 0, segments: 0, encoding: "GSM-7" };
    if (length <= 160) return { length, segments: 1, encoding: "GSM-7" };
    return { length, segments: Math.ceil(length / 153), encoding: "GSM-7" };
  }
  if (length === 0) return { length: 0, segments: 0, encoding: "UCS-2" };
  if (length <= 70) return { length, segments: 1, encoding: "UCS-2" };
  return { length, segments: Math.ceil(length / 67), encoding: "UCS-2" };
}
