import { headers } from "next/headers";
import type { Prisma } from "@prisma/client";
import { db } from "./db";
import { clientIp } from "./rate-limit";

export async function audit(
  actorId: string | null,
  action: string,
  entity: string,
  entityId?: string | null,
  meta?: Prisma.InputJsonValue,
) {
  let ip: string | null = null;
  try { ip = clientIp(await headers()); } catch { /* außerhalb eines Requests (Seed, Cron) */ }
  await db.auditLog.create({ data: { actorId, action, entity, entityId: entityId ?? null, meta, ip } });
}
