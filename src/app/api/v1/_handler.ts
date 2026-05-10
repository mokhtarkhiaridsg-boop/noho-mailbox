// iter-166 — Shared bearer-auth handler for /api/v1/* routes.
//
// Wraps a per-route business function with: token verification, scope
// gate, error normalization, usage logging. Every public route should
// use `withApiToken(scope, handler)` so the bearer-auth contract is
// applied identically everywhere.

import { NextResponse } from "next/server";
import { verifyApiToken, logApiUsage, clientIp, type ApiScope } from "@/lib/apiTokens";

type RouteHandler = (ctx: {
  userId: string;
  tokenId: string;
  scopes: ApiScope[];
  req: Request;
}) => Promise<unknown>;

export function withApiToken(requiredScope: ApiScope, handler: RouteHandler) {
  return async (req: Request) => {
    const started = Date.now();
    const url = new URL(req.url);
    const endpoint = url.pathname;
    const method = req.method;
    const ip = clientIp(req);
    const ua = req.headers.get("user-agent");

    const auth = await verifyApiToken(req, requiredScope);
    if (!auth.ok) {
      // Best-effort log of failed auth — we don't have a tokenId so the
      // log row is skipped (logApiUsage is a no-op for null tokenId).
      const res = NextResponse.json({ error: auth.error }, { status: auth.status });
      res.headers.set("x-noho-api", "v1");
      return res;
    }
    try {
      const body = await handler({ userId: auth.userId, tokenId: auth.tokenId, scopes: auth.scopes, req });
      const res = NextResponse.json(body, { status: 200 });
      res.headers.set("x-noho-api", "v1");
      void logApiUsage({ tokenId: auth.tokenId, endpoint, method, status: 200, durationMs: Date.now() - started, ip, userAgent: ua });
      return res;
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      void logApiUsage({ tokenId: auth.tokenId, endpoint, method, status: 500, durationMs: Date.now() - started, ip, userAgent: ua });
      return NextResponse.json({ error: message }, { status: 500 });
    }
  };
}
