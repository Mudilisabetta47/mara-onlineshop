import Link from "next/link";
import { db } from "@/lib/db";
import { formatEUR } from "@/lib/money";
import { ORDER_STATUS_LABEL } from "@/lib/orders";
import { Badge, PageHead, Table, Tabs, fieldCls } from "@/components/admin/ui";
import type { OrderStatus, Prisma } from "@prisma/client";

export const metadata = { title: "Bestellungen" };
const ORDER: OrderStatus[] = ["NEW", "PAID", "PROCESSING", "SHIPPED", "DELIVERED", "CANCELLED", "REFUNDED"];
const tone = (s: OrderStatus) => (s === "PAID" ? "rose" : s === "DELIVERED" ? "good" : s === "SHIPPED" || s === "PROCESSING" ? "warn" : s === "CANCELLED" || s === "REFUNDED" ? "bad" : "neutral") as "rose" | "good" | "warn" | "bad" | "neutral";

export default async function Page({ searchParams }: { searchParams: Promise<{ status?: string; q?: string }> }) {
  const sp = await searchParams;
  const status = ORDER.includes(sp.status as OrderStatus) ? (sp.status as OrderStatus) : undefined;
  const q = sp.q?.trim();
  const num = q && /^#?\d+$/.test(q) ? parseInt(q.replace("#", ""), 10) : undefined;
  const where: Prisma.OrderWhereInput = { ...(status ? { status } : {}), ...(q ? { OR: [...(num ? [{ number: num }] : []), { email: { contains: q, mode: "insensitive" } }, { shippingAddress: { lastName: { contains: q, mode: "insensitive" } } }] } : {}) };
  const [orders, counts] = await Promise.all([
    db.order.findMany({ where, orderBy: { placedAt: "desc" }, take: 200, include: { shippingAddress: true, payments: { take: 1 } } }),
    db.order.groupBy({ by: ["status"], _count: true }),
  ]);
  const c = (s: OrderStatus) => counts.find((x) => x.status === s)?._count ?? 0;
  return (
    <>
      <PageHead title="Bestellungen" />
      <Tabs active={status ?? "all"} items={[{ key: "all", label: "Alle", href: "/admin/orders", count: counts.reduce((s, x) => s + x._count, 0) }, ...ORDER.map((s) => ({ key: s, label: ORDER_STATUS_LABEL[s], href: `?status=${s}`, count: c(s) }))]} />
      <form className="mb-5 max-w-[420px]"><input name="q" defaultValue={q} placeholder="Nummer, E-Mail oder Nachname …" className={fieldCls} />{status && <input type="hidden" name="status" value={status} />}</form>
      <Table head={["Bestellung", "Datum", "Kunde", "Zahlung", "Status", "Summe"]} empty={orders.length === 0 ? "Keine Bestellungen." : undefined}>
        {orders.map((o) => (
          <tr key={o.id} className="hover:bg-white/[0.02]">
            <td><Link href={`/admin/orders/${o.id}`} className="font-medium hover:text-rose-300">#{o.number}</Link></td>
            <td className="text-cream/60">{o.placedAt.toLocaleString("de-DE", { dateStyle: "short", timeStyle: "short" })}</td>
            <td>{o.shippingAddress.firstName} {o.shippingAddress.lastName}<p className="text-[12px] text-cream/40">{o.email}{o.userId ? "" : " · Gast"}</p></td>
            <td className="text-cream/60">{o.payments[0]?.provider === "BANK_TRANSFER" ? "Vorkasse" : o.payments[0]?.provider === "TEST" ? "Test" : o.payments[0]?.provider ?? "–"} · {o.payments[0]?.status === "PAID" ? "bezahlt" : o.payments[0]?.status === "REFUNDED" ? "erstattet" : "offen"}</td>
            <td><Badge tone={tone(o.status)}>{ORDER_STATUS_LABEL[o.status]}</Badge></td>
            <td className="text-right tabular-nums">{formatEUR(o.totalCents)}</td>
          </tr>
        ))}
      </Table>
    </>
  );
}
