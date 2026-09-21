import { cache } from "react";
import { cookies, headers } from "next/headers";
import { db } from "@/lib/db";
import { cookieName, isProd } from "@/lib/env";
import { randomToken, sha256 } from "./password";
import { clientIp } from "@/lib/rate-limit";

export const SESSION_COOKIE = cookieName("lumi_session");
const SESSION_DAYS = 30;
/** Admin-Sitzungen laufen nach 12 Stunden ab (höheres Schadenspotenzial). */
const ADMIN_SESSION_HOURS = 12;

const cookieBase = () => ({
  httpOnly: true,
  sameSite: "lax" as const,
  secure: isProd(),
  path: "/",
});

/** Nur in Server Actions / Route Handlers aufrufbar (setzt ein Cookie). */
export async function createSession(userId: string) {
  const token = randomToken(32);
  const h = await headers();
  const user = await db.user.findUnique({ where: { id: userId }, select: { role: true } });
  const ttl = user?.role === "ADMIN" ? ADMIN_SESSION_HOURS * 3600_000 : SESSION_DAYS * 86400_000;
  const expiresAt = new Date(Date.now() + ttl);
  await db.session.create({
    data: {
      tokenHash: sha256(token),
      userId,
      expiresAt,
      userAgent: h.get("user-agent")?.slice(0, 250),
      ip: clientIp(h),
    },
  });
  (await cookies()).set(SESSION_COOKIE, token, { ...cookieBase(), expires: expiresAt });
}

export async function destroySession() {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (token) await db.session.deleteMany({ where: { tokenHash: sha256(token) } });
  jar.set(SESSION_COOKIE, "", { ...cookieBase(), maxAge: 0 });
}

export async function destroyAllSessions(userId: string, exceptTokenHash?: string) {
  await db.session.deleteMany({
    where: { userId, ...(exceptTokenHash ? { tokenHash: { not: exceptTokenHash } } : {}) },
  });
}

export const currentTokenHash = async () => {
  const t = (await cookies()).get(SESSION_COOKIE)?.value;
  return t ? sha256(t) : null;
};

/** Aktueller Nutzer (pro Request gecacht) oder null. */
export const getCurrentUser = cache(async () => {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const session = await db.session.findUnique({
    where: { tokenHash: sha256(token) },
    include: { user: true },
  });
  if (!session || session.expiresAt < new Date() || session.user.disabledAt) return null;
  return session.user;
});

export type CurrentUser = NonNullable<Awaited<ReturnType<typeof getCurrentUser>>>;
