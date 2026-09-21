import { db } from "@/lib/db";
import { PageHead } from "@/components/admin/ui";
import { ProductForm } from "@/components/admin/ProductForm";

export const metadata = { title: "Neues Produkt" };

export default async function Page() {
  const [categories, brands] = await Promise.all([db.category.findMany({ orderBy: { sortOrder: "asc" }, select: { id: true, name: true } }), db.brand.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } })]);
  return (
    <>
      <PageHead title="Neues Produkt" />
      <ProductForm categories={categories} brands={brands} initial={{ name: "", slug: "", shortDescription: "", description: "", material: "", careInfo: "", sizeGuide: "", sku: "", basePriceCents: null, salePriceCents: null, status: "DRAFT", weightGrams: null, categoryId: "", brandId: "", seoTitle: "", seoDescription: "", featured: false, images: [], variants: [] }} />
    </>
  );
}
