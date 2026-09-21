import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth/guards";
import { CONTRACT_STATUS } from "@/lib/contracts";

export const dynamic = "force-dynamic";
export const metadata = { title: "Vertrag" };

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const u = await requireUser();
  const c = await db.contract.findFirst({ where: { id: (await params).id, userId: u.id, status: { not: "DRAFT" } }, include: { documents: { include: { file: true }, orderBy: { createdAt: "desc" } } } });
  if (!c) notFound();
  return (
    <>
      <Link href="/account/contracts" className="text-[13.5px] text-cream/55 underline-offset-4 hover:text-cream hover:underline">← Alle Verträge</Link>
      <h1 className="h-lg mb-2 mt-5 !text-[clamp(2.2rem,4.5vw,3.4rem)]">{c.title}</h1>
      <p className="mb-8 text-cream/55">{c.type} · Nr. {c.number} · {CONTRACT_STATUS[c.status]}</p>
      <dl className="panel mb-6 grid gap-6 p-6 sm:grid-cols-3">
        <div><dt className="eyebrow !text-cream/45">Beginn</dt><dd className="mt-2">{c.startsAt?.toLocaleDateString("de-DE") ?? "–"}</dd></div>
        <div><dt className="eyebrow !text-cream/45">Ende</dt><dd className="mt-2">{c.endsAt?.toLocaleDateString("de-DE") ?? "unbefristet"}</dd></div>
        <div><dt className="eyebrow !text-cream/45">Status</dt><dd className="mt-2">{CONTRACT_STATUS[c.status]}</dd></div>
      </dl>
      {c.notes && <p className="panel mb-6 whitespace-pre-line p-6 text-[14.5px] leading-relaxed text-cream/70">{c.notes}</p>}
      <h2 className="mb-4 text-[19px] font-medium tracking-tight">Dokumente</h2>
      {c.documents.length === 0 ? <p className="text-cream/55">Keine Dokumente hinterlegt.</p> : (
        <ul className="panel divide-y divide-white/[0.07]">
          {c.documents.map((d) => <li key={d.id} className="flex items-center justify-between gap-4 p-5"><div><p className="font-medium">{d.title}</p><p className="text-[12.5px] text-cream/45">{d.file.filename} · {(d.file.size / 1024).toFixed(0)} KB</p></div><a href={`/api/files/${d.fileId}`} target="_blank" rel="noopener" className="btn-ghost btn-sm">Öffnen</a></li>)}
        </ul>
      )}
    </>
  );
}
