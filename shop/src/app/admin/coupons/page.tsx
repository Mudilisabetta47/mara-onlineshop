import { db } from "@/lib/db";
import { centsToInput, formatEUR } from "@/lib/money";
import { Badge, Card, Lbl, PageHead, Table, fieldCls } from "@/components/admin/ui";
import { ActionForm, Submit } from "@/components/admin/ActionForm";
import { deleteCouponAction, saveCouponAction } from "../actions";

export const metadata = { title: "Gutscheine" };
const dateInput = (d: Date | null) => (d ? d.toISOString().slice(0, 10) : "");

type Opt = { id: string; name: string };
function CouponForm({ c, products, categories }: { c?: NonNullable<Awaited<ReturnType<typeof load>>>[number]; products: Opt[]; categories: Opt[] }) {
  return (
    <ActionForm action={saveCouponAction} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {c && <input type="hidden" name="id" value={c.id} />}
      <Lbl label="Code *"><input name="code" defaultValue={c?.code} required placeholder="WELCOME10" className={`${fieldCls} uppercase`} /></Lbl>
      <Lbl label="Art"><select name="type" defaultValue={c?.type ?? "PERCENT"} className={fieldCls}><option value="PERCENT">Prozent (%)</option><option value="FIXED">Festbetrag (€)</option></select></Lbl>
      <Lbl label="Wert *" hint="Prozent: 10 · Festbetrag: 20,00"><input name="value" required defaultValue={c ? (c.type === "PERCENT" ? String(c.value) : centsToInput(c.value)) : ""} className={fieldCls} /></Lbl>
      <Lbl label="Beschreibung" className="lg:col-span-3"><input name="description" defaultValue={c?.description ?? ""} className={fieldCls} /></Lbl>
      <Lbl label="Mindestbestellwert (€)"><input name="minOrder" defaultValue={c?.minOrderCents ? centsToInput(c.minOrderCents) : ""} className={fieldCls} /></Lbl>
      <Lbl label="Max. Verwendungen gesamt"><input name="maxUses" type="number" min={1} defaultValue={c?.maxUses ?? ""} className={fieldCls} /></Lbl>
      <div className="flex flex-col justify-end gap-2 pb-1 text-[13.5px]"><label className="flex items-center gap-3"><input type="checkbox" name="oncePerCustomer" defaultChecked={c?.oncePerCustomer} className="h-4 w-4 accent-[#A95D7C]" /> Pro Kunde nur einmal</label><label className="flex items-center gap-3"><input type="checkbox" name="isActive" defaultChecked={c?.isActive ?? true} className="h-4 w-4 accent-[#A95D7C]" /> Aktiv</label></div>
      <Lbl label="Gültig ab"><input name="validFrom" type="date" defaultValue={dateInput(c?.validFrom ?? null)} className={fieldCls} /></Lbl>
      <Lbl label="Gültig bis"><input name="validUntil" type="date" defaultValue={dateInput(c?.validUntil ?? null)} className={fieldCls} /></Lbl>
      <span />
      <Lbl label="Nur für Kategorien (leer = alle)" hint="Strg/Cmd für Mehrfachauswahl"><select name="categories" multiple defaultValue={c?.categories.map((x) => x.id)} className={`${fieldCls} min-h-[110px]`}>{categories.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}</select></Lbl>
      <Lbl label="Nur für Produkte (leer = alle)" className="lg:col-span-2"><select name="products" multiple defaultValue={c?.products.map((x) => x.id)} className={`${fieldCls} min-h-[110px]`}>{products.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}</select></Lbl>
      <div className="lg:col-span-3"><Submit>Speichern</Submit></div>
    </ActionForm>
  );
}
const load = () => db.coupon.findMany({ orderBy: { createdAt: "desc" }, include: { products: { select: { id: true } }, categories: { select: { id: true } } } });

export default async function Page() {
  const [coupons, products, categories] = await Promise.all([load(), db.product.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }), db.category.findMany({ orderBy: { sortOrder: "asc" }, select: { id: true, name: true } })]);
  return (
    <>
      <PageHead title="Gutscheine" />
      <Table head={["Code", "Rabatt", "Bedingungen", "Einlösungen", "Gültigkeit", "Status"]} empty={coupons.length === 0 ? "Noch keine Gutscheine." : undefined}>
        {coupons.map((c) => {
          const expired = c.validUntil && c.validUntil < new Date();
          return (
            <tr key={c.id}>
              <td className="font-mono font-medium">{c.code}<p className="font-sans text-[12px] font-normal text-cream/40">{c.description}</p></td>
              <td>{c.type === "PERCENT" ? `${c.value} %` : formatEUR(c.value)}</td>
              <td className="text-[12.5px] text-cream/60">{c.minOrderCents ? `ab ${formatEUR(c.minOrderCents)}` : "kein Mindestwert"}{c.oncePerCustomer ? " · 1× pro Kunde" : ""}{c.products.length + c.categories.length > 0 ? " · eingeschränkt" : ""}</td>
              <td className="tabular-nums">{c.usedCount}{c.maxUses ? ` / ${c.maxUses}` : ""}</td>
              <td className="text-[12.5px] text-cream/60">{c.validFrom ? c.validFrom.toLocaleDateString("de-DE") : "sofort"} – {c.validUntil ? c.validUntil.toLocaleDateString("de-DE") : "unbegrenzt"}</td>
              <td>{!c.isActive ? <Badge tone="neutral">Inaktiv</Badge> : expired ? <Badge tone="bad">Abgelaufen</Badge> : <Badge tone="good">Aktiv</Badge>}</td>
            </tr>
          );
        })}
      </Table>
      <div className="mt-8 space-y-4">
        {coupons.map((c) => (
          <details key={c.id} className="group rounded-2xl border border-white/[0.08] bg-ink-900/70"><summary className="flex cursor-pointer list-none items-center justify-between px-5 py-4 text-[14px]"><span>{c.code} bearbeiten</span></summary>
            <div className="space-y-5 border-t border-white/[0.07] p-5"><CouponForm c={c} products={products} categories={categories} /><ActionForm action={deleteCouponAction} confirm="Gutschein löschen?"><input type="hidden" name="id" value={c.id} /><Submit danger>Löschen</Submit></ActionForm></div>
          </details>
        ))}
      </div>
      <Card title="Neuen Gutschein anlegen" className="mt-8"><CouponForm products={products} categories={categories} /></Card>
    </>
  );
}
