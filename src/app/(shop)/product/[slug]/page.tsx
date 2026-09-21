import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getProductBySlug, getRelated } from "@/lib/catalog";
import { getSettings } from "@/lib/settings";
import { formatEUR } from "@/lib/money";
import { appUrl } from "@/lib/env";
import { ProductPurchase, type PVariant } from "@/components/product/ProductPurchase";
import { Accordion } from "@/components/product/Accordion";
import { ReviewSection } from "@/components/product/ReviewSection";
import { ProductCard } from "@/components/product/ProductCard";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { JsonLd } from "@/components/ui/JsonLd";

export const revalidate = 60;
type Params = Promise<{ slug: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const p = await getProductBySlug((await params).slug);
  if (!p) return {};
  const title = p.seoTitle || `${p.name} kaufen`;
  const description = p.seoDescription || p.shortDescription;
  const img = p.images[0]?.url;
  return {
    title, description,
    alternates: { canonical: `/product/${p.slug}` },
    openGraph: { title, description, type: "website", url: `/product/${p.slug}`, images: img ? [{ url: img }] : undefined },
  };
}

export default async function ProductPage({ params }: { params: Params }) {
  const p = await getProductBySlug((await params).slug);
  if (!p) notFound();
  const [related, settings] = await Promise.all([getRelated(p.id, p.categoryId), getSettings()]);

  const variants: PVariant[] = p.variants.map((v) => ({
    id: v.id, size: v.size, color: v.color, colorHex: v.colorHex,
    qty: v.inventory?.quantity ?? 0, lowStock: v.inventory?.lowStockThreshold ?? 3,
  }));
  const onSale = p.salePriceCents != null && p.salePriceCents < p.basePriceCents;
  const inStock = variants.some((v) => v.qty > 0);
  const url = `${appUrl()}/product/${p.slug}`;
  const sizeRows = p.sizeGuide?.split("\n").map((r) => r.split("|")) ?? [];

  const jsonLd = {
    "@context": "https://schema.org", "@type": "Product",
    name: p.name, description: p.shortDescription || p.description, sku: p.sku,
    image: p.images.map((i) => (i.url.startsWith("http") ? i.url : `${appUrl()}${i.url}`)),
    brand: p.brand ? { "@type": "Brand", name: p.brand.name } : undefined,
    category: p.category.name,
    material: p.material ?? undefined,
    offers: {
      "@type": "Offer", url, priceCurrency: "EUR", price: (p.currentPriceCents / 100).toFixed(2),
      availability: inStock ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
      itemCondition: "https://schema.org/NewCondition",
    },
    ...(p.ratingCount > 0 ? {
      aggregateRating: { "@type": "AggregateRating", ratingValue: p.ratingAvg.toFixed(1), reviewCount: p.ratingCount },
      review: p.reviews.slice(0, 5).map((r) => ({
        "@type": "Review", reviewRating: { "@type": "Rating", ratingValue: r.rating },
        author: { "@type": "Person", name: r.user.firstName }, reviewBody: r.body, datePublished: r.createdAt.toISOString().slice(0, 10),
      })),
    } : {}),
  };
  const crumbs = [
    { name: "Startseite", href: "/" }, { name: "Shop", href: "/shop" },
    { name: p.category.name, href: `/shop/${p.category.slug}` }, { name: p.name },
  ];

  return (
    <div className="container-x pb-32 pt-[104px] md:pt-[124px] lg:pb-16">
      <Breadcrumbs items={crumbs} />
      <div className="mt-6">
        <ProductPurchase
          productId={p.id} name={p.name} brand={p.brand?.name ?? null} shortDescription={p.shortDescription} sku={p.sku}
          priceCents={p.currentPriceCents} compareAtCents={onSale ? p.basePriceCents : null}
          rating={p.ratingAvg} ratingCount={p.ratingCount} variants={variants}
          images={p.images.map((i) => ({ url: i.url, alt: i.alt, color: i.color }))}
          freeShippingFrom={formatEUR(settings.freeShippingThresholdCents)} returnDays={settings.returnDays}
        />
      </div>

      <div className="mx-auto mt-20 max-w-[860px]" id="details">
        <Accordion
          defaultOpen={0}
          items={[
            { id: "desc", title: "Beschreibung", content: <p>{p.description}</p> },
            { id: "mat", title: "Material & Pflege", content: <div className="space-y-3"><p>{p.material ?? "–"}</p>{p.careInfo && <p>{p.careInfo}</p>}</div> },
            ...(sizeRows.length ? [{
              id: "sizes", title: "Größentabelle",
              content: (
                <div id="groessentabelle" className="overflow-x-auto" data-lenis-prevent>
                  <table className="w-full min-w-[420px] text-left text-[14px]">
                    <thead><tr>{sizeRows[0].map((h) => <th key={h} className="border-b border-white/15 pb-3 pr-6 text-[12px] font-medium uppercase tracking-wider text-cream/50">{h}</th>)}</tr></thead>
                    <tbody>{sizeRows.slice(1).map((r, i) => <tr key={i}>{r.map((c, j) => <td key={j} className={`border-b border-white/[0.06] py-3 pr-6 ${j === 0 ? "font-medium text-cream" : ""}`}>{c}</td>)}</tr>)}</tbody>
                  </table>
                  <p className="mt-4 text-[13px]">Tipp: Miss dein Kind ohne Schuhe und wähle im Zweifel die größere Größe.</p>
                </div>
              ),
            }] : []),
            { id: "ship", title: "Versand", content: <p>Standardversand innerhalb Deutschlands und Österreichs in 2–4 Werktagen, ab {formatEUR(settings.freeShippingThresholdCents)} Bestellwert kostenlos (sonst {formatEUR(settings.shippingStandardCents)}). Expressversand (1–2 Werktage) für {formatEUR(settings.shippingExpressCents)}. Mehr dazu unter <Link href="/versand" className="underline underline-offset-2">Versand</Link>.</p> },
            { id: "ret", title: "Retouren", content: <p>Du hast {settings.returnDays} Tage Zeit, deine Bestellung zurückzusenden. Details und Muster-Widerrufsformular findest du in der <Link href="/widerruf" className="underline underline-offset-2">Widerrufsbelehrung</Link>.</p> },
          ]}
        />
      </div>

      <ReviewSection
        productId={p.id} rating={p.ratingAvg} count={p.ratingCount}
        reviews={p.reviews.map((r) => ({ id: r.id, rating: r.rating, title: r.title, body: r.body, author: r.user.firstName, date: r.createdAt.toLocaleDateString("de-DE") }))}
      />

      {related.length > 0 && (
        <section className="border-t border-white/10 pt-16 md:pt-24" aria-label="Das könnte dir auch gefallen">
          <h2 data-reveal="up" className="h-md mb-10">Das könnte dir<br className="md:hidden" /> auch gefallen.</h2>
          <div data-reveal-stagger="0.09" className="grid grid-cols-2 gap-x-4 gap-y-10 md:gap-x-6 lg:grid-cols-4">
            {related.map((r) => <div data-reveal="up" key={r.id}><ProductCard p={r} /></div>)}
          </div>
        </section>
      )}

      <JsonLd data={[jsonLd, {
        "@context": "https://schema.org", "@type": "BreadcrumbList",
        itemListElement: crumbs.map((c, i) => ({ "@type": "ListItem", position: i + 1, name: c.name, item: c.href ? `${appUrl()}${c.href === "/" ? "" : c.href}` : url })),
      }]} />
    </div>
  );
}
