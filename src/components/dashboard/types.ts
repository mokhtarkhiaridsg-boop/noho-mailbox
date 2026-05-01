// Shared types, BRAND palette, and statusColor helper for all dashboard panels

export type MailItem = {
  id: string;
  from: string;
  date: string;
  type: string;
  status: string;
  scanned: boolean;
  scanImageUrl: string | null;
  label: string | null;
  priority?: boolean;
  junkBlocked?: boolean;
  trackingNumber?: string | null;
  carrier?: string | null;
  exteriorImageUrl?: string | null;
  recipientName?: string | null;
  // iter-80: ISO timestamp of intake. Lets the panel compute days-on-shelf
  // for the storage-tier countdown. The free-form `date` string isn't
  // safe to parse so we pass createdAt through separately.
  createdAt?: string;
};

export type ForwardingAddress = { id: string; label: string; address: string };

export type NotaryBooking = {
  id: string;
  date: string;
  time: string;
  type: string;
  status: string;
};

export type Card = {
  id: string;
  brand: string;
  last4: string;
  expMonth: number;
  expYear: number;
  isDefault: boolean;
};

export type WalletTxn = {
  id: string;
  kind: string;
  amountCents: number;
  description: string;
  balanceAfterCents: number;
  createdAt: string;
};

export type Invoice = {
  id: string;
  number: string;
  kind: string;
  description: string;
  totalCents: number;
  status: string;
  sentAt: string | null;
  paidAt: string | null;
  createdAt: string;
};

export type Delivery = {
  id: string;
  destination: string;
  tier: string;
  status: string;
  price: number;
  date: string;
  pickedUpAt: string | null;
  inTransitAt: string | null;
  deliveredAt: string | null;
  podPhotoUrl: string | null;
};

export type Thread = {
  id: string;
  subject: string;
  lastMessageAt: string;
  preview: string;
  attachmentCount: number;
  unread: boolean;
};

export type KeyReq = {
  id: string;
  status: string;
  feeCents: number;
  createdAt: string;
};

export type DashboardUser = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  plan: string | null;
  planTerm: string | null;
  suiteNumber: string | null;
  role: string;
  securityDepositCents: number;
  securityDepositTotalCents: number;
  walletBalanceCents: number;
  defaultCardId: string | null;
  totpEnabled: boolean;
  mailboxStatus: string;
  kycStatus: string;
  planDueDate: string | null;
};

export type VaultItem = {
  id: string;
  kind: string;
  title: string;
  blobUrl: string;
  mimeType: string;
  sizeBytes: number;
  tags?: string | null;
  createdAt: string;
};

export type AppNotification = {
  id: string;
  type: string;
  title: string;
  body: string;
  read: boolean;
  link?: string | null;
  createdAt: string;
};

export type DashboardProps = {
  user: DashboardUser;
  mailItems: MailItem[];
  addresses: ForwardingAddress[];
  bookings: NotaryBooking[];
  stats: { totalMail: number; unread: number; packages: number; forwarded: number };
  cards: Card[];
  walletTxns: WalletTxn[];
  invoices: Invoice[];
  deliveries: Delivery[];
  threads: Thread[];
  keyRequests: KeyReq[];
  notifications?: AppNotification[];
  vaultItems?: VaultItem[];
  junkSenders?: { id: string; sender: string }[];
  vacation?: { startDate: string; endDate: string; digest: boolean } | null;
  // ShippoLabel rows where userId === current member (set when admin runs
  // Quick Ship with a member tied to the label). Surfaced via ShippingPanel.
  shippingLabels?: Array<{
    id: string;
    carrier: string;
    servicelevel: string;
    trackingNumber: string;
    trackingUrl: string;
    labelUrl: string;
    amountPaid: number;
    status: string;
    toName: string;
    toCity: string;
    toState: string;
    toZip: string;
    createdAt: string;
  }>;
};

// Brand palette — cream + brown + blue accent (matches NOHO brand book)
// Existing key names are preserved so all 481 inline references keep resolving;
// only the values change to pull the dashboard into the marketing brand.
export const BRAND = {
  // Surfaces — warm cream, not off-white
  bg: "#F8F2EA",
  bgDeep: "#F7E6C2",
  card: "#FFFFFF",
  // Ink — brand brown, not near-black
  ink: "#2D100F",
  inkSoft: "#5C4540",
  inkFaint: "#A89484",
  // Accents — unchanged (already brand-locked)
  blue: "#337485",
  blueDeep: "#23596A",
  blueSoft: "rgba(51,116,133,0.08)",
  border: "#E8DDD0",
  // New keys for follow-up work
  cream: "#F7E6C2",
  creamDeep: "#F0DBA9",
  brown: "#2D100F",
  brownDeep: "#1F0807",
  brownSoft: "rgba(45,16,15,0.06)",
};

// Brand-aligned status colors — semantic CSS vars on warm cream surfaces.
// Each variant ships its own deep ink shade for AA-readable foreground.
export function statusColor(status: string) {
  if (status === "Awaiting Pickup" || status === "Ready for Pickup")
    return { bg: BRAND.blueSoft, fg: BRAND.blueDeep, dot: BRAND.blue };
  if (status === "Forwarded" || status === "Picked Up")
    return { bg: "var(--color-success-soft)", fg: "#166534", dot: "var(--color-success)" };
  if (status.includes("Requested"))
    return { bg: "var(--color-warning-soft)", fg: "#7C2D12", dot: "var(--color-warning)" };
  if (status === "Scanned")
    return { bg: BRAND.brownSoft, fg: BRAND.brown, dot: BRAND.brown };
  if (status === "Held")
    return { bg: "var(--color-danger-soft)", fg: "#7F1D1D", dot: "var(--color-danger)" };
  return { bg: BRAND.brownSoft, fg: BRAND.inkSoft, dot: BRAND.inkFaint };
}
