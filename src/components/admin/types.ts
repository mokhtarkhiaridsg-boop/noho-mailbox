export type Customer = {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  plan: string;
  planTerm?: string | null;
  suiteNumber: string;
  status: string;
  createdAt: string;
  mailCount: number;
  packageCount: number;
  mailboxStatus?: string;
  kycStatus?: string;
  kycForm1583Url?: string | null;
  kycIdImageUrl?: string | null;
  kycIdImage2Url?: string | null;
  securityDepositCents?: number;
  planDueDate?: string | null;
  cardLast4?: string | null;
  cardBrand?: string | null;
  cardExpiry?: string | null;
  cardholderName?: string | null;
  cardDiscountPct?: number;
};

export type ComplianceRow = {
  id: string;
  name: string;
  email: string;
  plan: string | null;
  kycStatus: string;
  kycForm1583Url: string | null;
  kycIdImageUrl: string | null;
  mailboxStatus: string;
  suiteNumber: string | null;
  createdAt: string;
};

export type MailRequestRow = {
  id: string;
  kind: string;
  status: string;
  notes: string | null;
  createdAt: string;
  userName: string;
  suiteNumber: string | null;
  mailFrom: string;
};

export type KeyRequestRow = {
  id: string;
  status: string;
  reason: string;
  feeCents: number;
  createdAt: string;
  userId: string;
  userName: string;
};

export type MessageThreadRow = {
  id: string;
  subject: string;
  lastMessageAt: string;
  preview: string;
  senderId: string | null;
  participantIds: string;
  unreadForUserIds: string;
};

export type ContactRow = {
  id: string;
  name: string;
  email: string;
  service: string | null;
  message: string;
  createdAt: string;
};

export type MailItem = {
  id: string;
  customerName: string;
  suiteNumber: string;
  from: string;
  type: string;
  date: string;
  status: string;
};

export type NotaryItem = {
  id: string;
  customerName: string;
  date: string;
  time: string;
  type: string;
  status: string;
};

export type DeliveryOrder = {
  id: string;
  customerName: string;
  suiteNumber: string;
  destination: string;
  zone: string;
  price: number;
  itemType: string;
  courier: string;
  status: string;
  date: string;
};

export type ShopOrder = {
  id: string;
  customerName: string;
  items: string;
  total: number;
  status: string;
  date: string;
};

export type SyncLogEntry = {
  id: string;
  syncType: string;
  status: string;
  itemsSynced: number;
  errors: string | null;
  startedAt: string;
  completedAt: string | null;
};

export type SquareStatus = {
  configured: boolean;
  linkedCustomers: number;
  totalPayments: number;
  catalogItems: number;
  totalRevenue: number;
  recentLogs: SyncLogEntry[];
};

export type PaymentRow = {
  id: string;
  amount: number;
  currency: string;
  status: string;
  sourceType: string | null;
  note: string | null;
  squareCreatedAt: string;
  userName: string | null;
};

export type Stats = {
  activeCustomers: number;
  mailToday: number;
  awaitingPickup: number;
  planDistribution: {
    basic: number;
    business: number;
    premium: number;
  };
};

export type EditForm = {
  name: string;
  email: string;
  phone: string;
  suiteNumber: string;
  plan: string;
  planTerm: string;
  mailboxStatus: string;
  planDueDate: string;
  depositCents: number;
  kycStatus: string;
  cardLast4: string;
  cardBrand: string;
  cardExpiry: string;
  cardholderName: string;
  cardDiscountPct: number;
};
