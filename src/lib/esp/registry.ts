// iter-172 — Provider registry. Resolves an EspProvider key to its
// implementation module. Lives outside any "use server" file so it can
// be imported from server actions + client UI configuration.

import { mailchimp } from "./mailchimp";
import { convertkit } from "./convertkit";
import { buttondown } from "./buttondown";
import type { EspProvider, EspProviderModule } from "./types";

export function getProvider(key: EspProvider): EspProviderModule | null {
  if (key === "mailchimp") return mailchimp;
  if (key === "convertkit") return convertkit;
  if (key === "buttondown") return buttondown;
  return null; // csv handled directly by the action — no HTTP push
}
