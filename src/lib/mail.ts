import { appUrl, shopName } from "./env";

type Mail = { to: string; subject: string; text: string; html?: string };

/**
 * Versand über die Resend-HTTP-API (RESEND_API_KEY). Ohne Key wird die Mail in die Server-Konsole
 * geschrieben – so ist der Passwort-Reset-Flow lokal ohne Mailserver testbar.
 */
export async function sendMail(mail: Mail): Promise<void> {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    console.info(`\n──── MAIL (kein RESEND_API_KEY – nicht versendet) ────\nAn: ${mail.to}\nBetreff: ${mail.subject}\n\n${mail.text}\n────────────────────────────────────────────────────\n`);
    return;
  }
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: process.env.MAIL_FROM || `${shopName()} <shop@example.com>`,
      to: [mail.to],
      subject: mail.subject,
      text: mail.text,
      html: mail.html ?? layout(mail.subject, mail.text),
    }),
  });
  if (!res.ok) console.error("[mail] Versand fehlgeschlagen", res.status, await res.text().catch(() => ""));
}

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]!));

function layout(title: string, text: string) {
  const body = esc(text).replace(/\n/g, "<br>").replace(/(https?:\/\/[^\s<]+)/g, '<a href="$1" style="color:#DCAFC0">$1</a>');
  return `<!doctype html><html><body style="margin:0;background:#0B090B;font-family:-apple-system,Segoe UI,Inter,sans-serif;color:#F6EEF2">
<div style="max-width:560px;margin:0 auto;padding:40px 28px">
<div style="font-family:Georgia,'Times New Roman',serif;letter-spacing:-.01em;font-weight:700;font-size:24px;color:#DCAFC0">${esc(shopName())}</div>
<h1 style="font-size:26px;letter-spacing:-.03em;margin:28px 0 16px">${esc(title)}</h1>
<div style="font-size:15px;line-height:1.65;color:#F6EEF2cc">${body}</div>
<div style="margin-top:36px;padding-top:20px;border-top:1px solid #4B2237;font-size:12px;color:#F6EEF299">${esc(shopName())} · ${appUrl()}</div>
</div></body></html>`;
}

export const mails = {
  passwordReset: (url: string) => ({
    subject: "Passwort zurücksetzen",
    text: `Du hast das Zurücksetzen deines Passworts angefordert.\n\nDieser Link ist 60 Minuten gültig:\n${url}\n\nWenn du das nicht warst, kannst du diese E-Mail ignorieren.`,
  }),
  welcome: (name: string) => ({
    subject: `Willkommen bei ${shopName()}`,
    text: `Hallo ${name},\n\nschön, dass du da bist. Dein Konto ist eingerichtet – Bestellungen, Wunschliste und Adressen findest du jederzeit unter ${appUrl()}/account.`,
  }),
  orderPaid: (o: { number: number; total: string; url: string }) => ({
    subject: `Deine Bestellung #${o.number}`,
    text: `Vielen Dank für deine Bestellung #${o.number} (${o.total}).\n\nWir haben deine Zahlung erhalten und bereiten den Versand vor. Status und Rechnung findest du hier:\n${o.url}`,
  }),
  orderPlacedBankTransfer: (o: { number: number; total: string; url: string; bank: string }) => ({
    subject: `Bestellung #${o.number} – Zahlung per Vorkasse`,
    text: `Vielen Dank für deine Bestellung #${o.number}.\n\nBitte überweise ${o.total} auf folgendes Konto:\n${o.bank}\nVerwendungszweck: Bestellung ${o.number}\n\nSobald das Geld eingegangen ist, versenden wir deine Bestellung.\n${o.url}`,
  }),
  orderShipped: (o: { number: number; carrier: string; tracking?: string | null; trackingUrl?: string | null; url: string }) => ({
    subject: `Deine Bestellung #${o.number} ist unterwegs`,
    text: `Gute Nachrichten – deine Bestellung #${o.number} wurde mit ${o.carrier} versendet.${o.tracking ? `\nSendungsnummer: ${o.tracking}` : ""}${o.trackingUrl ? `\nTracking: ${o.trackingUrl}` : ""}\n\nAlle Details: ${o.url}`,
  }),
};
