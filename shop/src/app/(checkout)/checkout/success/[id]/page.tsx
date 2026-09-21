import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getOrderForViewer } from "@/lib/order-access";
import { getSettings } from "@/lib/settings";
import { formatEUR } from "@/lib/money";
import { methodLabel } from "@/lib/shipping";
import { VerifyPayment } from "@/components/checkout/VerifyPayment";

export const metadata: Metadata = { title: "Bestellbestätigung", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function SuccessPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ t?: string; redirect_status?: string }> }) {
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  const o = await getOrderForViewer(id, sp.t);
  if (!o) notFound();
  const s = await getSettings();
  const pay = o.payments[0];
  const paid = o.status !== "NEW" && o.status !== "CANCELLED";
  const failed = sp.redirect_status === "failed" || o.status === "CANCELLED";
  const awaitingStripe = o.status === "NEW" && pay?.provider === "STRIPE" && !failed;
  const bank = pay?.provider === "BANK_TRANSFER" && o.status === "NEW";

  return (
    <div className="container-x max-w-[960px] pb-20 pt-14 md:pt-20">
      <VerifyPayment orderId={o.id} token={sp.t} pending={awaitingStripe} />
      <div className="text-center">
        <div className={`mx-auto mb-8 flex h-20 w-20 items-center justify-center rounded-full ${failed ? "bg-[#f0a3b9]/15" : "bg-rose-500/15"}`}>
          <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke={failed ? "#f0a3b9" : "#DCAFC0"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">{failed ? <path d="M6 6l12 12M18 6 6 18" /> : <path d="m5 12.5 4.500 4.500L19 7.500" style={{ strokeDasharray: 30, animation: "draw .9s .2s var(--ease) both" }} />}</svg>
        </div>
        <p className="eyebrow mb-4">{failed ? "Zahlung" : "Bestätigung"}</p>
        <h1 className="h-lg mb-5 whitespace-pre-line">{failed ? "Zahlung nicht\nabgeschlossen." : bank ? "Danke für\ndeine Bestellung." : awaitingStripe ? "Zahlung wird\nbestätigt …" : "Vielen Dank,\ndeine Bestellung ist da."}</h1>
        <p className="mx-auto max-w-[520px] text-[16px] text-cream/60">
          {failed ? <>Deine Zahlung wurde nicht abgeschlossen. <Link href="/checkout" className="underline underline-offset-4">Zurück zur Kasse</Link></> : <>Bestellung <b className="font-medium text-cream">#{o.number}</b> · Eine Bestätigung senden wir an <b className="font-medium text-cream">{o.email}</b>.</>}
        </p>
      </div>

      {bank && (
        <div className="mx-auto mt-10 max-w-[560px] rounded-3xl border border-rose-300/30 bg-rose-500/[0.07] p-6 text-[14.5px]">
          <p className="mb-3 font-medium text-rose-300">Bitte überweise {formatEUR(o.totalCents)}</p>
          <dl className="space-y-1.5 text-cream/80">
            {s.bankHolder && <div className="flex justify-between gap-4"><dt className="text-cream/50">Kontoinhaber</dt><dd>{s.bankHolder}</dd></div>}
            {s.bankIban ? <div className="flex justify-between gap-4"><dt className="text-cream/50">IBAN</dt><dd className="font-mono">{s.bankIban}</dd></div> : <p className="text-cream/60">Die Bankverbindung senden wir dir per E-Mail.</p>}
            {s.bankBic && <div className="flex justify-between gap-4"><dt className="text-cream/50">BIC</dt><dd className="font-mono">{s.bankBic}</dd></div>}
            <div className="flex justify-between gap-4"><dt className="text-cream/50">Verwendungszweck</dt><dd>Bestellung {o.number}</dd></div>
          </dl>
        </div>
      )}

      <div className="mt-14 grid gap-6 md:grid-cols-[1.4fr_1fr]">
        <section className="panel divide-y divide-white/[0.07]" aria-label="Artikel">
          {o.items.map((it) => (
            <div key={it.id} className="flex gap-4 p-5">
              <div className="relative h-[92px] w-[72px] shrink-0 overflow-hidden rounded-xl bg-plum-900">{it.imageUrl && <Image src={it.imageUrl} alt="" fill sizes="72px" className="object-cover" />}</div>
              <div className="min-w-0 flex-1"><p className="font-medium tracking-tight">{it.name}</p><p className="mt-1 text-[13px] text-cream/50">{it.variantLabel}</p><p className="text-[13px] text-cream/50">Menge {it.quantity}</p></div>
              <p className="tabular-nums">{formatEUR(it.totalCents)}</p>
            </div>
          ))}
        </section>
        <section className="panel p-6">
          <dl className="space-y-2 text-[14.5px]">
            <div className="flex justify-between"><dt className="text-cream/60">Zwischensumme</dt><dd className="tabular-nums">{formatEUR(o.subtotalCents)}</dd></div>
            {o.discountCents > 0 && <div className="flex justify-between text-rose-300"><dt>Rabatt</dt><dd className="tabular-nums">−{formatEUR(o.discountCents)}</dd></div>}
            <div className="flex justify-between"><dt className="text-cream/60">Versand ({methodLabel(o.shippingMethod)})</dt><dd className="tabular-nums">{o.shippingCents ? formatEUR(o.shippingCents) : "Kostenlos"}</dd></div>
            <div className="flex justify-between text-cream/50"><dt>enthaltene MwSt.</dt><dd className="tabular-nums">{formatEUR(o.taxCents)}</dd></div>
            <div className="flex justify-between border-t border-white/10 pt-3 text-[17px] font-semibold"><dt>Gesamt</dt><dd className="tabular-nums">{formatEUR(o.totalCents)}</dd></div>
          </dl>
          <address className="mt-6 border-t border-white/10 pt-5 text-[14px] not-italic leading-relaxed text-cream/65"><span className="eyebrow mb-2 block !text-cream/45">Lieferung an</span>{o.shippingAddress.firstName} {o.shippingAddress.lastName}<br />{o.shippingAddress.line1}<br />{o.shippingAddress.postalCode} {o.shippingAddress.city}</address>
          {paid && o.invoiceFileId && <a href={`/api/files/${o.invoiceFileId}?t=${o.guestToken}`} target="_blank" rel="noopener" className="btn-ghost btn-sm mt-5 w-full">Rechnung herunterladen</a>}
        </section>
      </div>

      <div className="mt-12 flex flex-wrap justify-center gap-3">
        <Link href="/shop" className="btn-primary">Weiter shoppen</Link>
        {o.userId && <Link href={`/account/orders/${o.number}`} className="btn-ghost">Bestellung ansehen</Link>}
        {!o.userId && <Link href={`/register`} className="btn-ghost">Konto erstellen</Link>}
      </div>
      <style>{`@keyframes draw{from{stroke-dashoffset:30}to{stroke-dashoffset:0}}`}</style>
    </div>
  );
}
