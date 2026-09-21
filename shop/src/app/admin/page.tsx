import Link from "next/link";
import { db } from "@/lib/db";
import { formatEUR } from "@/lib/money";
import { PageHead, Stat, Card, Badge } from "@/components/admin/ui";
import { AreaChart, BarChart, HBars } from "@/components/admin/Charts";
import { ORDER_STATUS_LABEL } from "@/lib/orders";
import { businessReadiness } from "@/lib/readiness";
import { appEnv } from "@/lib/config";

const REVENUE_STATES = ["PAID", "PROCESSING", "SHIPPED", "DELIVERED"] as const;

export default async function AdminDashboard() {
  const days = 30;
  const since = new Date(); since.setHours(0, 0, 0, 0); since.setDate(since.getDate() - (days - 1));

  const [paid, placed, customers, products, stock, soldOutVariants, top, recent, low] = await Promise.all([
    db.order.findMany({ where: { status: { in: [...REVENUE_STATES] }, paidAt: { gte: since } }, select: { paidAt: true, totalCents: true } }),
    db.order.findMany({ where: { placedAt: { gte: since }, status: { not: "CANCELLED" } }, select: { placedAt: true } }),
    db.user.count({ where: { role: "CUSTOMER" } }),
    db.product.groupBy({ by: ["status"], _count: true }),
    db.inventory.aggregate({ _sum: { quantity: true } }),
    db.productVariant.count({ where: { isActive: true, inventory: { is: { quantity: 0 } }, product: { status: "ACTIVE" } } }),
    db.orderItem.groupBy({ by: ["productId", "name"], where: { order: { status: { in: [...REVENUE_STATES] } } }, _sum: { quantity: true, totalCents: true }, orderBy: { _sum: { totalCents: "desc" } }, take: 6 }),
    db.order.findMany({ orderBy: { placedAt: "desc" }, take: 6, include: { shippingAddress: { select: { firstName: true, lastName: true } } } }),
    db.inventory.findMany({ where: { quantity: { lte: 3 }, variant: { isActive: true, product: { status: "ACTIVE" } } }, orderBy: { quantity: "asc" }, take: 6, include: { variant: { include: { product: { select: { name: true, id: true } } } } } }),
  ]);

  const key = (d: Date) => d.toLocaleDateString("sv-SE"); // lokaler Tag (yyyy-mm-dd) – nicht UTC
  const dayList = Array.from({ length: days }, (_, i) => { const d = new Date(since); d.setDate(since.getDate() + i); return d; });
  const rev = new Map<string, number>(), cnt = new Map<string, number>();
  paid.forEach((o) => rev.set(key(o.paidAt!), (rev.get(key(o.paidAt!)) ?? 0) + o.totalCents));
  placed.forEach((o) => cnt.set(key(o.placedAt), (cnt.get(key(o.placedAt)) ?? 0) + 1));
  const label = (d: Date) => d.toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit" });
  const revenue = paid.reduce((s, o) => s + o.totalCents, 0);
  const active = products.find((p) => p.status === "ACTIVE")?._count ?? 0;
  const total = products.reduce((s, p) => s + p._count, 0);
  const findings = await businessReadiness().catch(() => []);
  const openOrders = await db.order.count({ where: { status: { in: ["PAID", "PROCESSING"] } } });

  return (
    <>
      <PageHead title="Dashboard" sub={`Letzte ${days} Tage · Umgebung: ${appEnv()}`} />
      {findings.some((x) => x.level !== "ok") && (
        <Card title="Betriebsbereitschaft" className="mb-6" right={<a href="/api/health" target="_blank" className="text-[12.5px] text-cream/50 hover:text-cream">Health Check ↗</a>}>
          <ul className="space-y-2 text-[13.5px]">{findings.map((x, i) => <li key={i} className="flex gap-3"><span className={x.level === "error" ? "text-[#f0a3b9]" : x.level === "warn" ? "text-amber-300" : "text-emerald-300"}>{x.level === "ok" ? "✓" : x.level === "warn" ? "⚠" : "✖"}</span><span className={x.level === "ok" ? "text-cream/50" : ""}>{x.text}</span></li>)}</ul>
        </Card>
      )}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <Stat label="Umsatz" value={formatEUR(revenue)} sub={`${paid.length} bezahlte Bestellungen`} accent />
        <Stat label="Bestellungen" value={placed.length} sub={`${openOrders} offen (zu versenden)`} />
        <Stat label="Kunden" value={customers} sub="registrierte Konten" />
        <Stat label="Produkte" value={active} sub={`${total} gesamt · ${total - active} inaktiv/Entwurf`} />
        <Stat label="Bestand" value={(stock._sum.quantity ?? 0).toLocaleString("de-DE")} sub="Stück gesamt" />
        <Stat label="Ausverkauft" value={soldOutVariants} sub="Varianten mit Bestand 0" accent={soldOutVariants > 0} />
      </div>

      <div className="mt-6 grid gap-4 xl:grid-cols-[2fr_1fr]">
        <Card title="Umsatz"><AreaChart data={dayList.map((d) => ({ label: label(d), value: rev.get(key(d)) ?? 0 }))} /></Card>
        <Card title="Top-Produkte (Umsatz)"><HBars data={top.map((t) => ({ label: t.name, value: t._sum.totalCents ?? 0 }))} format={formatEUR} /></Card>
        <Card title="Bestellungen pro Tag"><BarChart data={dayList.map((d) => ({ label: label(d), value: cnt.get(key(d)) ?? 0 }))} /></Card>
        <Card title="Niedriger Bestand" right={<Link href="/admin/inventory?filter=low" className="text-[12.5px] text-cream/50 hover:text-cream">Alle</Link>}>
          {low.length === 0 ? <p className="text-[13.5px] text-cream/45">Alles gut gefüllt.</p> : (
            <ul className="space-y-3 text-[13.5px]">{low.map((i) => <li key={i.id} className="flex items-center justify-between gap-3"><Link href={`/admin/products/${i.variant.product.id}`} className="truncate hover:text-rose-300">{i.variant.product.name} <span className="text-cream/45">· {[i.variant.color, i.variant.size].filter(Boolean).join(" / ")}</span></Link><Badge tone={i.quantity === 0 ? "bad" : "warn"}>{i.quantity === 0 ? "Ausverkauft" : `${i.quantity} Stk.`}</Badge></li>)}</ul>
          )}
        </Card>
      </div>

      <Card title="Neueste Bestellungen" className="mt-4" right={<Link href="/admin/orders" className="text-[12.5px] text-cream/50 hover:text-cream">Alle</Link>}>
        {recent.length === 0 ? <p className="text-[13.5px] text-cream/45">Noch keine Bestellungen.</p> : (
          <ul className="divide-y divide-white/[0.06]">{recent.map((o) => <li key={o.id}><Link href={`/admin/orders/${o.id}`} className="flex flex-wrap items-center justify-between gap-3 py-3 text-[14px] hover:text-rose-300"><span>#{o.number} <span className="text-cream/45">· {o.shippingAddress.firstName} {o.shippingAddress.lastName}</span></span><span className="flex items-center gap-4"><Badge tone={o.status === "PAID" ? "rose" : o.status === "CANCELLED" || o.status === "REFUNDED" ? "bad" : "neutral"}>{ORDER_STATUS_LABEL[o.status]}</Badge><span className="tabular-nums">{formatEUR(o.totalCents)}</span></span></Link></li>)}</ul>
        )}
      </Card>
    </>
  );
}
