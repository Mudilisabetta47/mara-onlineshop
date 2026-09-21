import { db } from "@/lib/db";
import { PageHead, Table, Tabs } from "@/components/admin/ui";

export const metadata = { title: "Audit Log" };
const ENTITIES = ["all", "Order", "Product", "User", "Coupon", "Category", "Contract", "Setting"];

export default async function Page({ searchParams }: { searchParams: Promise<{ entity?: string }> }) {
  const e = (await searchParams).entity;
  const entity = ENTITIES.includes(e ?? "") && e !== "all" ? e : undefined;
  const logs = await db.auditLog.findMany({ where: entity ? { entity } : undefined, orderBy: { createdAt: "desc" }, take: 300, include: { actor: { select: { email: true } } } });
  return (
    <>
      <PageHead title="Audit Log" sub="Alle sicherheits- und geschäftsrelevanten Aktionen (letzte 300)." />
      <Tabs active={entity ?? "all"} items={ENTITIES.map((x) => ({ key: x, label: x === "all" ? "Alle" : x, href: x === "all" ? "/admin/audit" : `?entity=${x}` }))} />
      <Table head={["Zeit", "Akteur", "Aktion", "Objekt", "Details", "IP"]} empty={logs.length === 0 ? "Keine Einträge." : undefined}>
        {logs.map((l) => (
          <tr key={l.id}><td className="whitespace-nowrap text-cream/60">{l.createdAt.toLocaleString("de-DE")}</td><td>{l.actor?.email ?? "System"}</td><td className="font-mono text-[12.5px]">{l.action}</td><td className="text-cream/60">{l.entity}{l.entityId ? ` · ${l.entityId.slice(-8)}` : ""}</td><td className="max-w-[280px] truncate font-mono text-[11.5px] text-cream/40">{l.meta ? JSON.stringify(l.meta) : ""}</td><td className="text-[12px] text-cream/40">{l.ip}</td></tr>
        ))}
      </Table>
    </>
  );
}
