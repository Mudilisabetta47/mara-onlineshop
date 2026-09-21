import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { formatEUR } from "@/lib/money";
import { methodLabel } from "@/lib/shipping";
import { NEXT_STATUS, ORDER_STATUS_LABEL } from "@/lib/orders";
import { Badge, Card, Lbl, PageHead, fieldCls } from "@/components/admin/ui";
import { ActionForm, GhostSubmit, Submit } from "@/components/admin/ActionForm";
import { orderAction } from "../../actions";

export const metadata = { title: "Bestellung" };

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const o = await db.order.findUnique({ where: { id: (await params).id }, include: { items: true, payments: true, shipments: true, shippingAddress: true, billingAddress: true, user: { select: { id: true, email: true } } } });
  if (!o) notFound();
  const logs = await db.auditLog.findMany({ where: { entity: "Order", entityId: o.id }, orderBy: { createdAt: "desc" }, take: 20, include: { actor: { select: { email: true } } } });
  const pay = o.payments[0];
  const next = NEXT_STATUS[o.status];
  const can = (s: string) => next.includes(s as never);
  const Addr = ({ a, t }: { a: typeof o.shippingAddress; t: string }) => <div><p className="mb-2 text-[11.5px] uppercase tracking-wider text-cream/40">{t}</p><address className="text-[13.5px] not-italic leading-relaxed text-cream/75">{a.company && <>{a.company}<br /></>}{a.firstName} {a.lastName}<br />{a.line1}{a.line2 && <>, {a.line2}</>}<br />{a.postalCode} {a.city}, {a.country}{a.phone && <><br />☎ {a.phone}</>}</address></div>;
  const hidden = <input type="hidden" name="id" value={o.id} />;

  return (
    <>
      <PageHead title={`Bestellung #${o.number}`} sub={`${o.placedAt.toLocaleString("de-DE")} · ${o.email}${o.user ? "" : " · Gast"}`} actions={<Badge tone={o.status === "PAID" ? "rose" : o.status === "CANCELLED" || o.status === "REFUNDED" ? "bad" : "neutral"}>{ORDER_STATUS_LABEL[o.status]}</Badge>} />
      <div className="grid gap-5 xl:grid-cols-[2fr_1fr]">
        <div className="space-y-5">
          <Card title="Produkte">
            <ul className="divide-y divide-white/[0.06]">{o.items.map((i) => (
              <li key={i.id} className="flex items-center gap-4 py-3.5 first:pt-0 last:pb-0">
                <div className="relative h-[60px] w-[48px] shrink-0 overflow-hidden rounded-lg bg-plum-900">{i.imageUrl && <Image src={i.imageUrl} alt="" fill sizes="48px" className="object-cover" />}</div>
                <div className="min-w-0 flex-1"><p className="font-medium">{i.name}</p><p className="text-[12.5px] text-cream/45">{i.variantLabel} · {i.sku}</p></div>
                <p className="text-[13px] text-cream/60">{i.quantity} × {formatEUR(i.unitPriceCents)}</p><p className="w-[90px] text-right tabular-nums">{formatEUR(i.totalCents)}</p>
              </li>))}</ul>
            <dl className="mt-5 space-y-1.5 border-t border-white/[0.07] pt-4 text-[13.5px]">
              <div className="flex justify-between"><dt className="text-cream/55">Zwischensumme</dt><dd className="tabular-nums">{formatEUR(o.subtotalCents)}</dd></div>
              {o.discountCents > 0 && <div className="flex justify-between text-rose-300"><dt>Rabatt {o.couponCode}</dt><dd className="tabular-nums">−{formatEUR(o.discountCents)}</dd></div>}
              <div className="flex justify-between"><dt className="text-cream/55">Versand ({methodLabel(o.shippingMethod)})</dt><dd className="tabular-nums">{formatEUR(o.shippingCents)}</dd></div>
              <div className="flex justify-between text-cream/45"><dt>enthaltene MwSt.</dt><dd className="tabular-nums">{formatEUR(o.taxCents)}</dd></div>
              <div className="flex justify-between border-t border-white/[0.07] pt-3 text-[16px] font-semibold"><dt>Gesamtsumme</dt><dd className="tabular-nums">{formatEUR(o.totalCents)}</dd></div>
            </dl>
          </Card>
          <Card title="Adressen"><div className="grid gap-6 sm:grid-cols-2"><Addr a={o.shippingAddress} t="Lieferadresse" /><Addr a={o.billingAddress} t="Rechnungsadresse" /></div>{o.customerNote && <p className="mt-5 rounded-xl bg-white/[0.04] p-3.5 text-[13.5px]"><span className="text-cream/45">Kundenhinweis: </span>{o.customerNote}</p>}</Card>
          <Card title="Verlauf">{logs.length === 0 ? <p className="text-[13.5px] text-cream/45">Keine Admin-Aktionen.</p> : <ul className="space-y-2 text-[13px]">{logs.map((l) => <li key={l.id} className="flex justify-between gap-3"><span>{l.action} <span className="text-cream/40">· {l.actor?.email}</span></span><time className="text-cream/40">{l.createdAt.toLocaleString("de-DE")}</time></li>)}</ul>}</Card>
        </div>

        <div className="space-y-5">
          <Card title="Aktionen">
            <div className="space-y-4">
              {o.status === "NEW" && pay?.status !== "PAID" && <ActionForm action={orderAction} confirm="Zahlungseingang bestätigen?">{hidden}<input type="hidden" name="op" value="paid" /><Submit>Als bezahlt markieren</Submit><p className="mt-2 text-[12px] text-cream/40">z. B. für Vorkasse nach Zahlungseingang.</p></ActionForm>}
              {can("PROCESSING") && <ActionForm action={orderAction}>{hidden}<input type="hidden" name="op" value="processing" /><GhostSubmit>In Bearbeitung setzen</GhostSubmit></ActionForm>}
              {(o.status === "PAID" || o.status === "PROCESSING") && (
                <ActionForm action={orderAction} className="space-y-3 rounded-xl border border-white/[0.08] p-4">{hidden}<input type="hidden" name="op" value="ship" />
                  <p className="text-[13px] font-medium">Versenden</p>
                  <Lbl label="Versanddienstleister"><input name="carrier" defaultValue="DHL" className={fieldCls} /></Lbl>
                  <Lbl label="Sendungsnummer"><input name="trackingNumber" className={fieldCls} /></Lbl>
                  <Lbl label="Tracking-URL (optional)"><input name="trackingUrl" className={fieldCls} placeholder="https://…" /></Lbl>
                  <Submit>Als versendet markieren</Submit>
                </ActionForm>
              )}
              {o.status === "SHIPPED" && <ActionForm action={orderAction}>{hidden}<input type="hidden" name="op" value="delivered" /><Submit>Als zugestellt markieren</Submit></ActionForm>}
              {can("REFUNDED") && <ActionForm action={orderAction} confirm={`Bestellung #${o.number} erstatten (${formatEUR(o.totalCents)})? Bei Stripe/PayPal wird die Rückzahlung ausgelöst.`}>{hidden}<input type="hidden" name="op" value="refund" /><Submit danger>Erstatten</Submit></ActionForm>}
              {can("CANCELLED") && pay?.status !== "PAID" && <ActionForm action={orderAction} confirm="Bestellung stornieren? Der Bestand wird freigegeben.">{hidden}<input type="hidden" name="op" value="cancel" /><Submit danger>Stornieren</Submit></ActionForm>}
              {next.length === 0 && <p className="text-[13.5px] text-cream/45">Keine weiteren Aktionen möglich.</p>}
            </div>
          </Card>
          <Card title="Zahlung">
            {o.payments.map((p) => <div key={p.id} className="text-[13.5px]"><div className="flex items-center justify-between"><span>{p.provider}</span><Badge tone={p.status === "PAID" ? "good" : p.status === "FAILED" ? "bad" : p.status === "REFUNDED" ? "warn" : "neutral"}>{p.status}</Badge></div><p className="mt-1 text-cream/45">{formatEUR(p.amountCents)}{p.method ? ` · ${p.method}` : ""}{p.paidAt ? ` · ${p.paidAt.toLocaleString("de-DE")}` : ""}</p>{p.providerRef && <p className="mt-1 break-all font-mono text-[11.5px] text-cream/35">{p.providerRef}</p>}{p.failureReason && <p className="mt-1 text-[12px] text-[#f0a3b9]">{p.failureReason}</p>}</div>)}
          </Card>
          <Card title="Versand & Rechnung">
            {o.shipments.length === 0 ? <p className="text-[13.5px] text-cream/45">Noch nicht versendet.</p> : o.shipments.map((s) => <div key={s.id} className="mb-3 text-[13.5px]"><p>{s.carrier} · {s.status === "DELIVERED" ? "zugestellt" : "versendet"}</p><p className="text-cream/45">{s.trackingNumber ?? "ohne Sendungsnummer"}</p>{s.trackingUrl && <a href={s.trackingUrl} target="_blank" rel="noopener noreferrer" className="text-rose-300 underline underline-offset-4">Tracking ↗</a>}</div>)}
            {o.invoiceFileId ? <a href={`/api/files/${o.invoiceFileId}`} target="_blank" rel="noopener" className="mt-2 inline-block text-[13.5px] text-rose-300 underline underline-offset-4">Rechnung {o.invoiceNumber} (PDF)</a> : <p className="mt-2 text-[12.5px] text-cream/40">Rechnung wird nach Zahlungseingang erzeugt.</p>}
            {o.user && <p className="mt-4 text-[13px]"><Link href={`/admin/customers/${o.user.id}`} className="text-cream/60 underline underline-offset-4 hover:text-cream">Kundenprofil öffnen</Link></p>}
          </Card>
        </div>
      </div>
    </>
  );
}
