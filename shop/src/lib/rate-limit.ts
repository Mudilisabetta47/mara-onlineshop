/**
 * Rate-Limiting (Fixed Window).
 *  - Mit UPSTASH_REDIS_REST_URL/TOKEN: verteilt über alle Serverless-Instanzen (Pflicht für Production auf Vercel).
 *  - Ohne: Prozessspeicher (nur lokal/Einzelinstanz sinnvoll).
 * Bei Ausfall des Redis wird „fail open“ entschieden (Shop bleibt bedienbar) und geloggt.
 */
type Bucket = { count: number; resetAt: number };
const buckets = new Map<string, Bucket>();
export type RateResult = { ok: boolean; remaining: number; retryAfterSec: number };

function memory(key: string, limit: number, windowMs: number): RateResult {
  const now = Date.now();
  if (buckets.size > 5000) for (const [k, b] of buckets) if (b.resetAt < now) buckets.delete(k);
  const b = buckets.get(key);
  if (!b || b.resetAt < now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, remaining: limit - 1, retryAfterSec: 0 };
  }
  b.count += 1;
  const ok = b.count <= limit;
  return { ok, remaining: Math.max(0, limit - b.count), retryAfterSec: ok ? 0 : Math.ceil((b.resetAt - now) / 1000) };
}

async function upstash(key: string, limit: number, windowMs: number): Promise<RateResult> {
  const url = process.env.UPSTASH_REDIS_REST_URL!, token = process.env.UPSTASH_REDIS_REST_TOKEN!;
  const k = `rl:${key}`;
  const res = await fetch(`${url}/pipeline`, {
    method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify([["INCR", k], ["PEXPIRE", k, String(windowMs), "NX"], ["PTTL", k]]),
    cache: "no-store", signal: AbortSignal.timeout(1500),
  });
  if (!res.ok) throw new Error(`Upstash ${res.status}`);
  const [count, , ttl] = (await res.json()) as { result: number }[];
  const ok = count.result <= limit;
  return { ok, remaining: Math.max(0, limit - count.result), retryAfterSec: ok ? 0 : Math.max(1, Math.ceil(ttl.result / 1000)) };
}

export async function rateLimit(key: string, limit: number, windowMs: number): Promise<RateResult> {
  if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
    try { return await upstash(key, limit, windowMs); }
    catch (e) { console.error("[rate-limit] Redis nicht erreichbar – fail open:", (e as Error).message); return { ok: true, remaining: limit, retryAfterSec: 0 }; }
  }
  return memory(key, limit, windowMs);
}

export function clientIp(h: Headers): string {
  return (h.get("x-forwarded-for")?.split(",")[0] || h.get("x-real-ip") || "local").trim();
}
