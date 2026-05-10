// iter-172 — Mailchimp ESP provider.
//
// Uses the /lists/{listId}/members endpoint. We treat HTTP 400 with
// `Member Exists` as a skip (already on list), not a failure. The
// data center suffix (e.g. "us21") is part of the API host.

import { createHash } from "node:crypto";
import type { EspProviderModule, EspContact, ProviderSyncResult } from "./types";

export const mailchimp: EspProviderModule = {
  async pushContacts(config, contacts) {
    if (!config.apiKey) return { added: 0, skipped: 0, failed: contacts.length, error: "Missing API key" };
    if (!config.audienceId) return { added: 0, skipped: 0, failed: contacts.length, error: "Missing audienceId" };
    const dc = (config.apiServer ?? "").trim() || (config.apiKey.includes("-") ? config.apiKey.split("-").pop() ?? "" : "");
    if (!dc) return { added: 0, skipped: 0, failed: contacts.length, error: "Missing API server suffix (e.g. us21)" };

    const result: ProviderSyncResult = { added: 0, skipped: 0, failed: 0 };
    const auth = "Basic " + Buffer.from(`anystring:${config.apiKey}`).toString("base64");
    const status = config.doubleOptIn ? "pending" : "subscribed";

    for (const c of contacts) {
      const subscriberHash = md5Lower(c.email);
      const url = `https://${dc}.api.mailchimp.com/3.0/lists/${encodeURIComponent(config.audienceId)}/members/${subscriberHash}`;
      try {
        const res = await fetch(url, {
          method: "PUT",
          headers: { "Content-Type": "application/json", Authorization: auth },
          body: JSON.stringify({
            email_address: c.email,
            status_if_new: status,
            merge_fields: {
              FNAME: c.firstName ?? c.name?.split(" ")[0] ?? "",
              LNAME: c.lastName ?? c.name?.split(" ").slice(1).join(" ") ?? "",
            },
          }),
          signal: AbortSignal.timeout(8000),
        });
        if (res.status === 200 || res.status === 201) result.added += 1;
        else if (res.status === 400) {
          // Mailchimp returns 400 for compliance/state issues. Read the
          // response to distinguish "skipped" from "real failure".
          const j = (await res.json().catch(() => ({}))) as { title?: string; detail?: string };
          if ((j.title ?? "").toLowerCase().includes("member exists")) result.skipped += 1;
          else { result.failed += 1; if (!result.error) result.error = j.detail ?? `HTTP 400`; }
        } else {
          result.failed += 1;
          if (!result.error) result.error = `HTTP ${res.status}`;
        }
      } catch (e) {
        result.failed += 1;
        if (!result.error) result.error = e instanceof Error ? e.message : String(e);
      }
    }
    return result;
  },
};

function md5Lower(email: string): string {
  return createHash("md5").update(email.trim().toLowerCase()).digest("hex");
}
