import { db } from "./db";
import { sendMail } from "./mail";

/** In-App-Benachrichtigung (für registrierte Kunden) + optional E-Mail. */
export async function notify(opts: {
  userId?: string | null;
  email?: string;
  type: string;
  title: string;
  body: string;
  href?: string;
  mail?: { subject: string; text: string };
}) {
  if (opts.userId) {
    await db.notification.create({
      data: { userId: opts.userId, type: opts.type, title: opts.title, body: opts.body, href: opts.href },
    });
  }
  if (opts.mail && opts.email) {
    try { await sendMail({ to: opts.email, ...opts.mail }); } catch (e) { console.error("[notify] mail", e); }
  }
}
