import Link from "next/link";
import { db } from "@/lib/db";
import { CONTRACT_STATUS } from "@/lib/contracts";
import { Badge, LinkBtn, PageHead, Table } from "@/components/admin/ui";

export const metadata = { title: "Verträge" };

export default async function Page() {
  const list = await db.contract.findMany({ orderBy: { createdAt: "desc" }, include: { user: { select: { firstName: true, lastName: true, email: true } }, _count: { select: { documents: true } } } });
  return (
    <>
      <PageHead title="Verträge" sub="Verträge sind getrennt vom Shop-Bestellprozess und erscheinen im Kundenkonto unter „Deine Verträge“." actions={<LinkBtn href="/admin/contracts/new" primary>+ Neuer Vertrag</LinkBtn>} />
      <Table head={["Nr.", "Titel", "Kunde", "Status", "Dokumente"]} empty={list.length === 0 ? "Noch keine Verträge." : undefined}>
        {list.map((c) => (
          <tr key={c.id}><td><Link href={`/admin/contracts/${c.id}`} className="font-medium hover:text-rose-300">{c.number}</Link></td><td>{c.title}<p className="text-[12px] text-cream/40">{c.type}</p></td><td>{c.user.firstName} {c.user.lastName}<p className="text-[12px] text-cream/40">{c.user.email}</p></td>
            <td><Badge tone={c.status === "ACTIVE" ? "good" : c.status === "DRAFT" ? "neutral" : "warn"}>{CONTRACT_STATUS[c.status]}</Badge></td><td className="tabular-nums">{c._count.documents}</td></tr>
        ))}
      </Table>
    </>
  );
}
