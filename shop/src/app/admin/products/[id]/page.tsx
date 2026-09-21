import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { PageHead } from "@/components/admin/ui";
import { ProductForm } from "@/components/admin/ProductForm";
import { ActionForm, Submit } from "@/components/admin/ActionForm";
import { deleteProductAction } from "../../actions";

export const metadata = { title: "Produkt bearbeiten" };

export default async function Page({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ created?: string }> }) {
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  const [p, categories, brands] = await Promise.all([
    db.product.findUnique({ where: { id }, include: { images: { orderBy: { position: "asc" } }, variants: { orderBy: { position: "asc" }, include: { inventory: true } } } }),
    db.category.findMany({ orderBy: { sortOrder: "asc" }, select: { id: true, name: true } }),
    db.brand.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ]);
  if (!p) notFound();
  return (
    <>
      <PageHead title={p.name} sub={`SKU ${p.sku}`} actions={<>{p.status === "ACTIVE" && <Link href={`/product/${p.slug}`} target="_blank" className="inline-flex min-h-[40px] items-center rounded-full border border-white/15 px-4 text-[13px] hover:border-rose-300/60">Im Shop ansehen ↗</Link>}</>} />
      {sp.created && <p className="mb-5 rounded-xl border border-emerald-300/30 bg-emerald-300/10 px-4 py-3 text-[13.5px] text-emerald-200">Produkt angelegt.</p>}
      <ProductForm
        categories={categories} brands={brands}
        initial={{
          id: p.id, name: p.name, slug: p.slug, shortDescription: p.shortDescription, description: p.description, material: p.material ?? "", careInfo: p.careInfo ?? "", sizeGuide: p.sizeGuide ?? "",
          sku: p.sku, basePriceCents: p.basePriceCents, salePriceCents: p.salePriceCents, status: p.status, weightGrams: p.weightGrams, categoryId: p.categoryId, brandId: p.brandId ?? "",
          seoTitle: p.seoTitle ?? "", seoDescription: p.seoDescription ?? "", featured: p.featured,
          images: p.images.map((i) => ({ id: i.id, url: i.url, alt: i.alt, color: i.color })),
          variants: p.variants.map((v) => ({ id: v.id, sku: v.sku, size: v.size ?? "", color: v.color ?? "", colorHex: v.colorHex ?? "", quantity: v.inventory?.quantity ?? 0, threshold: v.inventory?.lowStockThreshold ?? 3, isActive: v.isActive })),
        }}
      />
      <div className="mt-10 rounded-2xl border border-[#f0a3b9]/25 p-5">
        <h2 className="text-[14.5px] font-medium text-[#f0a3b9]">Gefahrenbereich</h2>
        <p className="mb-4 mt-1 text-[13px] text-cream/50">Bereits bestellte Produkte lassen sich nicht löschen – deaktiviere sie stattdessen.</p>
        <ActionForm action={deleteProductAction} confirm="Produkt endgültig löschen?"><input type="hidden" name="id" value={p.id} /><Submit danger>Produkt löschen</Submit></ActionForm>
      </div>
    </>
  );
}
