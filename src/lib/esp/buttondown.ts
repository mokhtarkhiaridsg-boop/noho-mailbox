// iter-172 — Buttondown provider.
// POST /v1/subscribers with the API key as a Token header.

import type { EspProviderModule, ProviderSyncResult } from "./types";

export const buttondown: EspProviderModule = {
  async pushContacts(config, contacts) {
    if (!config.apiKey) return { added: 0, skipped: 0, failed: contacts.length, error: "Missing API key" };
    const result: ProviderSyncResult = { added: 0, skipped: 0, failed: 0 };
    const headers = {
      "Content-Type": "application/json",
      Authorization: `Token ${config.apiKey}`,
    };
    for (const c of contacts) {
      try {
        const res = await fetch("https://api.buttondown.email/v1/subscribers", {
          method: "POST", headers,
          body: JSON.stringify({
            email_address: c.email,
            type: config.doubleOptIn ? "unactivated" : "regular",
            metadata: { name: c.name ?? null },
          }),
          signal: AbortSignal.timeout(8000),
        });
        if (res.status === 200 || res.status === 201) result.added += 1;
        else if (res.status === 400 || res.status === 409) {
          // Buttondown returns 400/409 for duplicates → treat as skip.
          result.skipped += 1;
        } else {
          result.failed += 1;
          const j = (await res.json().catch(() => ({}))) as { detail?: string };
          if (!result.error) result.error = j.detail ?? `HTTP ${res.status}`;
        }
      } catch (e) {
        result.failed += 1;
        if (!result.error) result.error = e instanceof Error ? e.message : String(e);
      }
    }
    return result;
  },
};
