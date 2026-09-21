import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getCatalog, getCategories, getCategory, parseFilters } from "@/lib/catalog";
import { CatalogView } from "@/components/catalog/CatalogView";
import { JsonLd } from "@/components/ui/JsonLd";
import { appUrl } from "@/lib/env";

type Params = Promise<{ category: string }>;
type SP = Promise<Record<string, string | string[] | undefined>>;

export async function generateMetadata({ params, searchParams }: { params: Params; searchParams: SP }): Promise<Metadata> {
  const { category } = await params;
  const c = await getCategory(category);
  if (!c) return {};
  const filtered = Object.keys(await searchParams).length > 0;
  return {
    title: c.seoTitle || `${c.name} – Kindermode online kaufen`,
    description: c.seoDescription || c.description || undefined,
    alternates: { canonical: `/shop/${c.slug}` },
    robots: filtered ? { index: false, follow: true } : undefined,
    openGraph: { title: c.seoTitle || c.name, description: c.seoDescription || c.description || undefined, images: c.image ? [c.image] : undefined },
  };
}

export default async function CategoryPage({ params, searchParams }: { params: Params; searchParams: SP }) {
  const { category } = await params;
  const c = await getCategory(category);
  if (!c) notFound();
  const filters = parseFilters(await searchParams, c.slug);
  const [data, categories] = await Promise.all([getCatalog(filters), getCategories()]);
  return (
    <>
      <CatalogView
        filters={filters} data={data} categories={categories} category={c} basePath={`/shop/${c.slug}`}
        title={c.name} subtitle={c.description} intro={c.introText}
        crumbs={[{ name: "Startseite", href: "/" }, { name: "Shop", href: "/shop" }, { name: c.name }]}
      />
      <JsonLd data={{ "@context": "https://schema.org", "@type": "BreadcrumbList", itemListElement: [
        { "@type": "ListItem", position: 1, name: "Startseite", item: appUrl() },
        { "@type": "ListItem", position: 2, name: "Shop", item: `${appUrl()}/shop` },
        { "@type": "ListItem", position: 3, name: c.name, item: `${appUrl()}/shop/${c.slug}` },
      ] }} />
    </>
  );
}
