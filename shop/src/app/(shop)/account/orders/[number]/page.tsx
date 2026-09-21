import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth/guards";
import { formatEUR } from "@/lib/money";
import { methodLabel } from "@/lib/shipping";
import { StatusPill, StatusTimeline } from "@/components/account/bits";

export const dynamic = "force-dynamic";
export const metadata = { title: "Bestellung" };

export default async function OrderDetail({ params }: { params: Promise<{ number: string }> }) {
  const user = await requireUser();
  const number = parseInt((await params).number, 10);
  if (!Number.isFinite(number)) notFound();
  const o = await db.order.findFirst({
    where: { number, userId: user.id },
    include: { items: { include: { product: { select: { slug: true } } } }, payments: true, shipments: true, shippingAddress: true, billingAddress: true },
  });
  if (!o) notFound();
  const pay = o.payments[0];
  const payLabel = pay?.provider === "STRIPE" ? "Karte / Wallet (Stripe)" : pay?.provider === "PAYPAL" ? "PayPal" : pay?.provider === "BANK_TRANSFER" ? "Vorkasse / Überweisung" : "Testzahlung";
  const canReview = ["SHIPPED", "DELIVERED"].includes(o.status);
  const Addr = ({ a, title }: { a: typeof o.shippingAddress; title: string }) => (
    <div><p className="eyebrow mb-3 !text-cream/45">{title}</p><address className="text-[14.5px] not-italic leading-relaxed text-cream/75">{a.company && <>{a.company}<br /></>}{a.firstName} {a.lastName}<br />{a.line1}<br />{a.line2 && <>{a.line2}<br /></>}{a.postalCode} {a.city}<br />{a.country === "DE" ? "Deutschland" : "Österreich"}</address></div>
  );

  return (
    <>
      <Link href="/account/orders" className="text-[13.5px] text-cream/55 underline-offset-4 hover:text-cream hover:underline">← Alle Bestellungen</Link>
      <div className="mb-8 mt-5 flex flex-wrap items-end justify-between gap-4">
        <div><h1 className="h-lg !text-[clamp(2.2rem,4.5vw,3.4rem)]">Bestellung #{o.number}</h1><p className="mt-2 text-cream/55">{o.placedAt.toLocaleDateString("de-DE", { dateStyle: "long" })}</p></div>
        <StatusPill status={o.status} />
      </div>

      <section className="panel mb-6 p-6"><StatusTimeline status={o.status} />
        {o.status === "NEW" && pay?.provider === "BANK_TRANSFER" && <p className="mt-5 rounded-xl bg-rose-500/10 p-4 text-[14px] text-rose-300">Bitte überweise {formatEUR(o.totalCents)} mit dem Verwendungszweck „Bestellung {o.number}“. Nach Zahlungseingang versenden wir deine Bestellung.</p>}
        {o.shipments.map((s) => (
          <div key={s.id} className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-5">
            <div><p className="text-[14px] font-medium">Versand mit {s.carrier}</p><p className="text-[13px] text-cream/50">{s.trackingNumber ? `Sendungsnummer ${s.trackingNumber}` : "Ohne Sendungsnummer"}{s.shippedAt ? ` · versendet am ${s.shippedAt.toLocaleDateString("de-DE")}` : ""}</p></div>
            {s.trackingUrl && /^https?:\/\//.test(s.trackingUrl) && <a href={s.trackingUrl} target="_blank" rel="noopener noreferrer" className="btn-ghost btn-sm">Sendung verfolgen</a>}
          </div>
        ))}
      </section>

      <section className="panel mb-6 divide-y divide-white/[0.07]">
        {o.items.map((it) => (
          <div key={it.id} className="flex gap-4 p-5">
            <div className="relative h-[104px] w-[82px] shrink-0 overflow-hidden rounded-xl bg-plum-900">{it.imageUrl && <Image src={it.imageUrl} alt="" fill sizes="82px" className="object-cover" />}</div>
            <div className="min-w-0 flex-1">
              <p className="font-medium tracking-tight">{it.product ? <Link href={`/product/${it.product.slug}`} className="hover:text-rose-300">{it.name}</Link> : it.name}</p>
              <p className="mt-1 text-[13px] text-cream/50">{it.variantLabel} · Art.-Nr. {it.sku}</p>
              <p className="mt-1 text-[13px] text-cream/50">{it.quantity} × {formatEUR(it.unitPriceCents)}</p>
              {canReview && it.product && <Link href={`/product/${it.product.slug}#bewertungen`} className="mt-2 inline-block text-[13px] text-rose-300 underline underline-offset-4">Produkt bewerten</Link>}
            </div>
            <p className="font-medium tabular-nums">{formatEUR(it.totalCents)}</p>
          </div>
        ))}
      </section>

      <div className="grid gap-6 md:grid-cols-2">
        <section className="panel grid gap-8 p-6 sm:grid-cols-2 md:grid-cols-1 lg:grid-cols-2"><Addr a={o.shippingAddress} title="Lieferadresse" /><Addr a={o.billingAddress} title="Rechnungsadresse" /></section>
        <section className="panel p-6">
          <p className="eyebrow mb-4 !text-cream/45">Zusammenfassung</p>
          <dl className="space-y-2 text-[14.5px]">
            <div className="flex justify-between"><dt className="text-cream/60">Zwischensumme</dt><dd className="tabular-nums">{formatEUR(o.subtotalCents)}</dd></div>
            {o.discountCents > 0 && <div className="flex justify-between text-rose-300"><dt>Rabatt {o.couponCode && `(${o.couponCode})`}</dt><dd className="tabular-nums">−{formatEUR(o.discountCents)}</dd></div>}
            <div className="flex justify-between"><dt className="text-cream/60">Versand ({methodLabel(o.shippingMethod)})</dt><dd className="tabular-nums">{o.shippingCents ? formatEUR(o.shippingCents) : "Kostenlos"}</dd></div>
            <div className="flex justify-between border-t border-white/10 pt-3 text-[17px] font-semibold"><dt>Gesamt</dt><dd className="tabular-nums">{formatEUR(o.totalCents)}</dd></div>
            <p className="text-[12px] text-cream/40">inkl. {formatEUR(o.taxCents)} MwSt.</p>
          </dl>
          <p className="mt-5 border-t border-white/10 pt-4 text-[13.5px] text-cream/55">Zahlung: {payLabel} · {pay?.status === "PAID" ? "bezahlt" : pay?.status === "REFUNDED" ? "erstattet" : "offen"}</p>
          {o.invoiceFileId && <a href={`/api/files/${o.invoiceFileId}`} target="_blank" rel="noopener" className="btn-ghost btn-sm mt-5">Rechnung {o.invoiceNumber} (PDF)</a>}
        </section>
      </div>
    </>
  );
}
