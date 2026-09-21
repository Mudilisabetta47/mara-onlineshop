"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getCurrentUser, currentTokenHash, destroyAllSessions, destroySession } from "@/lib/auth/session";
import { hashPassword, passwordProblem, verifyPassword } from "@/lib/auth/password";
import { addressSchema, emailSchema, fd } from "@/lib/validation";
import { audit } from "@/lib/audit";
import { rateLimit } from "@/lib/rate-limit";
import type { FormState } from "@/components/ui/Form";

async function me() {
  const u = await getCurrentUser();
  if (!u) redirect("/login");
  return u;
}
const flat = (e: import("zod").ZodError) => {
  const fe: Record<string, string> = {};
  e.issues.forEach((i) => (fe[String(i.path[0])] ??= i.message));
  return fe;
};

export async function updateProfileAction(_: FormState, form: FormData): Promise<FormState> {
  const u = await me();
  const firstName = fd(form, "firstName").trim(), lastName = fd(form, "lastName").trim(), phone = fd(form, "phone").trim();
  const email = emailSchema.safeParse(fd(form, "email"));
  if (!firstName || !lastName) return { error: "Vor- und Nachname sind Pflichtfelder." };
  if (!email.success) return { fieldErrors: { email: "Ungültige E-Mail-Adresse." }, error: "Bitte prüfe deine Eingaben." };
  if (email.data !== u.email) {
    if (!(await verifyPassword(fd(form, "currentPassword"), u.passwordHash))) return { fieldErrors: { currentPassword: "Zum Ändern der E-Mail bitte das aktuelle Passwort eingeben." }, error: "Bitte prüfe deine Eingaben." };
    if (await db.user.findUnique({ where: { email: email.data } })) return { fieldErrors: { email: "Diese E-Mail wird bereits verwendet." }, error: "Bitte prüfe deine Eingaben." };
  }
  await db.user.update({ where: { id: u.id }, data: { firstName, lastName, phone: phone || null, email: email.data } });
  await audit(u.id, "account.profile_update", "User", u.id);
  revalidatePath("/account", "layout");
  return { ok: "Profil gespeichert." };
}

export async function changePasswordAction(_: FormState, form: FormData): Promise<FormState> {
  const u = await me();
  if (!(await rateLimit(`pw-change:${u.id}`, 6, 15 * 60_000)).ok) return { error: "Zu viele Versuche. Bitte warte einen Moment." };
  if (!(await verifyPassword(fd(form, "current"), u.passwordHash))) return { fieldErrors: { current: "Das aktuelle Passwort ist falsch." }, error: "Bitte prüfe deine Eingaben." };
  const pw = fd(form, "password");
  const problem = passwordProblem(pw);
  if (problem) return { fieldErrors: { password: problem }, error: "Bitte prüfe deine Eingaben." };
  if (pw !== fd(form, "password2")) return { fieldErrors: { password2: "Die Passwörter stimmen nicht überein." }, error: "Bitte prüfe deine Eingaben." };
  await db.user.update({ where: { id: u.id }, data: { passwordHash: await hashPassword(pw) } });
  await destroyAllSessions(u.id, (await currentTokenHash()) ?? undefined); // andere Geräte abmelden
  await audit(u.id, "account.password_change", "User", u.id);
  return { ok: "Passwort geändert. Andere Geräte wurden abgemeldet." };
}

export async function saveAddressAction(_: FormState, form: FormData): Promise<FormState> {
  const u = await me();
  const parsed = addressSchema.safeParse(Object.fromEntries([...form.entries()].filter(([, v]) => typeof v === "string")));
  if (!parsed.success) return { error: "Bitte prüfe deine Eingaben.", fieldErrors: flat(parsed.error) };
  const a = parsed.data;
  const id = fd(form, "id");
  const makeDefault = form.get("isDefault") === "on";
  const data = { firstName: a.firstName, lastName: a.lastName, company: a.company || null, line1: a.line1, line2: a.line2 || null, postalCode: a.postalCode, city: a.city, country: a.country, phone: a.phone || null, label: fd(form, "label").trim() || null };
  const count = await db.address.count({ where: { userId: u.id } });
  if (id) {
    const own = await db.address.findFirst({ where: { id, userId: u.id } });
    if (!own) return { error: "Adresse nicht gefunden." };
    await db.address.update({ where: { id }, data });
  } else {
    if (count >= 10) return { error: "Du kannst maximal 10 Adressen speichern." };
    await db.address.create({ data: { ...data, userId: u.id, isDefault: count === 0 } });
  }
  if (makeDefault) await setDefault(u.id, id || (await db.address.findFirst({ where: { userId: u.id }, orderBy: { createdAt: "desc" } }))!.id);
  revalidatePath("/account/addresses");
  return { ok: "Adresse gespeichert." };
}

async function setDefault(userId: string, id: string) {
  await db.$transaction([
    db.address.updateMany({ where: { userId }, data: { isDefault: false } }),
    db.address.updateMany({ where: { id, userId }, data: { isDefault: true } }),
  ]);
}

export async function deleteAddressAction(form: FormData) {
  const u = await me();
  await db.address.deleteMany({ where: { id: fd(form, "id"), userId: u.id } });
  revalidatePath("/account/addresses");
}
export async function defaultAddressAction(form: FormData) {
  const u = await me();
  await setDefault(u.id, fd(form, "id"));
  revalidatePath("/account/addresses");
}

export async function newsletterAction(form: FormData) {
  const u = await me();
  const on = form.get("newsletter") === "on";
  await db.user.update({ where: { id: u.id }, data: { newsletter: on } });
  if (on) await db.newsletterSubscriber.upsert({ where: { email: u.email }, update: {}, create: { email: u.email } });
  else await db.newsletterSubscriber.deleteMany({ where: { email: u.email } });
  revalidatePath("/account/settings");
}

export async function readNotificationsAction() {
  const u = await me();
  await db.notification.updateMany({ where: { userId: u.id, readAt: null }, data: { readAt: new Date() } });
  revalidatePath("/account", "layout");
}

/** DSGVO: Konto löschen. Bestellungen bleiben (gesetzliche Aufbewahrung), verlieren aber die Kontoverknüpfung. */
export async function deleteAccountAction(_: FormState, form: FormData): Promise<FormState> {
  const u = await me();
  if (u.role === "ADMIN") return { error: "Administrator-Konten können hier nicht gelöscht werden." };
  if (!(await verifyPassword(fd(form, "password"), u.passwordHash))) return { error: "Das Passwort ist falsch." };
  await audit(u.id, "account.deleted", "User", u.id);
  await db.newsletterSubscriber.deleteMany({ where: { email: u.email } });
  await destroySession();
  await db.user.delete({ where: { id: u.id } });
  redirect("/?konto=geloescht");
}
