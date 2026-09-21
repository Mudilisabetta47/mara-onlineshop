import Image from "next/image";
import Link from "next/link";
import { db } from "@/lib/db";
import { formatEUR } from "@/lib/money";
import { Badge, LinkBtn, PageHead, Table, Tabs, fieldCls } from "@/components/admin/ui";
import { setProductStatusAction } from "../actions";
import type { Prisma } from "@prisma/client";

export const metadata = { title: "Produkte" };

export default async function Page({ searchParams }: { searchParams: Promise<{ status?: string; q?: string }> }) {
  const sp = await searchParams;
  const status = ["DRAFT", "ACTIVE", "INACTIVE"].includes(sp.status ?? "") ? (sp.status as "DRAFT" | "ACTIVE" | "INACTIVE") : undefined;
  const q = sp.q?.trim();
  const where: Prisma.ProductWhereInput = { ...(status ? { status } : {}), ...(q ? { OR: [{ name: { contains: q, mode: "insensitive" } }, { sku: { contains: q, mode: "insensitive" } }] } : {}) };
  const [products, counts] = await Promise.all([
    db.product.findMany({ where, orderBy: { updatedAt: "desc" }, include: { category: true, images: { orderBy: { position: "asc" }, take: 1 }, variants: { include: { inventory: true } } } }),
    db.product.groupBy({ by: ["status"], _count: true }),
  ]);
  const c = (s: string) => counts.find((x) => x.status === s)?._count ?? 0;
  const tone = { ACTIVE: "good", DRAFT: "neutral", INACTIVE: "warn" } as const;
  const label = { ACTIVE: "Aktiv", DRAFT: "Entwurf", INACTIVE: "Deaktiviert" } as const;
  return (
    <>
      <PageHead title="Produkte" sub={`${counts.reduce((s, x) => s + x._count, 0)} Produkte`} actions={<LinkBtn href="/admin/products/new" primary>+ Neues Produkt</LinkBtn>} />
      <Tabs active={status ?? "all"} items={[{ key: "all", label: "Alle", href: "/admin/products", count: counts.reduce((s, x) => s + x._count, 0) }, { key: "ACTIVE", label: "Aktiv", href: "?status=ACTIVE", count: c("ACTIVE") }, { key: "DRAFT", label: "Entwurf", href: "?status=DRAFT", count: c("DRAFT") }, { key: "INACTIVE", label: "Deaktiviert", href: "?status=INACTIVE", count: c("INACTIVE") }]} />
      <form className="mb-5 max-w-[420px]"><input name="q" defaultValue={q} placeholder="Suche nach Name oder SKU …" className={fieldCls} />{status && <input type="hidden" name="status" value={status} />}</form>
      <Table head={["", "Produkt", "Kategorie", "Preis", "Bestand", "Status", ""]} empty={products.length === 0 ? "Keine Produkte gefunden." : undefined}>
        {products.map((p) => {
          const stock = p.variants.reduce((s, v) => s + (v.inventory?.quantity ?? 0), 0);
          return (
            <tr key={p.id}>
              <td className="w-[64px]"><div className="relative h-[60px] w-[48px] overflow-hidden rounded-lg bg-plum-900">{p.images[0] && <Image src={p.images[0].url} alt="" fill sizes="48px" className="object-cover" />}</div></td>
              <td><Link href={`/admin/products/${p.id}`} className="font-medium hover:text-rose-300">{p.name}</Link><p className="text-[12px] text-cream/40">{p.sku} · {p.variants.length} Varianten</p></td>
              <td className="text-cream/70">{p.category.name}</td>
              <td className="tabular-nums">{p.salePriceCents ? <><span className="text-rose-300">{formatEUR(p.salePriceCents)}</span> <s className="text-cream/35">{formatEUR(p.basePriceCents)}</s></> : formatEUR(p.basePriceCents)}</td>
              <td><Badge tone={stock === 0 ? "bad" : stock < 10 ? "warn" : "neutral"}>{stock === 0 ? "Ausverkauft" : `${stock} Stk.`}</Badge></td>
              <td><Badge tone={tone[p.status]}>{label[p.status]}</Badge></td>
              <td className="text-right">
                <form action={setProductStatusAction} className="inline"><input type="hidden" name="id" value={p.id} /><input type="hidden" name="status" value={p.status === "ACTIVE" ? "INACTIVE" : "ACTIVE"} /><button className="text-[12.5px] text-cream/55 underline underline-offset-4 hover:text-cream">{p.status === "ACTIVE" ? "Deaktivieren" : "Aktivieren"}</button></form>
              </td>
            </tr>
          );
        })}
      </Table>
    </>
  );
}
