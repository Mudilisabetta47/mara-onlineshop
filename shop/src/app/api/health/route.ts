import { NextResponse } from "next/server";
import { technicalChecks, businessReadiness } from "@/lib/readiness";
import { appEnv } from "@/lib/config";
import { rateLimit, clientIp } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

/**
 * Health Check für Uptime-Monitoring / Load Balancer.
 *  GET /api/health            → { status, checks: { database, schema, migrations, storage: true|false } }  (öffentlich, minimal)
 *  GET /api/health?detail=1   → zusätzlich Latenzen, Fehlerkürzel, Version, Betriebsbereitschaft
 *                               (nur mit `Authorization: Bearer $CRON_SECRET`)
 * 200 = ok/degraded, 503 = Datenbank/Schema/Migrationen nicht in Ordnung. Enthält nie Secrets oder Zugangsdaten.
 */
export async function GET(req: Request) {
  const headers = { "Cache-Control": "no-store" };
  if (!(await rateLimit(`health:${clientIp(req.headers)}`, 60, 60_000)).ok) return NextResponse.json({ status: "rate_limited" }, { status: 429, headers });

  const auth = req.headers.get("authorization");
  const detail = new URL(req.url).searchParams.get("detail") === "1" && !!process.env.CRON_SECRET && auth === `Bearer ${process.env.CRON_SECRET}`;

  const c = await technicalChecks();
  const critical = c.database.ok && c.schema.ok && c.migrations.ok;
  const status = !critical ? "down" : c.storage.ok ? "ok" : "degraded";
  const body: Record<string, unknown> = {
    status, time: new Date().toISOString(),
    checks: { database: c.database.ok, schema: c.schema.ok, migrations: c.migrations.ok, storage: c.storage.ok },
  };
  if (detail) {
    body.env = appEnv();
    body.version = process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? "dev";
    body.region = process.env.VERCEL_REGION ?? null;
    body.details = c;
    body.readiness = await businessReadiness().catch(() => []);
  }
  return NextResponse.json(body, { status: critical ? 200 : 503, headers });
}

export async function HEAD(req: Request) {
  const r = await GET(req);
  return new NextResponse(null, { status: r.status, headers: r.headers });
}
