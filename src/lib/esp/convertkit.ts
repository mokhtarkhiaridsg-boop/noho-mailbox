// iter-172 — ConvertKit (now "Kit") provider.
// POST /v3/forms/{formId}/subscribe with the API key in the body.

import type { EspProviderModule, ProviderSyncResult } from "./types";

export const convertkit: EspProviderModule = {
  async pushContacts(config, contacts) {
    if (!config.apiKey) return { added: 0, skipped: 0, failed: contacts.length, error: "Missing API key" };
    if (!config.audienceId) return { added: 0, skipped: 0, failed: contacts.length, error: "Missing form ID" };
    const result: ProviderSyncResult = { added: 0, skipped: 0, failed: 0 };
    const url = `https://api.convertkit.com/v3/forms/${encodeURIComponent(config.audienceId)}/subscribe`;
    for (const c of contacts) {
      try {
        const res = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            api_key: config.apiKey,
            email: c.email,
            first_name: c.firstName ?? c.name?.split(" ")[0] ?? undefined,
          }),
          signal: AbortSignal.timeout(8000),
        });
        if (res.status === 200 || res.status === 201) result.added += 1;
        else {
          result.failed += 1;
          const j = (await res.json().catch(() => ({}))) as { error?: string; message?: string };
          if (!result.error) result.error = j.message ?? j.error ?? `HTTP ${res.status}`;
        }
      } catch (e) {
        result.failed += 1;
        if (!result.error) result.error = e instanceof Error ? e.message : String(e);
      }
    }
    return result;
  },
};
