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
};

// Brand palette — blue-forward
export const BRAND = {
  bg: "#FAFAF8",
  bgDeep: "#F0EDE8",
  card: "#FFFFFF",
  ink: "#1A1714",
  inkSoft: "#6B6560",
  inkFaint: "#A89F94",
  blue: "#3374B5",
  blueDeep: "#2960A0",
  blueSoft: "rgba(51,116,181,0.08)",
  border: "#E8E5E0",
};

export function statusColor(status: string) {
  if (status === "Awaiting Pickup" || status === "Ready for Pickup")
    return { bg: "rgba(51,116,181,0.14)", fg: "#1e4d8c", dot: "#3374B5" };
  if (status === "Forwarded" || status === "Picked Up")
    return { bg: "rgba(34,139,34,0.12)", fg: "#1a8a1a", dot: "#1a8a1a" };
  if (status.includes("Requested"))
    return { bg: "rgba(200,150,0,0.15)", fg: "#a07800", dot: "#e0a800" };
  if (status === "Scanned")
    return { bg: "rgba(120,90,200,0.14)", fg: "#5a3fa0", dot: "#7956d8" };
  if (status === "Held")
    return { bg: "rgba(200,50,50,0.12)", fg: "#c03030", dot: "#c03030" };
  return { bg: "rgba(14,34,64,0.06)", fg: BRAND.inkSoft, dot: BRAND.inkFaint };
}
