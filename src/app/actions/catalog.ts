"use server";
import { prisma } from "@/lib/prisma";
import { verifyAdmin } from "@/lib/dal";
import { revalidatePath } from "next/cache";

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

async function getCfg<T>(key: string, def: T): Promise<T> {
  try {
    const r = await (prisma as any).siteConfig.findUnique({ where: { key } });
    return r ? JSON.parse(r.value) : def;
  } catch { return def; }
}
async function setCfg(key: string, value: unknown) {
  await (prisma as any).siteConfig.upsert({
    where: { key },
    create: { key, value: JSON.stringify(value) },
    update: { value: JSON.stringify(value) },
  });
}

const D_PLANS: PlanItem[] = [
  { id:"basic", name:"Basic Box", description:"Real street address for individuals", price3mo:50, price6mo:95, price14mo:160, discountPct:0, features:["Real street address","Mail scanning","Package notifications","In-store pickup","Mail forwarding"], highlighted:false },
  { id:"business", name:"Business Box", description:"Ideal for freelancers and small businesses", price3mo:80, price6mo:150, price14mo:250, discountPct:0, features:["Real street address","Mail scanning","Package notifications","In-store pickup","Mail forwarding","Priority processing","Notary discount"], highlighted:true },
  { id:"premium", name:"Premium Box", description:"Full-service for high-volume users", price3mo:95, price6mo:180, price14mo:295, discountPct:0, features:["Real street address","Mail scanning","Package notifications","In-store pickup","Mail forwarding","Priority processing","Notary discount","Same-day delivery","Dedicated account manager"], highlighted:false },
];
const D_SHOP: ShopItem[] = [
  { id:"bub-sm", name:"Bubble Mailer (Small)", description:'6×9" padded envelope', price:1.50, discountPct:0, category:"Mailers", inStock:true },
  { id:"bub-md", name:"Bubble Mailer (Medium)", description:'10×13" padded envelope', price:2.25, discountPct:0, category:"Mailers", inStock:true },
  { id:"box-sm", name:"Shipping Box (Small)", description:'6×6×6" corrugated', price:2.00, discountPct:0, category:"Boxes", inStock:true },
  { id:"box-md", name:"Shipping Box (Medium)", description:'12×12×12" corrugated', price:3.50, discountPct:0, category:"Boxes", inStock:true },
  { id:"tape", name:"Packing Tape", description:'2"×55yd clear tape', price:4.00, discountPct:0, category:"Supplies", inStock:true },
  { id:"labels", name:"Address Labels (20pk)", description:"Self-adhesive shipping labels", price:3.00, discountPct:0, category:"Supplies", inStock:true },
];
const D_SVC: ServiceItem[] = [
  { id:"scan", name:"Mail Scanning", description:"High-quality scan of mail contents", price:"$2", discountPct:0, unit:"per page" },
  { id:"forward", name:"Mail Forwarding", description:"Package and ship your mail anywhere", price:"Postage + $5", discountPct:0, unit:"per shipment" },
  { id:"notary", name:"Notary Services", description:"Certified notary public on site", price:"$15", discountPct:0, unit:"per signature" },
  { id:"delivery", name:"Same-Day Delivery", description:"Local delivery within North Hollywood", price:"From $5", discountPct:0, unit:"per delivery" },
  { id:"shred", name:"Secure Shredding", description:"HIPAA-compliant document destruction", price:"$1", discountPct:0, unit:"per lb" },
  { id:"key", name:"Key Replacement", description:"Replacement mailbox key", price:"$25", discountPct:0, unit:"flat fee" },
];

export const getPlans = () => getCfg<PlanItem[]>("plans", D_PLANS);
export const getShopItems = () => getCfg<ShopItem[]>("shopItems", D_SHOP);
export const getServiceItems = () => getCfg<ServiceItem[]>("serviceItems", D_SVC);
export const getMailboxSlots = () => getCfg<MailboxSlot[]>("mailboxSlots", []);

export async function savePlans(plans: PlanItem[]) {
  await verifyAdmin(); await setCfg("plans", plans);
  revalidatePath("/admin"); revalidatePath("/pricing");
  return { success: true };
}
export async function saveShopItems(items: ShopItem[]) {
  await verifyAdmin(); await setCfg("shopItems", items);
  revalidatePath("/admin"); revalidatePath("/shop");
  return { success: true };
}
export async function saveServiceItems(items: ServiceItem[]) {
  await verifyAdmin(); await setCfg("serviceItems", items);
  revalidatePath("/admin"); revalidatePath("/services");
  return { success: true };
}
export async function saveMailboxSlots(slots: MailboxSlot[]) {
  await verifyAdmin(); await setCfg("mailboxSlots", slots);
  revalidatePath("/admin");
  return { success: true };
}
