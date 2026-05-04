// Catalog type definitions — extracted from src/app/actions/catalog.ts
// because "use server" files in Next.js 16 cannot export types/values that
// aren't async functions. Pure types live here so client + server can both
// import them without violating the server-action constraint.

export type PlanItem = {
  id: string; name: string; description: string;
  price3mo: number; price6mo: number; price14mo: number;
  discountPct: number; features: string[]; highlighted: boolean;
};
export type ShopItem = {
  id: string; name: string; description: string;
  price: number; discountPct: number; category: string; inStock: boolean;
};
export type ServiceItem = {
  id: string; name: string; description: string;
  price: string; discountPct: number; unit: string;
};
export type MailboxSlot = {
  number: string; status: "available" | "occupied" | "reserved" | "maintenance";
  customerId?: string; customerName?: string;
};
