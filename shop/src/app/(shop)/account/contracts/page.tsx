import Link from "next/link";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth/guards";
import { Empty, PageTitle } from "@/components/account/bits";
import { CONTRACT_STATUS } from "@/lib/contracts";

export const dynamic = "force-dynamic";
export const metadata = { title: "Deine Verträge" };

export default async function Page() {
  const u = await requireUser();
  const contracts = await db.contract.findMany({ where: { userId: u.id, status: { not: "DRAFT" } }, orderBy: { createdAt: "desc" }, include: { _count: { select: { documents: true } } } });
  return (
    <>
      <PageTitle eyebrow="Mein Konto" sub="Verträge und zugehörige Dokumente – getrennt von deinen Bestellungen.">Deine Verträge.</PageTitle>
      {contracts.length === 0 ? <Empty title="Keine Verträge vorhanden." text="Sobald wir einen Vertrag mit dir abschließen, findest du ihn hier samt Dokumenten." /> : (
        <ul className="space-y-4">
          {contracts.map((c) => (
            <li key={c.id}><Link href={`/account/contracts/${c.id}`} className="panel flex flex-wrap items-center justify-between gap-4 p-6 transition-colors hover:border-rose-300/40">
              <div><p className="text-[17px] font-medium tracking-tight">{c.title}</p><p className="mt-1 text-[13.5px] text-cream/50">{c.type} · Nr. {c.number}{c.startsAt ? ` · ab ${c.startsAt.toLocaleDateString("de-DE")}` : ""}</p></div>
              <div className="flex items-center gap-4"><span className="text-[13px] text-cream/50">{c._count.documents} Dokument{c._count.documents === 1 ? "" : "e"}</span><span className="rounded-full bg-white/10 px-3 py-1 text-[12px]">{CONTRACT_STATUS[c.status]}</span></div>
            </Link></li>
          ))}
        </ul>
      )}
    </>
  );
}
