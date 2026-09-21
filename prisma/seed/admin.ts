import type { PrismaClient } from "@prisma/client";
import { hashPassword } from "../../src/lib/auth/password";
import { appEnv } from "../../src/lib/config";

/**
 * Legt den ERSTEN Administrator an (Bootstrap). Existiert die E-Mail bereits, passiert nichts –
 * ein Seed kann niemals ein bestehendes Passwort überschreiben.
 * In staging/production: Passwort min. 14 Zeichen, gemischt, nicht der Dev-Standard.
 */
export async function seedAdmin(db: PrismaClient) {
  const email = (process.env.ADMIN_EMAIL || "").trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD || "";
  if (!email || !password) throw new Error("ADMIN_EMAIL und ADMIN_PASSWORD müssen gesetzt sein.");
  if (appEnv() !== "local") {
    const weak = password.length < 14 || !/[a-z]/.test(password) || !/[A-Z]/.test(password) || !/\d/.test(password) || /LumiAdmin|ChangeMe|password|passwort/i.test(password) || /@lumi\.local$/.test(email);
    if (weak) throw new Error("Admin-Zugang zu schwach für staging/production (Passwort ≥ 14 Zeichen mit Groß-/Kleinbuchstaben und Ziffern, echte E-Mail-Adresse, kein Dev-Standard).");
  }
  if (await db.user.findUnique({ where: { email } })) { console.log(`• Admin ${email} existiert bereits – unverändert.`); return; }
  await db.user.create({ data: { email, passwordHash: await hashPassword(password), firstName: "Shop", lastName: "Admin", role: "ADMIN", emailVerifiedAt: new Date() } });
  console.log(`✓ Admin angelegt: ${email}`);
  if (appEnv() !== "local") console.log("  → Bitte jetzt einloggen, Passwort ändern und ADMIN_PASSWORD aus der Umgebung entfernen.");
}
