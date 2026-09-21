import Link from "next/link";
import { db } from "@/lib/db";
import { getCards, getCategories } from "@/lib/catalog";
import { HeroScroll } from "@/components/home/HeroScroll";
import { EditorialStory } from "@/components/home/EditorialStory";
import { CategoryStory } from "@/components/home/CategoryStory";
import { CampaignBand, SplitFeature, UspStrip } from "@/components/home/HomeBits";
import { HorizontalScroll } from "@/components/motion/HorizontalScroll";
import { ProductCard } from "@/components/product/ProductCard";
import { NewsletterForm } from "@/components/layout/Newsletter";
import { ArrowRight } from "@/components/ui/Icons";

export const revalidate = 60;

const CAT_COPY: Record<string, { text: string; cut: string; image: string }> = {
  junge: { text: "Hoodies, Jogger und Jacken für Jungs, die klettern, rennen und alles ausprobieren.", cut: "/seed/e/cat-junge-cut.webp", image: "/seed/e/cat-junge.webp" },
  maedchen: { text: "Kleider, Röcke und Strick – feine Details für Mädchen mit eigenem Stil.", cut: "/seed/e/cat-maedchen-cut.webp", image: "/seed/e/cat-maedchen.webp" },
  schuhe: { text: "Sneaker, Boots und Ballerinas mit Passform – leicht, flexibel, bereit für lange Tage.", cut: "/seed/e/cat-schuhe-cut.webp", image: "/seed/e/cat-schuhe.webp" },
  "dies-und-das": { text: "Rucksäcke, Mützen, Kuscheltiere und kleine Lieblingsstücke für den Alltag.", cut: "/seed/e/cat-dies-cut.webp", image: "/seed/e/cat-dies.webp" },
};

export default async function HomePage() {
  const [newest, best, sale, categories, stats] = await Promise.all([
    getCards({}, [{ createdAt: "desc" }], 8),
    getCards({}, [{ soldCount: "desc" }], 8),
    getCards({ salePriceCents: { not: null } }, [{ soldCount: "desc" }], 4),
    getCategories(),
    db.product.groupBy({ by: ["categoryId"], where: { status: "ACTIVE" }, _count: true, _min: { currentPriceCents: true } }),
  ]);
  const stat = new Map(stats.map((s) => [s.categoryId, s]));

  return (
    <>
      <HeroScroll />

      <div className="relative z-10 -mt-[36svh] rounded-t-[44px] bg-ink-950 shadow-[0_-40px_80px_-30px_rgba(0,0,0,0.8)] max-md:-mt-[24svh]">
        <UspStrip />

        {/* Neue Kollektion – horizontaler Scroll */}
        <HorizontalScroll
          header={
            <div className="container-x mb-10 flex items-end justify-between gap-6">
              <div>
                <p data-reveal="fade" className="eyebrow mb-4">Neue Kollektion</p>
                <h2 data-reveal="up" className="h-lg">Neue<br className="md:hidden" /> Lieblingsstücke.</h2>
              </div>
              <Link href="/shop?sort=new&new=1" className="btn-ghost hidden shrink-0 md:inline-flex">Alle Neuheiten <ArrowRight width={18} height={18} /></Link>
            </div>
          }
        >
          {newest.map((p, i) => (
            <div key={p.id} className="w-[72vw] shrink-0 snap-start sm:w-[44vw] md:w-[min(26vw,380px)]"><ProductCard p={p} priority={i < 3} sizes="(min-width:900px) 26vw, 72vw" /></div>
          ))}
          <div className="flex w-[70vw] shrink-0 snap-start items-center justify-center md:w-[26vw] md:pr-12">
            <Link href="/shop?sort=new&new=1" className="group flex flex-col items-center gap-4 text-center">
              <span className="flex h-24 w-24 items-center justify-center rounded-full border border-white/15 transition-all duration-500 ease-premium group-hover:scale-110 group-hover:border-rose-300 group-hover:bg-rose-300 group-hover:text-ink-950"><ArrowRight width={30} height={30} /></span>
              <span className="text-[15px] font-medium">Alle Neuheiten ansehen</span>
            </Link>
          </div>
        </HorizontalScroll>

        <EditorialStory />

        {/* Bestseller */}
        <section className="container-x py-24 md:py-36" aria-label="Bestseller">
          <div className="mb-12 flex items-end justify-between gap-6">
            <div><p data-reveal="fade" className="eyebrow mb-4">Bestseller</p><h2 data-reveal="up" className="h-lg">Das lieben<br /> unsere Kunden.</h2></div>
            <Link href="/shop?sort=bestseller" className="btn-ghost hidden md:inline-flex">Alle Bestseller <ArrowRight width={18} height={18} /></Link>
          </div>
          <div data-reveal-stagger="0.09" className="grid grid-cols-2 gap-x-4 gap-y-10 md:grid-cols-3 md:gap-x-6 xl:grid-cols-4">
            {best.slice(0, 8).map((p) => <div data-reveal="up" key={p.id}><ProductCard p={p} /></div>)}
          </div>
        </section>
      </div>

      {/* Kategorie-Storys */}
      <div className="bg-ink-950">
        {categories.map((c, i) => {
          const copy = CAT_COPY[c.slug]; const s = stat.get(c.id);
          if (!copy) return null;
          return <CategoryStory key={c.id} index={i} title={c.name} slug={c.slug} text={copy.text} image={copy.image} cutout={copy.cut} count={s?._count ?? 0} fromCents={s?._min.currentPriceCents ?? null} flip={i % 2 === 1} />;
        })}
      </div>

      {/* Sale */}
      {sale.length > 0 && (
        <section className="container-x bg-ink-950 py-24 md:py-36" aria-label="Angebote">
          <div className="mb-12 flex items-end justify-between gap-6">
            <div><p data-reveal="fade" className="eyebrow mb-4">Sale</p><h2 data-reveal="up" className="h-lg">Ausgewählte<br />Angebote.</h2></div>
            <Link href="/shop?sale=1" className="btn-ghost hidden md:inline-flex">Alle Angebote <ArrowRight width={18} height={18} /></Link>
          </div>
          <div data-reveal-stagger="0.09" className="grid grid-cols-2 gap-x-4 gap-y-10 md:gap-x-6 lg:grid-cols-4">
            {sale.map((p) => <div data-reveal="up" key={p.id}><ProductCard p={p} /></div>)}
          </div>
        </section>
      )}

      <div className="bg-ink-950">
        <CampaignBand />
        <SplitFeature />

        {/* Newsletter */}
        <section className="container-x pb-8" aria-label="Newsletter">
          <div data-reveal="scale" className="relative overflow-hidden rounded-[36px] border border-white/10 bg-gradient-to-br from-plum-800 via-plum-900 to-ink-900 p-8 md:p-16 grain">
            <div className="pointer-events-none absolute -right-20 -top-20 h-80 w-80 rounded-full bg-rose-500/30 blur-[90px]" />
            <div className="relative grid items-end gap-10 md:grid-cols-2">
              <div><p className="eyebrow mb-4">Newsletter</p><h2 className="h-lg">Neues zuerst<br />erfahren.</h2><p className="mt-5 max-w-[400px] text-cream/65">Neue Kollektionen, Sale-Starts und Ideen – höchstens zweimal im Monat.</p></div>
              <NewsletterForm />
            </div>
          </div>
        </section>
      </div>
    </>
  );
}
