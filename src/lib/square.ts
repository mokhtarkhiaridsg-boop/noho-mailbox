import { SquareClient, SquareError } from "square";

function getSquareClient(): SquareClient | null {
  const token = process.env.SQUARE_ACCESS_TOKEN?.trim();
  if (!token) return null;

  return new SquareClient({
    token,
    environment:
      process.env.SQUARE_ENVIRONMENT === "production" ? "production" : "sandbox",
  });
}

export function isSquareConfigured(): boolean {
  return !!process.env.SQUARE_ACCESS_TOKEN?.trim();
}

export async function getSquareCustomers() {
  const client = getSquareClient();
  if (!client) throw new Error("Square not configured");

  const customers: Array<{
    id: string;
    givenName?: string;
    familyName?: string;
    emailAddress?: string;
    phoneNumber?: string;
    createdAt?: string;
  }> = [];

  // SDK v40 uses async iteration on Page objects
  const page = await client.customers.list({ limit: 100 });
  for (const c of page.data) {
    customers.push({
      id: c.id!,
      givenName: c.givenName ?? undefined,
      familyName: c.familyName ?? undefined,
      emailAddress: c.emailAddress ?? undefined,
      phoneNumber: c.phoneNumber ?? undefined,
      createdAt: c.createdAt ?? undefined,
    });
  }

  let currentPage = page;
  while (currentPage.hasNextPage()) {
    currentPage = await currentPage.getNextPage();
    for (const c of currentPage.data) {
      customers.push({
        id: c.id!,
        givenName: c.givenName ?? undefined,
        familyName: c.familyName ?? undefined,
        emailAddress: c.emailAddress ?? undefined,
        phoneNumber: c.phoneNumber ?? undefined,
        createdAt: c.createdAt ?? undefined,
      });
    }
  }

  return customers;
}

export async function getSquarePayments(beginTime?: string) {
  const client = getSquareClient();
  if (!client) throw new Error("Square not configured");

  const payments: Array<{
    id: string;
    amount: number;
    currency: string;
    status: string;
    sourceType?: string;
    receiptUrl?: string;
    note?: string;
    createdAt: string;
    customerId?: string;
  }> = [];

  const page = await client.payments.list({ beginTime, limit: 100 });
  for (const p of page.data) {
    payments.push({
      id: p.id!,
      amount: Number(p.amountMoney?.amount ?? 0),
      currency: p.amountMoney?.currency ?? "USD",
      status: p.status ?? "UNKNOWN",
      sourceType: p.sourceType ?? undefined,
      receiptUrl: p.receiptUrl ?? undefined,
      note: p.note ?? undefined,
      createdAt: p.createdAt ?? new Date().toISOString(),
      customerId: p.customerId ?? undefined,
    });
  }

  let currentPage = page;
  while (currentPage.hasNextPage()) {
    currentPage = await currentPage.getNextPage();
    for (const p of currentPage.data) {
      payments.push({
        id: p.id!,
        amount: Number(p.amountMoney?.amount ?? 0),
        currency: p.amountMoney?.currency ?? "USD",
        status: p.status ?? "UNKNOWN",
        sourceType: p.sourceType ?? undefined,
        receiptUrl: p.receiptUrl ?? undefined,
        note: p.note ?? undefined,
        createdAt: p.createdAt ?? new Date().toISOString(),
        customerId: p.customerId ?? undefined,
      });
    }
  }

  return payments;
}

export async function getSquareCatalog() {
  const client = getSquareClient();
  if (!client) throw new Error("Square not configured");

  const items: Array<{
    id: string;
    name: string;
    description?: string;
    price: number;
    currency: string;
    category?: string;
    imageUrl?: string;
  }> = [];

  const page = await client.catalog.list({ types: "ITEM" });
  function processCatalogPage(data: typeof page.data) {
    for (const obj of data) {
      if (obj.type !== "ITEM") continue;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const itemData = (obj as any).itemData;
      if (!itemData) continue;

      const variation = itemData.variations?.[0];
      const priceMoney = variation?.itemVariationData?.priceMoney;

      items.push({
        id: obj.id!,
        name: itemData.name ?? "Unnamed",
        description: itemData.description ?? undefined,
        price: Number(priceMoney?.amount ?? 0),
        currency: priceMoney?.currency ?? "USD",
        category: itemData.categoryId ?? undefined,
        imageUrl: itemData.imageIds?.[0] ?? undefined,
      });
    }
  }

  processCatalogPage(page.data);

  let currentPage = page;
  while (currentPage.hasNextPage()) {
    currentPage = await currentPage.getNextPage();
    processCatalogPage(currentPage.data);
  }

  return items;
}

export function isSquareError(err: unknown): err is SquareError {
  return err instanceof SquareError;
}
