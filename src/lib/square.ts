import { SquareClient, SquareEnvironment, SquareError } from "square";

function getSquareClient(): SquareClient | null {
  const token = process.env.SQUARE_ACCESS_TOKEN?.trim();
  if (!token) return null;

  // SquareEnvironment is a URL constant (e.g. "https://connect.squareupsandbox.com").
  // The SDK uses it as the base URL — passing the literal string "sandbox" makes
  // it concatenate "sandbox/v2/…" and every request 500s with "Failed to parse URL".
  return new SquareClient({
    token,
    environment:
      process.env.SQUARE_ENVIRONMENT === "production"
        ? SquareEnvironment.Production
        : SquareEnvironment.Sandbox,
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

// ─── Catalog write (used by the unified shop ⇄ Square dual-write) ───────
//
// Creates a single ITEM with one variation (we don't model SKUs/sizes yet).
// On success returns the new Square IDs so the caller can persist them on
// the local CatalogItem row. Throws on failure — callers wrap with try/catch.
export async function createSquareCatalogItem(input: {
  name: string;
  description?: string;
  priceCents: number;
  currency?: string;
  category?: string;
  sku?: string;
}): Promise<{ itemId: string; variationId: string }> {
  const client = getSquareClient();
  if (!client) throw new Error("Square not configured");

  const idempotencyKey =
    "noho-cat-" +
    Date.now().toString(36) +
    "-" +
    Math.random().toString(36).slice(2, 10);

  // Square upsertCatalogObject expects negative ID prefixes (#) for new objects;
  // they're rewritten by the API into permanent IDs in the response. We send
  // one ITEM with a single ITEM_VARIATION nested under it.
  const tempItemId = "#item";
  const tempVarId = "#var";

  const body = {
    idempotencyKey,
    object: {
      type: "ITEM" as const,
      id: tempItemId,
      itemData: {
        name: input.name,
        description: input.description,
        variations: [
          {
            type: "ITEM_VARIATION" as const,
            id: tempVarId,
            itemVariationData: {
              itemId: tempItemId,
              name: "Regular",
              pricingType: "FIXED_PRICING" as const,
              priceMoney: {
                amount: BigInt(input.priceCents),
                currency: (input.currency ?? "USD") as "USD",
              },
              sku: input.sku,
            },
          },
        ],
      },
    },
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const res = await (client.catalog as any).object.upsert(body);
  const obj = res?.catalogObject ?? res?.result?.catalogObject;
  const variation = obj?.itemData?.variations?.[0];

  return {
    itemId: obj?.id ?? "",
    variationId: variation?.id ?? "",
  };
}

// ─── Catalog update ─────────────────────────────────────────────────────
export async function updateSquareCatalogItem(input: {
  itemId: string;
  name: string;
  description?: string;
  priceCents: number;
  currency?: string;
  sku?: string;
}): Promise<void> {
  const client = getSquareClient();
  if (!client) throw new Error("Square not configured");

  // Square requires the full object to update — first retrieve, then re-upsert
  // with the same IDs and bumped fields. We patch only the fields the admin
  // edited and pass everything else through.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const existing = await (client.catalog as any).object.get({ objectId: input.itemId, includeRelatedObjects: true });
  const obj = existing?.object ?? existing?.result?.object;
  if (!obj) throw new Error("Square item not found: " + input.itemId);

  const variation = obj.itemData?.variations?.[0];
  const updated = {
    ...obj,
    itemData: {
      ...obj.itemData,
      name: input.name,
      description: input.description ?? obj.itemData?.description,
      variations: variation
        ? [
            {
              ...variation,
              itemVariationData: {
                ...variation.itemVariationData,
                priceMoney: {
                  amount: BigInt(input.priceCents),
                  currency: (input.currency ?? "USD") as "USD",
                },
                sku: input.sku ?? variation.itemVariationData?.sku,
              },
            },
          ]
        : obj.itemData?.variations,
    },
  };

  const idempotencyKey =
    "noho-cat-upd-" +
    Date.now().toString(36) +
    "-" +
    Math.random().toString(36).slice(2, 10);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (client.catalog as any).object.upsert({ idempotencyKey, object: updated });
}

// ─── Catalog delete ─────────────────────────────────────────────────────
export async function deleteSquareCatalogItem(itemId: string): Promise<void> {
  const client = getSquareClient();
  if (!client) throw new Error("Square not configured");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (client.catalog as any).object.delete({ objectId: itemId });
}
