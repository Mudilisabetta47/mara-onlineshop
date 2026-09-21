import Link from "next/link";
import { db } from "@/lib/db";
import { Badge, PageHead, Table, Tabs, fieldCls } from "@/components/admin/ui";
import { ActionForm, GhostSubmit } from "@/components/admin/ActionForm";
import { inventoryAction } from "../actions";
import type { Prisma } from "@prisma/client";

export const metadata = { title: "Inventar" };

export default async function Page({ searchParams }: { searchParams: Promise<{ filter?: string; q?: string }> }) {
  const sp = await searchParams;
  const q = sp.q?.trim();
  const rows = await db.productVariant.findMany({
    where: { product: { ...(q ? { OR: [{ name: { contains: q, mode: "insensitive" } }, { sku: { contains: q, mode: "insensitive" } }] } : {}) } },
    include: { inventory: true, product: { select: { id: true, name: true, status: true } } },
    orderBy: [{ product: { name: "asc" } }, { position: "asc" }], take: 600,
  } satisfies Prisma.ProductVariantFindManyArgs);
  const lowOf = (r: (typeof rows)[number]) => (r.inventory?.quantity ?? 0) > 0 && (r.inventory?.quantity ?? 0) <= (r.inventory?.lowStockThreshold ?? 3);
  const out = rows.filter((r) => (r.inventory?.quantity ?? 0) === 0), low = rows.filter(lowOf);
  const shown = sp.filter === "out" ? out : sp.filter === "low" ? low : rows;
  return (
    <>
      <PageHead title="Inventar" sub="Bestände je Variante. Beim Kauf wird automatisch reserviert und reduziert." />
      <Tabs active={sp.filter ?? "all"} items={[{ key: "all", label: "Alle Varianten", href: "/admin/inventory", count: rows.length }, { key: "low", label: "Niedriger Bestand", href: "?filter=low", count: low.length }, { key: "out", label: "Ausverkauft", href: "?filter=out", count: out.length }]} />
      <form className="mb-5 max-w-[420px]"><input name="q" defaultValue={q} placeholder="Produkt oder SKU …" className={fieldCls} /></form>
      <Table head={["Produkt", "Variante", "SKU", "Bestand", "Warnung ab", "Status"]} empty={shown.length === 0 ? "Keine Einträge." : undefined}>
        {shown.map((r) => {
          const qty = r.inventory?.quantity ?? 0;
          return (
            <tr key={r.id} className={r.isActive ? "" : "opacity-50"}>
              <td><Link href={`/admin/products/${r.product.id}`} className="hover:text-rose-300">{r.product.name}</Link></td>
              <td>{[r.color, r.size && `Gr. ${r.size}`].filter(Boolean).join(" · ") || "Standard"}</td>
              <td className="font-mono text-[12px] text-cream/50">{r.sku}</td>
              <td colSpan={2}>
                <ActionForm action={inventoryAction} inline className="flex items-center gap-2"><input type="hidden" name="variantId" value={r.id} />
                  <input name="quantity" type="number" min={0} defaultValue={qty} aria-label="Bestand" className={`${fieldCls} !min-h-[36px] w-[88px]`} />
                  <input name="threshold" type="number" min={0} defaultValue={r.inventory?.lowStockThreshold ?? 3} aria-label="Warnschwelle" className={`${fieldCls} !min-h-[36px] w-[72px]`} />
                  <GhostSubmit className="!min-h-[36px]">Speichern</GhostSubmit></ActionForm>
              </td>
              <td>{qty === 0 ? <Badge tone="bad">Ausverkauft</Badge> : lowOf(r) ? <Badge tone="warn">Nur noch {qty}</Badge> : <Badge tone="good">Auf Lager</Badge>}</td>
            </tr>
          );
        })}
      </Table>
    </>
  );
}
