"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { appUrl } from "@/lib/env";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { hashPassword, verifyPassword, passwordProblem, randomToken, sha256 } from "@/lib/auth/password";
import { createSession, destroySession, destroyAllSessions } from "@/lib/auth/session";
import { mergeGuestData } from "@/lib/cart";
import { emailSchema, registerSchema, fd } from "@/lib/validation";
import { sendMail, mails } from "@/lib/mail";
import { audit } from "@/lib/audit";
import type { FormState } from "@/components/ui/Form";

const safeNext = (n: string) => (n.startsWith("/") && !n.startsWith("//") && !n.startsWith("/\\") ? n : "/account");

// Dummy-Hash: gleicher Rechenaufwand, auch wenn die E-Mail unbekannt ist (kein Timing-Orakel)
let dummy: Promise<string> | null = null;
const dummyHash = () => (dummy ??= hashPassword("dummy-password-for-timing-1"));

export async function loginAction(_: FormState, form: FormData): Promise<FormState> {
  const ip = clientIp(await headers());
  const email = fd(form, "email").trim().toLowerCase();
  const password = fd(form, "password");
  const next = safeNext(fd(form, "next"));

  const a = await rateLimit(`login-ip:${ip}`, 20, 15 * 60_000);
  const b = await rateLimit(`login-mail:${email}`, 8, 15 * 60_000);
  const values = { email };
  if (!a.ok || !b.ok) return { error: "Zu viele Anmeldeversuche. Bitte versuche es in einigen Minuten erneut.", values };
  if (!email || !password) return { error: "Bitte E-Mail und Passwort eingeben.", values };

  const user = await db.user.findUnique({ where: { email } });
  const valid = await verifyPassword(password, user?.passwordHash ?? (await dummyHash()));
  if (!user || !valid || user.disabledAt) {
    await audit(user?.id ?? null, "auth.login_failed", "User", user?.id ?? null, { email });
    return { error: "E-Mail oder Passwort ist falsch.", values };
  }
  await createSession(user.id);
  await mergeGuestData(user.id);
  await audit(user.id, "auth.login", "User", user.id);
  redirect(user.role === "ADMIN" && next === "/account" ? "/admin" : next);
}

export async function registerAction(_: FormState, form: FormData): Promise<FormState> {
  const ip = clientIp(await headers());
  const values = { firstName: fd(form, "firstName"), lastName: fd(form, "lastName"), email: fd(form, "email") };
  if (!(await rateLimit(`register:${ip}`, 8, 60 * 60_000)).ok) return { error: "Zu viele Registrierungen. Bitte versuche es später erneut.", values };

  const parsed = registerSchema.safeParse({
    firstName: fd(form, "firstName"), lastName: fd(form, "lastName"), email: fd(form, "email"),
    password: fd(form, "password"), newsletter: form.get("newsletter") === "on",
  });
  if (!parsed.success) {
    const fe: Record<string, string> = {};
    parsed.error.issues.forEach((i) => (fe[String(i.path[0])] ??= i.message));
    return { error: "Bitte prüfe deine Eingaben.", fieldErrors: fe, values };
  }
  const { firstName, lastName, email, password, newsletter } = parsed.data;
  const problem = passwordProblem(password);
  if (problem) return { fieldErrors: { password: problem }, error: "Bitte prüfe deine Eingaben.", values };
  if (password !== fd(form, "password2")) return { fieldErrors: { password2: "Die Passwörter stimmen nicht überein." }, error: "Bitte prüfe deine Eingaben.", values };
  if (form.get("terms") !== "on") return { fieldErrors: { terms: "Bitte bestätige die Datenschutzerklärung." }, error: "Bitte prüfe deine Eingaben.", values };

  if (await db.user.findUnique({ where: { email } })) return { fieldErrors: { email: "Zu dieser E-Mail existiert bereits ein Konto." }, error: "Bitte prüfe deine Eingaben.", values };

  const user = await db.user.create({
    data: { email, firstName, lastName, passwordHash: await hashPassword(password), newsletter: !!newsletter },
  });
  if (newsletter) await db.newsletterSubscriber.upsert({ where: { email }, update: {}, create: { email } });
  await createSession(user.id);
  await mergeGuestData(user.id);
  await audit(user.id, "auth.register", "User", user.id);
  void sendMail({ to: email, ...mails.welcome(firstName) }).catch(() => {});
  redirect(safeNext(fd(form, "next")));
}

export async function logoutAction() {
  await destroySession();
  redirect("/");
}

export async function forgotPasswordAction(_: FormState, form: FormData): Promise<FormState> {
  const ip = clientIp(await headers());
  const parsed = emailSchema.safeParse(fd(form, "email"));
  if (!(await rateLimit(`forgot-ip:${ip}`, 6, 60 * 60_000)).ok) return { error: "Zu viele Anfragen. Bitte versuche es später erneut." };
  if (!parsed.success) return { error: "Bitte gib eine gültige E-Mail-Adresse ein.", values: { email: fd(form, "email") } };
  if (!(await rateLimit(`forgot-mail:${parsed.data}`, 3, 60 * 60_000)).ok) return { ok: "Falls ein Konto existiert, haben wir dir einen Link geschickt." };

  const user = await db.user.findUnique({ where: { email: parsed.data } });
  if (user && !user.disabledAt) {
    const token = randomToken(32);
    await db.passwordResetToken.create({ data: { userId: user.id, tokenHash: sha256(token), expiresAt: new Date(Date.now() + 60 * 60_000) } });
    await sendMail({ to: user.email, ...mails.passwordReset(`${appUrl()}/reset-password?token=${token}`) });
    await audit(user.id, "auth.reset_requested", "User", user.id);
  }
  // Gleiche Antwort in jedem Fall (keine Account-Enumeration)
  return { ok: "Falls ein Konto zu dieser Adresse existiert, haben wir dir einen Link zum Zurücksetzen geschickt." };
}

export async function resetPasswordAction(_: FormState, form: FormData): Promise<FormState> {
  const token = fd(form, "token");
  const password = fd(form, "password");
  if (!(await rateLimit(`reset:${clientIp(await headers())}`, 10, 60 * 60_000)).ok) return { error: "Zu viele Versuche." };
  const problem = passwordProblem(password);
  if (problem) return { fieldErrors: { password: problem }, error: "Bitte prüfe deine Eingaben." };
  if (password !== fd(form, "password2")) return { fieldErrors: { password2: "Die Passwörter stimmen nicht überein." }, error: "Bitte prüfe deine Eingaben." };

  const rec = await db.passwordResetToken.findUnique({ where: { tokenHash: sha256(token) } });
  if (!rec || rec.usedAt || rec.expiresAt < new Date()) return { error: "Dieser Link ist ungültig oder abgelaufen. Bitte fordere einen neuen an." };

  await db.$transaction([
    db.user.update({ where: { id: rec.userId }, data: { passwordHash: await hashPassword(password) } }),
    db.passwordResetToken.update({ where: { id: rec.id }, data: { usedAt: new Date() } }),
  ]);
  await destroyAllSessions(rec.userId); // alle bestehenden Sitzungen beenden
  await audit(rec.userId, "auth.password_reset", "User", rec.userId);
  redirect("/login?reset=1");
}
