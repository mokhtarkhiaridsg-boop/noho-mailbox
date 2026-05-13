// iter-215 — Multi-bureau federation lib (Tier 15 #124).
//
// Stores the per-bureau identity (id + name + address + timezone +
// contact info) in SiteConfig under key "bureau_identity_v1". When
// NOHO franchises (e.g. "NOHO West Hollywood") spin up their own
// instance, each instance has its own bureauId and the federated
// /api/bureau/{id}/... namespace lets them all share schema +
// admin tooling without crossing tenants.
//
// This is intentionally a shallow read/write helper — full multi-
// tenant isolation would require partitioning every model by
// bureauId. For now, federation = each install is its own bureau,
// and the bureauId is the public identifier other code can fan out
// to. Upgrades from "this install IS the only bureau" to "this is
// one of N bureaus in a network" stay backward-compatible.

export const BUREAU_IDENTITY_KEY = "bureau_identity_v1";

export type BureauIdentity = {
  bureauId: string;            // short slug like "noho" / "noho-weho" / "noho-pasadena"
  name: string;                // "NOHO Mailbox" / "NOHO Mailbox · West Hollywood"
  address: string;             // full street address (multi-line OK)
  city: string;
  state: string;               // 2-letter
  zip: string;
  timezone: string;            // IANA tz
  phone: string;               // E.164 preferred
  contactEmail: string;
  websiteUrl: string;
  brandPrimaryHex: string;     // brand-blue or franchise variant
  founded: number;             // year, e.g. 2024
  cmraLicenseNumber: string | null;
};

export const DEFAULT_BUREAU_IDENTITY: BureauIdentity = {
  bureauId: "noho",
  name: "NOHO Mailbox",
  address: "5062 Lankershim Blvd",
  city: "North Hollywood",
  state: "CA",
  zip: "91601",
  timezone: "America/Los_Angeles",
  phone: "+18185067744",
  contactEmail: "nohomailbox@gmail.com",
  websiteUrl: "https://nohomailbox.org",
  brandPrimaryHex: "#337485",
  founded: 2024,
  cmraLicenseNumber: null,
};

export function parseBureauIdentity(raw: string | null | undefined): BureauIdentity {
  if (!raw) return DEFAULT_BUREAU_IDENTITY;
  try {
    const j = JSON.parse(raw) as Partial<BureauIdentity>;
    if (!j || typeof j !== "object") return DEFAULT_BUREAU_IDENTITY;
    return {
      bureauId:    typeof j.bureauId === "string"    && /^[a-z0-9-]{2,40}$/.test(j.bureauId) ? j.bureauId : DEFAULT_BUREAU_IDENTITY.bureauId,
      name:        typeof j.name === "string"        ? j.name.slice(0, 80) : DEFAULT_BUREAU_IDENTITY.name,
      address:     typeof j.address === "string"     ? j.address.slice(0, 300) : DEFAULT_BUREAU_IDENTITY.address,
      city:        typeof j.city === "string"        ? j.city.slice(0, 80) : DEFAULT_BUREAU_IDENTITY.city,
      state:       typeof j.state === "string"       ? j.state.slice(0, 2).toUpperCase() : DEFAULT_BUREAU_IDENTITY.state,
      zip:         typeof j.zip === "string"         ? j.zip.slice(0, 12) : DEFAULT_BUREAU_IDENTITY.zip,
      timezone:    typeof j.timezone === "string"    ? j.timezone.slice(0, 60) : DEFAULT_BUREAU_IDENTITY.timezone,
      phone:       typeof j.phone === "string"       ? j.phone.slice(0, 30) : DEFAULT_BUREAU_IDENTITY.phone,
      contactEmail: typeof j.contactEmail === "string" ? j.contactEmail.slice(0, 80) : DEFAULT_BUREAU_IDENTITY.contactEmail,
      websiteUrl:  typeof j.websiteUrl === "string"  ? j.websiteUrl.slice(0, 200) : DEFAULT_BUREAU_IDENTITY.websiteUrl,
      brandPrimaryHex: typeof j.brandPrimaryHex === "string" && /^#[0-9a-fA-F]{6}$/.test(j.brandPrimaryHex) ? j.brandPrimaryHex : DEFAULT_BUREAU_IDENTITY.brandPrimaryHex,
      founded:     typeof j.founded === "number"     && j.founded >= 1900 && j.founded <= 2100 ? Math.floor(j.founded) : DEFAULT_BUREAU_IDENTITY.founded,
      cmraLicenseNumber: typeof j.cmraLicenseNumber === "string" ? j.cmraLicenseNumber.slice(0, 60) : null,
    };
  } catch { return DEFAULT_BUREAU_IDENTITY; }
}

// Public-facing projection — what /api/bureau/{id}/info returns to a
// federated caller. Strips contact email + license # if you want; we
// keep them in for B2B discovery but caller can re-project.
export type PublicBureauInfo = Omit<BureauIdentity, "cmraLicenseNumber"> & {
  cmraLicensed: boolean;
};

export function toPublicInfo(identity: BureauIdentity): PublicBureauInfo {
  const { cmraLicenseNumber, ...rest } = identity;
  return { ...rest, cmraLicensed: !!cmraLicenseNumber };
}
