import { PDFDocument, StandardFonts, rgb, type PDFFont } from "pdf-lib";
import { db } from "./db";
import { formatEUR } from "./money";
import { getSettings } from "./settings";
import { saveFile, DOC_MIMES } from "./storage";
import { methodLabel } from "./shipping";

const nextNumber = async (name: string) => {
  const row = await db.sequence.upsert({
    where: { name }, update: { value: { increment: 1 } }, create: { name, value: 1 },
  });
  return row.value;
};

/** WinAnsi-sicher (Standard-Schriften): unbekannte Zeichen ersetzen. */
const safe = (s: string) => s.replace(/[^ -ÿ€–—„“”‚‘’•]/g, "?");

/** Erzeugt (einmalig, idempotent) die Rechnung als PDF und legt sie im privaten Storage ab. */
export async function ensureInvoice(orderId: string) {
  const order = await db.order.findUnique({
    where: { id: orderId },
    include: { items: true, billingAddress: true, shippingAddress: true, payments: true },
  });
  if (!order) throw new Error("Bestellung nicht gefunden");
  if (order.invoiceFileId) return order.invoiceFileId;

  const s = await getSettings();
  const year = (order.paidAt ?? order.placedAt).getFullYear();
  const invoiceNumber = `RE-${year}-${String(await nextNumber(`invoice-${year}`)).padStart(6, "0")}`;

  const pdf = await PDFDocument.create();
  const page = pdf.addPage([595.28, 841.89]);
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const ink = rgb(0.06, 0.04, 0.06), muted = rgb(0.4, 0.35, 0.38), accent = rgb(0.66, 0.36, 0.49);
  const M = 56, W = 595.28 - M * 2;

  const text = (t: string, x: number, y: number, size = 10, f: PDFFont = font, color = ink) =>
    page.drawText(safe(t), { x, y, size, font: f, color });
  const right = (t: string, xRight: number, y: number, size = 10, f: PDFFont = font, color = ink) =>
    page.drawText(safe(t), { x: xRight - f.widthOfTextAtSize(safe(t), size), y, size, font: f, color });
  const fit = (t: string, max: number, size: number, f: PDFFont) => {
    let out = safe(t);
    while (out.length > 4 && f.widthOfTextAtSize(out, size) > max) out = out.slice(0, -2);
    return out === safe(t) ? out : out.trimEnd() + "…";
  };

  text(s.shopName.toUpperCase(), M, 790, 16, bold, accent);
  text("RECHNUNG", 595.28 - M - bold.widthOfTextAtSize("RECHNUNG", 20), 788, 20, bold);
  page.drawLine({ start: { x: M, y: 772 }, end: { x: M + W, y: 772 }, thickness: 0.6, color: rgb(0.85, 0.8, 0.83) });

  text(`${s.legalName} · ${s.street} · ${s.postalCode} ${s.city}`, M, 744, 7, font, muted);
  const b = order.billingAddress;
  let y = 726;
  for (const line of [b.company, `${b.firstName} ${b.lastName}`, b.line1, b.line2, `${b.postalCode} ${b.city}`, b.country === "DE" ? "Deutschland" : "Österreich"].filter(Boolean) as string[]) {
    text(line, M, y, 10.5); y -= 14;
  }

  const meta: [string, string][] = [
    ["Rechnungsnummer", invoiceNumber],
    ["Rechnungsdatum", (order.paidAt ?? new Date()).toLocaleDateString("de-DE")],
    ["Bestellnummer", `#${order.number}`],
    ["Bestelldatum", order.placedAt.toLocaleDateString("de-DE")],
  ];
  let my = 726;
  for (const [k, v] of meta) { text(k, 350, my, 9, font, muted); right(v, M + W, my, 10, bold); my -= 15; }

  // Positionen
  let ty = 610;
  page.drawRectangle({ x: M, y: ty - 6, width: W, height: 22, color: rgb(0.95, 0.92, 0.94) });
  text("Artikel", M + 8, ty, 9, bold); text("Menge", 350, ty, 9, bold);
  right("Einzelpreis", 470, ty, 9, bold); right("Gesamt", M + W - 8, ty, 9, bold);
  ty -= 24;
  for (const it of order.items) {
    text(fit(it.name, 270, 10, bold), M + 8, ty, 10, bold);
    text(fit(`${it.variantLabel} · Art.-Nr. ${it.sku}`, 270, 8, font), M + 8, ty - 11, 8, font, muted);
    text(String(it.quantity), 358, ty, 10);
    right(formatEUR(it.unitPriceCents), 470, ty); right(formatEUR(it.totalCents), M + W - 8, ty);
    ty -= 32;
    page.drawLine({ start: { x: M, y: ty + 18 }, end: { x: M + W, y: ty + 18 }, thickness: 0.4, color: rgb(0.9, 0.87, 0.89) });
  }

  ty -= 6;
  const row = (label: string, value: string, strong = false) => {
    right(label, 470, ty, strong ? 11 : 10, strong ? bold : font, strong ? ink : muted);
    right(value, M + W - 8, ty, strong ? 11 : 10, strong ? bold : font);
    ty -= strong ? 20 : 15;
  };
  row("Zwischensumme", formatEUR(order.subtotalCents));
  if (order.discountCents > 0) row(`Rabatt${order.couponCode ? ` (${order.couponCode})` : ""}`, `− ${formatEUR(order.discountCents)}`);
  row(`Versand (${methodLabel(order.shippingMethod)})`, formatEUR(order.shippingCents));
  page.drawLine({ start: { x: 340, y: ty + 10 }, end: { x: M + W, y: ty + 10 }, thickness: 0.6, color: ink });
  ty -= 4;
  row("Gesamtbetrag (brutto)", formatEUR(order.totalCents), true);
  row(`darin enthaltene MwSt. ${s.taxRatePercent} %`, formatEUR(order.taxCents));

  ty -= 16;
  const provider = order.payments[0]?.provider;
  text(`Zahlungsart: ${provider === "STRIPE" ? "Stripe (Karte / Wallet)" : provider === "PAYPAL" ? "PayPal" : provider === "BANK_TRANSFER" ? "Vorkasse / Überweisung" : "Testzahlung"}`, M, ty, 9, font, muted);
  text("Der Rechnungsbetrag wurde beglichen. Leistungsdatum entspricht dem Rechnungsdatum.", M, ty - 13, 9, font, muted);

  const foot = [
    `${s.legalName}${s.legalForm ? ` (${s.legalForm})` : ""} · ${s.street} · ${s.postalCode} ${s.city}`,
    [s.vatId && `USt-IdNr.: ${s.vatId}`, s.registerCourt && `${s.registerCourt} ${s.registerNumber}`, s.email].filter(Boolean).join(" · "),
  ];
  page.drawLine({ start: { x: M, y: 70 }, end: { x: M + W, y: 70 }, thickness: 0.4, color: rgb(0.85, 0.8, 0.83) });
  foot.forEach((l, i) => text(l, M, 56 - i * 11, 7.5, font, muted));

  const bytes = Buffer.from(await pdf.save());
  const file = await saveFile({
    data: bytes, filename: `Rechnung-${invoiceNumber}.pdf`, kind: "INVOICE", visibility: "PRIVATE",
    allow: DOC_MIMES, maxBytes: 5 * 1048576,
  });
  await db.order.update({ where: { id: order.id }, data: { invoiceNumber, invoiceFileId: file.id } });
  return file.id;
}
