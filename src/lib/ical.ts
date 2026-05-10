// iter-180 — iCal (RFC 5545) builder.
//
// Pure-TypeScript VEVENT + VCALENDAR generation. Stays outside any
// "use server" file so the iCal route handler can import it directly.
//
// We deliberately keep the spec subset narrow: VCALENDAR + VEVENT
// + DTSTART/DTEND/SUMMARY/DESCRIPTION/LOCATION/UID/DTSTAMP. Apple
// Calendar, Google Calendar, Outlook all parse this without complaint.

export type IcsEvent = {
  uid: string;                 // stable per-event id (so updates don't double-add)
  summary: string;
  description?: string;
  location?: string;
  start: Date;
  end?: Date;                  // when omitted, treat as all-day or single-instant
  allDay?: boolean;
  url?: string;
  category?: string;
};

export type IcsCalendar = {
  name: string;                // X-WR-CALNAME — display name in the subscriber's app
  description?: string;        // X-WR-CALDESC
  events: IcsEvent[];
  productId?: string;          // PRODID — defaults to NOHO Mailbox
};

// Format a Date as iCal-compatible UTC: YYYYMMDDTHHMMSSZ.
function fmtUtc(d: Date): string {
  return d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

// All-day events use DATE form: YYYYMMDD.
function fmtDate(d: Date): string {
  return `${d.getUTCFullYear()}${String(d.getUTCMonth() + 1).padStart(2, "0")}${String(d.getUTCDate()).padStart(2, "0")}`;
}

// iCal text escaping per RFC 5545 §3.3.11: backslash, comma, semicolon,
// newline.
function escapeText(s: string): string {
  return s
    .replace(/\\/g, "\\\\")
    .replace(/\n/g, "\\n")
    .replace(/\r/g, "")
    .replace(/,/g, "\\,")
    .replace(/;/g, "\\;");
}

// Long lines must be folded at 75 octets per RFC 5545 §3.1. We use 72
// to leave headroom for multi-byte chars.
function foldLine(line: string): string {
  const limit = 72;
  if (line.length <= limit) return line;
  const out: string[] = [];
  let remaining = line;
  out.push(remaining.slice(0, limit));
  remaining = remaining.slice(limit);
  while (remaining.length > 0) {
    out.push(" " + remaining.slice(0, limit - 1));
    remaining = remaining.slice(limit - 1);
  }
  return out.join("\r\n");
}

function vevent(e: IcsEvent, dtStamp: string): string {
  const lines: string[] = ["BEGIN:VEVENT"];
  lines.push(`UID:${escapeText(e.uid)}`);
  lines.push(`DTSTAMP:${dtStamp}`);
  if (e.allDay) {
    lines.push(`DTSTART;VALUE=DATE:${fmtDate(e.start)}`);
    if (e.end) lines.push(`DTEND;VALUE=DATE:${fmtDate(e.end)}`);
  } else {
    lines.push(`DTSTART:${fmtUtc(e.start)}`);
    if (e.end) lines.push(`DTEND:${fmtUtc(e.end)}`);
  }
  lines.push(`SUMMARY:${escapeText(e.summary)}`);
  if (e.description) lines.push(`DESCRIPTION:${escapeText(e.description)}`);
  if (e.location)    lines.push(`LOCATION:${escapeText(e.location)}`);
  if (e.url)         lines.push(`URL:${escapeText(e.url)}`);
  if (e.category)    lines.push(`CATEGORIES:${escapeText(e.category)}`);
  lines.push("END:VEVENT");
  return lines.map(foldLine).join("\r\n");
}

export function buildIcs(cal: IcsCalendar): string {
  const dtStamp = fmtUtc(new Date());
  const lines: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    `PRODID:-//${cal.productId ?? "NOHO Mailbox"}//iCal Feed//EN`,
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-CALNAME:${escapeText(cal.name)}`,
  ];
  if (cal.description) lines.push(`X-WR-CALDESC:${escapeText(cal.description)}`);
  // Refresh hint: subscribers re-fetch every hour.
  lines.push("X-PUBLISHED-TTL:PT1H");
  lines.push("REFRESH-INTERVAL;VALUE=DURATION:PT1H");
  for (const ev of cal.events) lines.push(vevent(ev, dtStamp));
  lines.push("END:VCALENDAR");
  return lines.map(foldLine).join("\r\n") + "\r\n";
}
