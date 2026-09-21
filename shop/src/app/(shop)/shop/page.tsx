import type { Metadata } from "next";
import { getCatalog, getCategories, parseFilters } from "@/lib/catalog";
import { CatalogView } from "@/components/catalog/CatalogView";
import { JsonLd } from "@/components/ui/JsonLd";
import { appUrl } from "@/lib/env";

type SP = Promise<Record<string, string | string[] | undefined>>;

export async function generateMetadata({ searchParams }: { searchParams: SP }): Promise<Metadata> {
  const sp = await searchParams;
  const filtered = Object.keys(sp).length > 0;
  const q = typeof sp.q === "string" ? sp.q : null;
  return {
    title: q ? `Suche: ${q}` : "Alle Produkte – Mode, Schuhe & Lieblingsstücke",
    description: "Entdecke Kindermode, Schuhe und Lieblingsstücke: filtere nach Größe, Farbe, Marke und Preis. Schneller Versand, 30 Tage Rückgabe.",
    alternates: { canonical: "/shop" },
    robots: filtered ? { index: false, follow: true } : undefined,
  };
}

export default async function ShopPage({ searchParams }: { searchParams: SP }) {
  const filters = parseFilters(await searchParams);
  const [data, categories] = await Promise.all([getCatalog(filters), getCategories()]);
  const title = filters.q ? `Ergebnisse für „${filters.q}“` : filters.sale ? "Angebote" : filters.sort === "bestseller" ? "Bestseller" : filters.isNew ? "Neuheiten" : "Alle Produkte";
  return (
    <>
      <CatalogView
        filters={filters} data={data} categories={categories} basePath="/shop" title={title}
        subtitle={filters.q ? null : "Ausgewählte Mode, Schuhe und Lieblingsstücke."}
        crumbs={[{ name: "Startseite", href: "/" }, { name: "Shop" }]}
      />
      <JsonLd data={{ "@context": "https://schema.org", "@type": "BreadcrumbList", itemListElement: [
        { "@type": "ListItem", position: 1, name: "Startseite", item: appUrl() },
        { "@type": "ListItem", position: 2, name: "Shop", item: `${appUrl()}/shop` },
      ] }} />
    </>
  );
}
