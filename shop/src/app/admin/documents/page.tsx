import { db } from "@/lib/db";
import { Badge, PageHead, Table, Tabs } from "@/components/admin/ui";
import type { FileKind } from "@prisma/client";

export const metadata = { title: "Dokumente" };
const LABEL: Record<FileKind, string> = { INVOICE: "Rechnungen", CONTRACT: "Vertragsdokumente", PRODUCT_IMAGE: "Produktbilder", OTHER: "Sonstiges" };

export default async function Page({ searchParams }: { searchParams: Promise<{ kind?: string }> }) {
  const k = (await searchParams).kind;
  const kind = (Object.keys(LABEL).includes(k ?? "") ? k : "INVOICE") as FileKind;
  const [files, counts] = await Promise.all([
    db.storedFile.findMany({ where: { kind }, orderBy: { createdAt: "desc" }, take: 200, include: { order: { select: { number: true, id: true } }, contract: { include: { contract: { select: { number: true, id: true } } } } } }),
    db.storedFile.groupBy({ by: ["kind"], _count: true }),
  ]);
  return (
    <>
      <PageHead title="Dokumente" sub="Rechnungen, Vertragsdokumente und hochgeladene Dateien. Private Dateien sind nur über autorisierte Links abrufbar." />
      <Tabs active={kind} items={(Object.keys(LABEL) as FileKind[]).map((x) => ({ key: x, label: LABEL[x], href: `?kind=${x}`, count: counts.find((c) => c.kind === x)?._count ?? 0 }))} />
      <Table head={["Datei", "Zugehörig zu", "Größe", "Sichtbarkeit", "Datum", ""]} empty={files.length === 0 ? "Keine Dateien." : undefined}>
        {files.map((f) => (
          <tr key={f.id}>
            <td className="font-medium">{f.filename}<p className="text-[12px] text-cream/40">{f.mime}</p></td>
            <td className="text-cream/65">{f.order ? <a className="hover:text-rose-300" href={`/admin/orders/${f.order.id}`}>Bestellung #{f.order.number}</a> : f.contract ? <a className="hover:text-rose-300" href={`/admin/contracts/${f.contract.contract.id}`}>Vertrag {f.contract.contract.number}</a> : "–"}</td>
            <td className="tabular-nums text-cream/60">{(f.size / 1024).toFixed(0)} KB</td>
            <td><Badge tone={f.visibility === "PRIVATE" ? "warn" : "neutral"}>{f.visibility === "PRIVATE" ? "Privat" : "Öffentlich"}</Badge></td>
            <td className="text-cream/60">{f.createdAt.toLocaleDateString("de-DE")}</td>
            <td className="text-right"><a href={f.visibility === "PUBLIC" ? `/media/${f.key}` : `/api/files/${f.id}`} target="_blank" rel="noopener" className="text-rose-300 underline underline-offset-4">Öffnen</a></td>
          </tr>
        ))}
      </Table>
    </>
  );
}
