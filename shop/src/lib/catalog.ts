import type { Prisma } from "@prisma/client";
import { db } from "./db";

export const NEW_DAYS = 45;
export const PAGE_SIZE = 24;

export type SortKey = "featured" | "new" | "bestseller" | "price-asc" | "price-desc";
export const SORT_LABELS: Record<SortKey, string> = {
  featured: "Empfohlen",
  new: "Neuheiten",
  bestseller: "Bestseller",
  "price-asc": "Preis aufsteigend",
  "price-desc": "Preis absteigend",
};

export type Filters = {
  category?: string;
  q?: string;
  sizes: string[];
  colors: string[];
  brands: string[];
  minPrice?: number; // Cent
  maxPrice?: number; // Cent
  inStock: boolean;
  sale: boolean;
  isNew: boolean;
  sort: SortKey;
  page: number;
};

type SP = Record<string, string | string[] | undefined>;
const list = (v: string | string[] | undefined) =>
  (Array.isArray(v) ? v : v ? v.split(",") : []).map((s) => s.trim()).filter(Boolean).slice(0, 20);
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
const num = (v: string | string[] | undefined) => {
  const n = Number(one(v));
  return Number.isFinite(n) && one(v) !== "" && one(v) != null ? Math.round(n * 100) : undefined;
};

export function parseFilters(sp: SP, category?: string): Filters {
  const sort = one(sp.sort) as SortKey;
  return {
    category: category ?? one(sp.category),
    q: one(sp.q)?.slice(0, 80) || undefined,
    sizes: list(sp.size),
    colors: list(sp.color),
    brands: list(sp.brand),
    minPrice: num(sp.min),
    maxPrice: num(sp.max),
    inStock: one(sp.stock) === "1",
    sale: one(sp.sale) === "1",
    isNew: one(sp.new) === "1",
    sort: sort in SORT_LABELS ? sort : "featured",
    page: Math.max(1, parseInt(one(sp.page) ?? "1", 10) || 1),
  };
}

// ───────────────────────── Karten-Daten ─────────────────────────

const cardInclude = {
  images: { orderBy: { position: "asc" as const } },
  brand: { select: { name: true, slug: true } },
  category: { select: { name: true, slug: true } },
  variants: {
    where: { isActive: true },
    orderBy: { position: "asc" as const },
    include: { inventory: { select: { quantity: true, lowStockThreshold: true } } },
  },
} satisfies Prisma.ProductInclude;

type CardRow = Prisma.ProductGetPayload<{ include: typeof cardInclude }>;

export type CardVariant = { id: string; size: string | null; color: string | null; qty: number };
export type ProductCardData = {
  id: string;
  slug: string;
  name: string;
  shortDescription: string;
  priceCents: number;
  compareAtCents: number | null;
  image: string | null;
  image2: string | null;
  imageAlt: string;
  brand: string | null;
  category: { name: string; slug: string };
  colors: { name: string; hex: string | null }[];
  variants: CardVariant[];
  soldOut: boolean;
  lowStock: number | null;
  isNew: boolean;
  rating: number;
  ratingCount: number;
};

export function toCard(p: CardRow): ProductCardData {
  const variants = p.variants.map((v) => ({
    id: v.id, size: v.size, color: v.color, qty: v.inventory?.quantity ?? 0,
  }));
  const total = variants.reduce((s, v) => s + v.qty, 0);
  const lowest = p.variants
    .map((v) => v.inventory)
    .filter((i): i is NonNullable<typeof i> => !!i && i.quantity > 0 && i.quantity <= i.lowStockThreshold)
    .map((i) => i.quantity);
  const firstColor = p.variants.find((v) => v.color)?.color ?? null;
  const imgs = p.images;
  const primary = imgs.filter((i) => !i.color || i.color === firstColor);
  const seen = new Map<string, { name: string; hex: string | null }>();
  for (const v of p.variants) if (v.color && !seen.has(v.color)) seen.set(v.color, { name: v.color, hex: v.colorHex });
  return {
    id: p.id,
    slug: p.slug,
    name: p.name,
    shortDescription: p.shortDescription,
    priceCents: p.currentPriceCents,
    compareAtCents: p.salePriceCents != null && p.salePriceCents < p.basePriceCents ? p.basePriceCents : null,
    image: (primary[0] ?? imgs[0])?.url ?? null,
    image2: (primary[1] ?? imgs[1])?.url ?? null,
    imageAlt: (primary[0] ?? imgs[0])?.alt || p.name,
    brand: p.brand?.name ?? null,
    category: p.category,
    colors: [...seen.values()],
    variants,
    soldOut: total === 0,
    lowStock: lowest.length ? Math.min(...lowest) : null,
    isNew: Date.now() - p.createdAt.getTime() < NEW_DAYS * 86400_000,
    rating: p.ratingAvg,
    ratingCount: p.ratingCount,
  };
}

