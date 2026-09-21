import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { Card, Lbl, PageHead, fieldCls } from "@/components/admin/ui";
import { ActionForm, Submit } from "@/components/admin/ActionForm";
import { ContractForm } from "../ContractForm";
import { deleteContractAction, deleteContractDocAction, uploadContractDocAction } from "../../actions";

export const metadata = { title: "Vertrag" };

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const c = await db.contract.findUnique({ where: { id: (await params).id }, include: { user: true, documents: { include: { file: true }, orderBy: { createdAt: "desc" } } } });
  if (!c) notFound();
  return (
    <>
      <PageHead title={c.title} sub={`${c.number} · ${c.user.firstName} ${c.user.lastName}`} />
      <div className="space-y-5">
        <Card title="Vertragsdaten"><ContractForm c={{ ...c, userEmail: c.user.email }} /></Card>
        <Card title="Dokumente">
          {c.documents.length > 0 && <ul className="mb-6 divide-y divide-white/[0.06]">{c.documents.map((d) => (
            <li key={d.id} className="flex items-center justify-between gap-3 py-3 text-[13.5px]"><div><p className="font-medium">{d.title}</p><p className="text-[12px] text-cream/40">{d.file.filename} · {(d.file.size / 1024).toFixed(0)} KB</p></div>
              <div className="flex items-center gap-4"><a href={`/api/files/${d.fileId}`} target="_blank" rel="noopener" className="text-rose-300 underline underline-offset-4">Öffnen</a><form action={deleteContractDocAction}><input type="hidden" name="id" value={d.id} /><button className="text-[#f0a3b9]">Löschen</button></form></div></li>))}</ul>}
          <ActionForm action={uploadContractDocAction} className="grid gap-4 sm:grid-cols-[1fr_1fr_auto] sm:items-end"><input type="hidden" name="contractId" value={c.id} />
            <Lbl label="Titel"><input name="title" className={fieldCls} placeholder="z. B. Vertrag unterschrieben" /></Lbl>
            <Lbl label="Datei (PDF, JPG, PNG · max. 4 MB)"><input name="file" type="file" required accept="application/pdf,image/jpeg,image/png,image/webp" className={`${fieldCls} py-2`} /></Lbl>
            <Submit>Hochladen</Submit></ActionForm>
        </Card>
        <Card title="Löschen"><ActionForm action={deleteContractAction} confirm="Vertrag inkl. aller Dokumente endgültig löschen?"><input type="hidden" name="id" value={c.id} /><Submit danger>Vertrag löschen</Submit></ActionForm></Card>
      </div>
    </>
  );
}
