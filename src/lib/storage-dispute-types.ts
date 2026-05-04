// Storage-fee dispute type definitions — extracted from
// `src/app/actions/storageDispute.ts` because Next.js 16 "use server"
// files can only export async functions. Pure types live here so client
// code (admin panel + member dispute button) can import them without
// pulling in the server-only module surface.

export type MyDisputeRow = {
  id: string;
  mailItemId: string;
  status: "Open" | "Waived" | "Upheld";
  feeCents: number;
  refundCents: number | null;
  reason: string;
  resolution: string | null;
  createdAtIso: string;
  resolvedAtIso: string | null;
};

export type AdminDisputeRow = MyDisputeRow & {
  filedByName: string;
  filedByEmail: string;
  suiteNumber: string | null;
  itemSummary: string;
  resolvedByName: string | null;
};