// ───────────────────────── Katalog-Query ─────────────────────────

export function buildWhere(f: Filters, opts: { ignoreFacets?: boolean } = {}): Prisma.ProductWhereInput {
  const and: Prisma.ProductWhereInput[] = [{ status: "ACTIVE" }, { category: { isActive: true } }];
  if (f.category) and.push({ category: { slug: f.category } });
  if (f.q) {
    const q = f.q;
    and.push({
      OR: [
        { name: { contains: q, mode: "insensitive" } },
        { shortDescription: { contains: q, mode: "insensitive" } },
        { sku: { contains: q, mode: "insensitive" } },
        { brand: { name: { contains: q, mode: "insensitive" } } },
        { category: { name: { contains: q, mode: "insensitive" } } },
        { variants: { some: { sku: { contains: q, mode: "insensitive" } } } },
      ],
    });
  }
  if (!opts.ignoreFacets) {
    const variantFilter: Prisma.ProductVariantWhereInput = { isActive: true };
    if (f.sizes.length) variantFilter.size = { in: f.sizes };
    if (f.colors.length) variantFilter.color = { in: f.colors };
    if (f.inStock) variantFilter.inventory = { is: { quantity: { gt: 0 } } };
    if (f.sizes.length || f.colors.length || f.inStock) and.push({ variants: { some: variantFilter } });
    if (f.brands.length) and.push({ brand: { slug: { in: f.brands } } });
    if (f.minPrice != null || f.maxPrice != null)
      and.push({ currentPriceCents: { gte: f.minPrice, lte: f.maxPrice } });
    if (f.sale) and.push({ salePriceCents: { not: null } });
    if (f.isNew) and.push({ createdAt: { gte: new Date(Date.now() - NEW_DAYS * 86400_000) } });
  }
  return { AND: and };
}

const orderFor = (sort: SortKey): Prisma.ProductOrderByWithRelationInput[] => {
  switch (sort) {
    case "new": return [{ createdAt: "desc" }];
    case "bestseller": return [{ soldCount: "desc" }, { createdAt: "desc" }];
    case "price-asc": return [{ currentPriceCents: "asc" }];
    case "price-desc": return [{ currentPriceCents: "desc" }];
    default: return [{ featured: "desc" }, { createdAt: "desc" }];
  }
};

export type Facets = {
  sizes: { value: string; count: number }[];
  colors: { value: string; hex: string | null; count: number }[];
  brands: { slug: string; name: string; count: number }[];
  price: { min: number; max: number };
};

const SIZE_ORDER = ["XXS", "XS", "S", "M", "L", "XL", "XXL"];
const sizeRank = (s: string) => {
  const i = SIZE_ORDER.indexOf(s);
  if (i >= 0) return i;
  const n = parseFloat(s);
  return Number.isFinite(n) ? 100 + n : 1000;
};

