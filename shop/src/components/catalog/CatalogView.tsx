import Link from "next/link";
import { ProductCard } from "@/components/product/ProductCard";
import { Breadcrumbs, type Crumb } from "@/components/ui/Breadcrumbs";
import { FilterPanel } from "./FilterPanel";
import { CatalogToolbar } from "./CatalogToolbar";
import type { Filters, Facets, ProductCardData } from "@/lib/catalog";
import { formatEUR } from "@/lib/money";

type Cat = { slug: string; name: string };

export function CatalogView({ filters, data, categories, category, crumbs, basePath, title, subtitle, intro }: {
  filters: Filters;
  data: { items: ProductCardData[]; total: number; pages: number; page: number; facets: Facets };
  categories: Cat[];
  category?: Cat;
  crumbs: Crumb[];
  basePath: string;
  title: string;
  subtitle?: string | null;
  intro?: string | null;
}) {
  const f = filters;
  // Aktive Filter als entfernbare Chips
  const chips: { label: string; param: string; value?: string }[] = [
    ...(f.q ? [{ label: `„${f.q}“`, param: "q" }] : []),
    ...f.sizes.map((s) => ({ label: `Größe ${s}`, param: "size", value: s })),
    ...f.colors.map((c) => ({ label: c, param: "color", value: c })),
    ...f.brands.map((b) => ({ label: data.facets.brands.find((x) => x.slug === b)?.name ?? b, param: "brand", value: b })),
    ...(f.minPrice != null || f.maxPrice != null ? [{ label: `${f.minPrice != null ? formatEUR(f.minPrice) : "0 €"} – ${f.maxPrice != null ? formatEUR(f.maxPrice) : "∞"}`, param: "price" }] : []),
    ...(f.inStock ? [{ label: "Verfügbar", param: "stock" }] : []),
    ...(f.sale ? [{ label: "Angebote", param: "sale" }] : []),
    ...(f.isNew ? [{ label: "Neuheiten", param: "new" }] : []),
  ];

  const pageHref = (n: number) => {
    const p = new URLSearchParams();
    if (f.q) p.set("q", f.q);
    if (f.sizes.length) p.set("size", f.sizes.join(","));
    if (f.colors.length) p.set("color", f.colors.join(","));
    if (f.brands.length) p.set("brand", f.brands.join(","));
    if (f.minPrice != null) p.set("min", String(f.minPrice / 100));
    if (f.maxPrice != null) p.set("max", String(f.maxPrice / 100));
    if (f.inStock) p.set("stock", "1");
    if (f.sale) p.set("sale", "1");
    if (f.isNew) p.set("new", "1");
    if (f.sort !== "featured") p.set("sort", f.sort);
    if (n > 1) p.set("page", String(n));
    const qs = p.toString();
    return qs ? `${basePath}?${qs}` : basePath;
  };

  return (
    <div className="container-x pb-8 pt-[112px] md:pt-[132px]">
      <Breadcrumbs items={crumbs} />
      <div className="mb-10 mt-6 grid gap-4 md:mb-14 md:grid-cols-[1fr_auto] md:items-end">
        <div>
          <h1 data-reveal="up" className="h-lg">{title}</h1>
          {subtitle && <p data-reveal="up" style={{ "--d": "0.08s" } as React.CSSProperties} className="mt-5 max-w-[560px] text-[17px] leading-relaxed text-cream/60">{subtitle}</p>}
        </div>
        <nav aria-label="Kategorien" className="hidden gap-2 md:flex">
          {categories.map((c) => <Link key={c.slug} href={`/shop/${c.slug}`} className="chip" data-active={category?.slug === c.slug}>{c.name}</Link>)}
        </nav>
      </div>

      <div className="grid gap-x-12 lg:grid-cols-[250px_1fr]">
        <aside className="hidden lg:block">
          <div className="sticky top-[96px] max-h-[calc(100svh-120px)] overflow-y-auto pb-8 pr-3 scrollbar-none" data-lenis-prevent>
            <FilterPanel facets={data.facets} categories={category ? undefined : categories} activeCategory={category?.slug} />
          </div>
        </aside>

        <div>
          <CatalogToolbar total={data.total} sort={f.sort} facets={data.facets} categories={category ? undefined : categories} activeCategory={category?.slug} chips={chips} />

          {data.items.length === 0 ? (
            <div className="mt-16 rounded-3xl border border-white/10 px-6 py-20 text-center">
              <p className="text-2xl font-semibold tracking-tight">Keine passenden Produkte.</p>
              <p className="mx-auto mt-3 max-w-md text-cream/55">Mit weniger Filtern findest du bestimmt etwas Schönes.</p>
              <Link href={basePath} className="btn-primary mt-8">Filter zurücksetzen</Link>
            </div>
          ) : (
            <div className="catalog-grid mt-6 grid grid-cols-2 gap-x-4 gap-y-10 transition-opacity duration-300 md:grid-cols-3 md:gap-x-6 lg:mt-8 xl:grid-cols-4">
              {data.items.map((p, i) => (
                <div key={p.id} data-reveal="up" style={{ "--d": `${(i % 4) * 0.07}s` } as React.CSSProperties}>
                  <ProductCard p={p} priority={i < 4} sizes="(min-width:1280px) 22vw, (min-width:768px) 30vw, 50vw" />
                </div>
              ))}
            </div>
          )}

          {data.pages > 1 && (
            <nav aria-label="Seiten" className="mt-16 flex flex-wrap items-center justify-center gap-2">
              {data.page > 1 && <Link href={pageHref(data.page - 1)} className="btn-ghost btn-sm">Zurück</Link>}
              {Array.from({ length: data.pages }, (_, i) => i + 1).map((n) => (
                <Link key={n} href={pageHref(n)} aria-current={n === data.page ? "page" : undefined} className="chip" data-active={n === data.page}>{n}</Link>
              ))}
              {data.page < data.pages && <Link href={pageHref(data.page + 1)} className="btn-ghost btn-sm">Weiter</Link>}
            </nav>
          )}
        </div>
      </div>

      {intro && (
        <section className="mt-24 grid gap-6 border-t border-white/10 pt-12 md:grid-cols-[1fr_2fr]">
          <h2 className="h-md">{title} bei LUMI</h2>
          <p className="max-w-[720px] text-[16px] leading-[1.75] text-cream/65">{intro}</p>
        </section>
      )}
    </div>
  );
}
