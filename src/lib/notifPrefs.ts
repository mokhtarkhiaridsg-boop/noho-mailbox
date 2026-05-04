// iter-84 — Per-user notification preferences.
//
// Stored as JSON in `User.notifPrefs` (already a `String?` column in the
// schema). Default policy: in-app + email ON for everything; SMS opt-in
// only (off by default — admin can't blast SMS to customers who didn't
// agree).
//
// Each event type is a separate channel toggle so a customer can opt in
// to mail-arrived SMS but not storage-warning SMS, etc.

export type NotifEvent =
  | "mailArrived"
  | "packagePickedUp"
  | "storageWarning"
  | "planExpiring"
  | "kycStatus";

export type ChannelPrefs = {
  email: boolean;
  sms: boolean;
  inApp: boolean;
};

export type NotifPrefs = Partial<Record<NotifEvent, ChannelPrefs>>;

export const DEFAULT_PREFS: Record<NotifEvent, ChannelPrefs> = {
  mailArrived:     { email: true,  sms: false, inApp: true },
  packagePickedUp: { email: true,  sms: false, inApp: true },
  storageWarning:  { email: true,  sms: false, inApp: true },
  planExpiring:    { email: true,  sms: false, inApp: true },
  kycStatus:       { email: true,  sms: false, inApp: true },
};

export function parsePrefs(raw: string | null | undefined): NotifPrefs {
  if (!raw) return {};
  try {
    const j = JSON.parse(raw) as unknown;
    if (j && typeof j === "object") return j as NotifPrefs;
  } catch { /* ignore */ }
  return {};
}

export function getChannelPrefs(prefs: NotifPrefs, event: NotifEvent): ChannelPrefs {
  const overrides = prefs[event];
  const base = DEFAULT_PREFS[event];
  if (!overrides) return base;
  return {
    email: overrides.email ?? base.email,
    sms: overrides.sms ?? base.sms,
    inApp: overrides.inApp ?? base.inApp,
  };
}

// Deep-merge an event update into existing prefs (used by the settings
// panel). Returns the new JSON-serializable prefs object.
export function patchPrefs(prefs: NotifPrefs, event: NotifEvent, patch: Partial<ChannelPrefs>): NotifPrefs {
  const current = getChannelPrefs(prefs, event);
  return {
    ...prefs,
    [event]: { ...current, ...patch },
  };
}
