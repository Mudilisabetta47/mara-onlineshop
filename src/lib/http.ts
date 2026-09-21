import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { appUrl } from "./env";
import { clientIp, rateLimit } from "./rate-limit";

export class ApiError extends Error {
  constructor(public status: number, message: string, public code?: string, public extra?: Record<string, unknown>) {
    super(message);
  }
}

export const ok = (data: unknown = {}, init?: ResponseInit) => NextResponse.json(data, init);

/**
 * CSRF-Schutz für Cookie-Sessions: Alle mutierenden Requests müssen von der eigenen Origin kommen
 * (zusätzlich zu SameSite=Lax auf den Session-Cookies). Server Actions prüft Next.js selbst.
 */
export function assertSameOrigin(req: Request) {
  if (["GET", "HEAD", "OPTIONS"].includes(req.method)) return;
  const origin = req.headers.get("origin");
  const host = req.headers.get("host");
  if (!origin) throw new ApiError(403, "Origin fehlt", "csrf");
  let originHost: string;
  try { originHost = new URL(origin).host; } catch { throw new ApiError(403, "Ungültige Origin", "csrf"); }
  const allowed = new Set([host, new URL(appUrl()).host].filter(Boolean));
  if (!allowed.has(originHost)) throw new ApiError(403, "Cross-Origin-Anfrage abgelehnt", "csrf");
}

type Handler<C> = (req: Request, ctx: C) => Promise<Response>;

/** Einheitliches Error-Handling, Origin-Check und optionales Rate Limiting für Route Handler. */
export function route<C = unknown>(
  handler: Handler<C>,
  opts: { limit?: { key: string; max: number; windowMs: number }; skipOriginCheck?: boolean } = {},
): Handler<C> {
  return async (req, ctx) => {
    try {
      if (!opts.skipOriginCheck) assertSameOrigin(req);
      if (opts.limit) {
        const rl = await rateLimit(`${opts.limit.key}:${clientIp(req.headers)}`, opts.limit.max, opts.limit.windowMs);
        if (!rl.ok) throw new ApiError(429, "Zu viele Anfragen. Bitte versuche es gleich erneut.", "rate_limited", { retryAfter: rl.retryAfterSec });
      }
      return await handler(req, ctx);
    } catch (e) {
      if (e instanceof ApiError) {
        return NextResponse.json(
          { error: e.message, code: e.code, ...e.extra },
          { status: e.status, headers: e.status === 429 ? { "Retry-After": String(e.extra?.retryAfter ?? 30) } : undefined },
        );
      }
      if (e instanceof ZodError) {
        return NextResponse.json(
          { error: e.issues[0]?.message ?? "Ungültige Eingabe", code: "validation", fields: e.flatten().fieldErrors },
          { status: 400 },
        );
      }
      console.error("[api]", req.method, new URL(req.url).pathname, e);
      return NextResponse.json({ error: "Interner Fehler", code: "internal" }, { status: 500 });
    }
  };
}
