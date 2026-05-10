// iter-172 — ESP audience sync types.
// Lives outside any "use server" file so the admin panel + provider
// modules + server actions all share the same vocabulary without the
// async-only constraint.

export type EspProvider = "mailchimp" | "convertkit" | "buttondown" | "csv";

export const PROVIDER_LABELS: Record<EspProvider, string> = {
  mailchimp:  "Mailchimp",
  convertkit: "ConvertKit / Kit",
  buttondown: "Buttondown",
  csv:        "Download as CSV",
};

export const PROVIDER_DESCRIPTIONS: Record<EspProvider, string> = {
  mailchimp:  "Pushes to a Mailchimp audience via /lists/{audienceId}/members. Requires API key + data center suffix (e.g. us21).",
  convertkit: "Subscribes contacts to a ConvertKit form via /forms/{audienceId}/subscribe. Requires API key.",
  buttondown: "Pushes to Buttondown subscribers via /subscribers. Requires API key. No audienceId.",
  csv:        "Downloads a CSV — use this if your ESP isn't natively supported. Always works, no keys needed.",
};

export type EspContact = {
  email: string;
  name?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  // Free-form merge tags providers can use for personalization.
  meta?: Record<string, string | number | null>;
};

export type ProviderSyncResult = {
  added: number;
  skipped: number;
  failed: number;
  error?: string;
};

// Provider modules implement this single interface.
export type EspProviderModule = {
  pushContacts: (config: {
    apiKey: string;
    audienceId: string | null;
    apiServer?: string | null;
    doubleOptIn: boolean;
  }, contacts: EspContact[]) => Promise<ProviderSyncResult>;
};
