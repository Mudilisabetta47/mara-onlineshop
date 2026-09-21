import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { formatEUR } from "@/lib/money";
import { ORDER_STATUS_LABEL } from "@/lib/orders";
import { Badge, Card, LinkBtn, PageHead, Table } from "@/components/admin/ui";
import { toggleUserAction } from "../../actions";
import { CONTRACT_STATUS } from "@/lib/contracts";

export const metadata = { title: "Kunde" };

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const u = await db.user.findUnique({ where: { id: (await params).id }, include: { orders: { orderBy: { placedAt: "desc" } }, contracts: { orderBy: { createdAt: "desc" } }, addresses: true, _count: { select: { reviews: true } } } });
  if (!u) notFound();
  return (
    <>
      <PageHead title={`${u.firstName} ${u.lastName}`} sub={`${u.email}${u.phone ? ` · ${u.phone}` : ""} · seit ${u.createdAt.toLocaleDateString("de-DE")}`} actions={<>
        <LinkBtn href={`/admin/contracts/new?email=${encodeURIComponent(u.email)}`}>+ Vertrag anlegen</LinkBtn>
        <form action={toggleUserAction}><input type="hidden" name="id" value={u.id} /><button className="inline-flex min-h-[40px] items-center rounded-full border border-white/15 px-4 text-[13px] hover:border-rose-300/60">{u.disabledAt ? "Konto entsperren" : "Konto sperren"}</button></form></>} />
      <div className="mb-5 flex flex-wrap gap-2">{u.role === "ADMIN" && <Badge tone="rose">Admin</Badge>}{u.disabledAt && <Badge tone="bad">Gesperrt</Badge>}{u.newsletter && <Badge tone="neutral">Newsletter</Badge>}<Badge tone="neutral">{u._count.reviews} Bewertungen</Badge></div>
      <h2 className="mb-3 text-[15px] font-medium">Bestellungen</h2>
      <Table head={["Nr.", "Datum", "Status", "Summe"]} empty={u.orders.length === 0 ? "Keine Bestellungen." : undefined}>
        {u.orders.map((o) => <tr key={o.id}><td><Link href={`/admin/orders/${o.id}`} className="font-medium hover:text-rose-300">#{o.number}</Link></td><td className="text-cream/60">{o.placedAt.toLocaleDateString("de-DE")}</td><td>{ORDER_STATUS_LABEL[o.status]}</td><td className="tabular-nums">{formatEUR(o.totalCents)}</td></tr>)}
      </Table>
      <h2 className="mb-3 mt-8 text-[15px] font-medium">Verträge</h2>
      <Table head={["Nr.", "Titel", "Status"]} empty={u.contracts.length === 0 ? "Keine Verträge." : undefined}>
        {u.contracts.map((c) => <tr key={c.id}><td><Link href={`/admin/contracts/${c.id}`} className="hover:text-rose-300">{c.number}</Link></td><td>{c.title}</td><td>{CONTRACT_STATUS[c.status]}</td></tr>)}
      </Table>
      <Card title="Adressen" className="mt-8">{u.addresses.length === 0 ? <p className="text-cream/45">Keine gespeicherten Adressen.</p> : <ul className="grid gap-4 sm:grid-cols-2">{u.addresses.map((a) => <li key={a.id} className="text-[13.5px] text-cream/70">{a.firstName} {a.lastName}<br />{a.line1}<br />{a.postalCode} {a.city}</li>)}</ul>}</Card>
    </>
  );
}