export async function getCatalog(f: Filters) {
  const where = buildWhere(f);
  const [rows, total, scope] = await Promise.all([
    db.product.findMany({
      where, include: cardInclude, orderBy: orderFor(f.sort),
      skip: (f.page - 1) * PAGE_SIZE, take: PAGE_SIZE,
    }),
    db.product.count({ where }),
    // Facetten über den Kategorie-/Such-Scope, unabhängig von den gesetzten Facettenfiltern
    db.product.findMany({
      where: buildWhere(f, { ignoreFacets: true }),
      select: {
        currentPriceCents: true,
        brand: { select: { slug: true, name: true } },
        variants: { where: { isActive: true }, select: { size: true, color: true, colorHex: true } },
      },
    }),
  ]);

  const sizes = new Map<string, number>();
  const colors = new Map<string, { hex: string | null; count: number }>();
  const brands = new Map<string, { name: string; count: number }>();
  let min = Infinity, max = 0;
  for (const p of scope) {
    min = Math.min(min, p.currentPriceCents);
    max = Math.max(max, p.currentPriceCents);
    if (p.brand) brands.set(p.brand.slug, { name: p.brand.name, count: (brands.get(p.brand.slug)?.count ?? 0) + 1 });
    const s = new Set<string>(), c = new Set<string>();
    for (const v of p.variants) {
      if (v.size) s.add(v.size);
      if (v.color) { c.add(v.color); if (!colors.has(v.color)) colors.set(v.color, { hex: v.colorHex, count: 0 }); }
    }
    s.forEach((x) => sizes.set(x, (sizes.get(x) ?? 0) + 1));
    c.forEach((x) => (colors.get(x)!.count += 1));
  }
  const facets: Facets = {
    sizes: [...sizes].map(([value, count]) => ({ value, count })).sort((a, b) => sizeRank(a.value) - sizeRank(b.value)),
    colors: [...colors].map(([value, v]) => ({ value, ...v })).sort((a, b) => b.count - a.count),
    brands: [...brands].map(([slug, v]) => ({ slug, ...v })).sort((a, b) => a.name.localeCompare(b.name)),
    price: { min: min === Infinity ? 0 : min, max },
  };
  return { items: rows.map(toCard), total, pages: Math.max(1, Math.ceil(total / PAGE_SIZE)), page: f.page, facets };
}

export async function getCategories() {
  return db.category.findMany({ where: { isActive: true }, orderBy: { sortOrder: "asc" } });
}

export async function getCategory(slug: string) {
  return db.category.findFirst({ where: { slug, isActive: true } });
}

export async function getCards(where: Prisma.ProductWhereInput, orderBy: Prisma.ProductOrderByWithRelationInput[], take: number) {
  const rows = await db.product.findMany({
    where: { AND: [{ status: "ACTIVE", category: { isActive: true } }, where] },
    include: cardInclude, orderBy, take,
  });
  return rows.map(toCard);
}

export async function searchProducts(q: string, limit = 8) {
  const f = parseFilters({ q });
  const rows = await db.product.findMany({
    where: buildWhere(f), include: cardInclude,
    orderBy: [{ soldCount: "desc" }, { createdAt: "desc" }], take: limit,
  });
  const categories = await db.category.findMany({
    where: { isActive: true, name: { contains: q, mode: "insensitive" } }, take: 4,
    select: { slug: true, name: true },
  });
  return { products: rows.map(toCard), categories };
}

// ───────────────────────── Produktdetail ─────────────────────────

export async function getProductBySlug(slug: string) {
  return db.product.findFirst({
    where: { slug, status: "ACTIVE", category: { isActive: true } },
    include: {
      images: { orderBy: { position: "asc" } },
      brand: true,
      category: true,
      variants: {
        where: { isActive: true },
        orderBy: { position: "asc" },
        include: { inventory: { select: { quantity: true, lowStockThreshold: true } } },
      },
      reviews: {
        where: { status: "APPROVED" },
        orderBy: { createdAt: "desc" },
        take: 20,
        include: { user: { select: { firstName: true } } },
      },
    },
  });
}

export async function getRelated(productId: string, categoryId: string, take = 4) {
  return getCards({ id: { not: productId }, categoryId }, [{ soldCount: "desc" }], take);
}

export { sizeRank };
