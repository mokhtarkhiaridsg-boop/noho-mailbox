// iter-177 — Stripe ACH wrapper.
//
// Lives outside any "use server" file so server actions + cron routes
// share the same primitives. Uses Stripe's REST API directly (no SDK
// dependency — keeps bundle small + dodges the official SDK's heavy
// type tree).
//
// Graceful no-op contract: every function returns `{ ok: false,
// reason: "not_configured" }` when STRIPE_SECRET_KEY is missing so the
// app builds + runs in environments without Stripe set up. The admin
// panel surfaces this state so it's not silent.
//
// Endpoints used:
//   POST /v1/customers
//   POST /v1/setup_intents     (with payment_method_types[]=us_bank_account)
//   POST /v1/payment_intents   (confirm with the saved bank-debit pm)
//
// Dollar amounts are always sent as integer cents.

const STRIPE_KEY = process.env.STRIPE_SECRET_KEY?.trim();
const STRIPE_API = "https://api.stripe.com/v1";

export function isStripeConfigured(): boolean {
  return !!STRIPE_KEY;
}

type StripeResult<T> = { ok: true; data: T } | { ok: false; reason: string; status?: number; raw?: unknown };

async function stripeFetch<T>(path: string, init: { method: "GET" | "POST" | "DELETE"; body?: Record<string, string | number> }): Promise<StripeResult<T>> {
  if (!STRIPE_KEY) return { ok: false, reason: "not_configured" };
  const url = `${STRIPE_API}${path}`;
  const headers: Record<string, string> = {
    Authorization: `Bearer ${STRIPE_KEY}`,
  };
  let body: string | undefined;
  if (init.body) {
    headers["Content-Type"] = "application/x-www-form-urlencoded";
    const form = new URLSearchParams();
    for (const [k, v] of Object.entries(init.body)) form.set(k, String(v));
    body = form.toString();
  }
  try {
    const res = await fetch(url, { method: init.method, headers, body, signal: AbortSignal.timeout(10_000) });
    const json = (await res.json().catch(() => ({}))) as Record<string, unknown>;
    if (!res.ok) {
      const err = json.error as { code?: string; message?: string; type?: string } | undefined;
      return { ok: false, reason: err?.message ?? `HTTP ${res.status}`, status: res.status, raw: json };
    }
    return { ok: true, data: json as T };
  } catch (e) {
    return { ok: false, reason: e instanceof Error ? e.message : String(e) };
  }
}

// ─── Customer ────────────────────────────────────────────────────────
export type StripeCustomer = { id: string; email?: string; name?: string };

export async function createOrFindStripeCustomer(input: { email: string; name?: string; metadata?: Record<string, string> }): Promise<StripeResult<StripeCustomer>> {
  // Search by email first to avoid duplicate customers.
  const search = await stripeFetch<{ data: StripeCustomer[] }>(`/customers/search?query=${encodeURIComponent(`email:'${input.email}'`)}&limit=1`, { method: "GET" });
  if (search.ok && search.data.data && search.data.data.length > 0) {
    return { ok: true, data: search.data.data[0]! };
  }
  // Otherwise create.
  const body: Record<string, string> = { email: input.email };
  if (input.name) body.name = input.name;
  if (input.metadata) {
    for (const [k, v] of Object.entries(input.metadata)) body[`metadata[${k}]`] = v;
  }
  return stripeFetch<StripeCustomer>("/customers", { method: "POST", body });
}

// ─── SetupIntent (returns client_secret for Stripe.js to complete) ────
export type SetupIntentRow = {
  id: string;
  client_secret: string;
  status: string;
  customer: string;
};

export async function createAchSetupIntent(input: { customerId: string; metadata?: Record<string, string> }): Promise<StripeResult<SetupIntentRow>> {
  const body: Record<string, string> = {
    customer: input.customerId,
    "payment_method_types[0]": "us_bank_account",
    "payment_method_options[us_bank_account][verification_method]": "automatic",
    usage: "off_session",
  };
  if (input.metadata) {
    for (const [k, v] of Object.entries(input.metadata)) body[`metadata[${k}]`] = v;
  }
  return stripeFetch<SetupIntentRow>("/setup_intents", { method: "POST", body });
}

// ─── Charge (PaymentIntent confirmed off-session) ────────────────────
export type PaymentIntentRow = {
  id: string;
  amount: number;
  currency: string;
  status: string;
  latest_charge?: string;
  next_action?: { type: string };
  last_payment_error?: { code?: string; message?: string };
};

export async function chargeAchPaymentMethod(input: {
  customerId: string;
  paymentMethodId: string;
  amountCents: number;
  description: string;
  mandateId?: string;
  metadata?: Record<string, string>;
}): Promise<StripeResult<PaymentIntentRow>> {
  if (input.amountCents < 100) return { ok: false, reason: "Minimum $1 (Stripe constraint)." };
  const body: Record<string, string | number> = {
    customer: input.customerId,
    payment_method: input.paymentMethodId,
    "payment_method_types[0]": "us_bank_account",
    amount: Math.round(input.amountCents),
    currency: "usd",
    confirm: "true",
    off_session: "true",
    description: input.description.slice(0, 1000),
  };
  if (input.mandateId) body["mandate"] = input.mandateId;
  if (input.metadata) {
    for (const [k, v] of Object.entries(input.metadata)) body[`metadata[${k}]`] = v;
  }
  return stripeFetch<PaymentIntentRow>("/payment_intents", { method: "POST", body });
}

// Look up an existing payment intent (used by webhook reconcile).
export async function getPaymentIntent(id: string): Promise<StripeResult<PaymentIntentRow>> {
  return stripeFetch<PaymentIntentRow>(`/payment_intents/${id}`, { method: "GET" });
}
