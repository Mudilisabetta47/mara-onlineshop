import Link from "next/link";
import { db } from "@/lib/db";
import { formatEUR } from "@/lib/money";
import { Badge, PageHead, Table, fieldCls } from "@/components/admin/ui";

export const metadata = { title: "Kunden" };

export default async function Page({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const q = (await searchParams).q?.trim();
  const users = await db.user.findMany({
    where: q ? { OR: [{ email: { contains: q, mode: "insensitive" } }, { lastName: { contains: q, mode: "insensitive" } }, { firstName: { contains: q, mode: "insensitive" } }] } : undefined,
    orderBy: { createdAt: "desc" }, take: 200, include: { orders: { where: { status: { in: ["PAID", "PROCESSING", "SHIPPED", "DELIVERED"] } }, select: { totalCents: true } } },
  });
  return (
    <>
      <PageHead title="Kunden" sub={`${users.length} Konten`} />
      <form className="mb-5 max-w-[420px]"><input name="q" defaultValue={q} placeholder="Name oder E-Mail …" className={fieldCls} /></form>
      <Table head={["Kunde", "Registriert", "Bestellungen", "Umsatz", "Status"]} empty={users.length === 0 ? "Keine Kunden." : undefined}>
        {users.map((u) => (
          <tr key={u.id}>
            <td><Link href={`/admin/customers/${u.id}`} className="font-medium hover:text-rose-300">{u.firstName} {u.lastName}</Link><p className="text-[12px] text-cream/40">{u.email}</p></td>
            <td className="text-cream/60">{u.createdAt.toLocaleDateString("de-DE")}</td>
            <td className="tabular-nums">{u.orders.length}</td>
            <td className="tabular-nums">{formatEUR(u.orders.reduce((s, o) => s + o.totalCents, 0))}</td>
            <td>{u.disabledAt ? <Badge tone="bad">Gesperrt</Badge> : u.role === "ADMIN" ? <Badge tone="rose">Admin</Badge> : <Badge tone="good">Aktiv</Badge>}</td>
          </tr>
        ))}
      </Table>
    </>
  );
}
