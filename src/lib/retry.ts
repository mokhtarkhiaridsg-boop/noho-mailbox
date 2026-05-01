/**
 * Lightweight retry wrapper for known-transient libsql / Turso errors.
 *
 * The Turso edge endpoint occasionally returns connection-reset or HTTP-500
 * errors during cold start or under bursty load. A short exponential
 * backoff converts these into a few hundred ms of latency instead of a
 * hard failure that surfaces as a 503 at the Vercel layer.
 *
 * Usage: wrap any individual Prisma read/write that runs on a hot path.
 *
 *   const user = await retry(() => prisma.user.findUnique({...}));
 *
 * Don't wrap whole `$transaction` blocks — Prisma rolls back on first
 * failure, and retrying a partially-applied transaction is unsound. Wrap
 * the outer caller instead, or move the transaction into the retry block
 * as a single unit.
 */

type RetryOptions = {
  attempts?: number;     // total attempts including the first call
  baseDelayMs?: number;  // delay before first retry
  maxDelayMs?: number;   // cap for exponential backoff
};

const DEFAULT_OPTS: Required<RetryOptions> = {
  attempts: 3,
  baseDelayMs: 80,
  maxDelayMs: 800,
};

/** Heuristic: should we retry this error or surface it immediately? */
function isTransient(err: unknown): boolean {
  if (!err) return false;
  const msg = String((err as { message?: string }).message ?? err).toLowerCase();
  // Connection-level signals (libsql, fetch, undici, hyper)
  if (msg.includes("econnreset")) return true;
  if (msg.includes("econnrefused")) return true;
  if (msg.includes("etimedout")) return true;
  if (msg.includes("socket hang up")) return true;
  if (msg.includes("network")) return true;
  if (msg.includes("fetch failed")) return true;
  if (msg.includes("aborterror")) return true;
  // Turso/libsql specific
  if (msg.includes("upstream connect error")) return true;
  if (msg.includes("hyper") && msg.includes("error")) return true;
  // HTTP 5xx surfaced by libsql adapter
  if (msg.includes("status 502")) return true;
  if (msg.includes("status 503")) return true;
  if (msg.includes("status 504")) return true;
  return false;
}

export async function retry<T>(fn: () => Promise<T>, opts?: RetryOptions): Promise<T> {
  const { attempts, baseDelayMs, maxDelayMs } = { ...DEFAULT_OPTS, ...opts };
  let lastErr: unknown;
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (e) {
      lastErr = e;
      if (!isTransient(e) || i === attempts - 1) throw e;
      const delay = Math.min(baseDelayMs * 2 ** i, maxDelayMs);
      await new Promise((r) => setTimeout(r, delay));
    }
  }
  throw lastErr;
}
