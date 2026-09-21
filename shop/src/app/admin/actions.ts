"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth/guards";
import { audit } from "@/lib/audit";
import { fd } from "@/lib/validation";
import { slugify } from "@/lib/slug";
import { toCents, effectivePrice } from "@/lib/money";
import { saveSettings, SETTINGS_DEFAULTS, type Settings } from "@/lib/settings";
import { cancelOrder, markDelivered, markOrderPaid, refundOrder, shipOrder } from "@/lib/orders";
import { ApiError } from "@/lib/http";
import { DOC_MIMES, MAX_UPLOAD_BYTES, saveFile, storage } from "@/lib/storage";
import type { FormState } from "@/components/ui/Form";

const bust = () => { revalidatePath("/", "layout"); };
const zerr = (e: z.ZodError): FormState => ({ error: e.issues[0]?.message ?? "Ungültige Eingabe", fieldErrors: Object.fromEntries(e.issues.map((i) => [String(i.path.join(".")), i.message])) });
const fail = (e: unknown): FormState => ({ error: e instanceof ApiError || e instanceof Error ? e.message : "Unbekannter Fehler" });

// ───────────────────────── Produkte ─────────────────────────

const imageUrl = z.string().trim().min(1).refine((u) => /^(\/media\/|\/seed\/|https:\/\/)/.test(u), "Bild-URL muss auf /media/, /seed/ oder https:// zeigen");
const productSchema = z.object({
  id: z.string().optional(),
  name: z.string().trim().min(2, "Name fehlt").max(140),
  slug: z.string().trim().max(120).optional(),
  shortDescription: z.string().trim().max(240).default(""),
  description: z.string().trim().max(8000).default(""),
  material: z.string().trim().max(400).optional(),
  careInfo: z.string().trim().max(600).optional(),
  sizeGuide: z.string().trim().max(3000).optional(),
  sku: z.string().trim().min(2, "SKU fehlt").max(60),
  basePrice: z.string().min(1, "Preis fehlt"),
  salePrice: z.string().optional(),
  status: z.enum(["DRAFT", "ACTIVE", "INACTIVE"]),
  weightGrams: z.string().optional(),
  categoryId: z.string().min(1, "Kategorie wählen"),
  brandId: z.string().optional(),
  seoTitle: z.string().trim().max(70).optional(),
  seoDescription: z.string().trim().max(170).optional(),
  featured: z.boolean().default(false),
  images: z.array(z.object({ id: z.string().optional(), url: imageUrl, alt: z.string().trim().max(200).default(""), color: z.string().trim().max(40).nullable().optional() })).max(30),
  variants: z.array(z.object({
    id: z.string().optional(), sku: z.string().trim().min(2, "Varianten-SKU fehlt").max(80),
    size: z.string().trim().max(20).nullable().optional(), color: z.string().trim().max(40).nullable().optional(),
    colorHex: z.string().trim().regex(/^#[0-9a-fA-F]{6}$/, "Farbwert im Format #RRGGBB").nullable().optional().or(z.literal("")),
    quantity: z.number().int().min(0).max(100000), threshold: z.number().int().min(0).max(1000).default(3), isActive: z.boolean().default(true),
  })).max(200),
});

export async function saveProductAction(_: FormState, form: FormData): Promise<FormState> {
  const admin = await requireAdmin();
  let raw: unknown;
  try { raw = JSON.parse(fd(form, "payload")); } catch { return { error: "Ungültige Formulardaten." }; }
  const parsed = productSchema.safeParse(raw);
  if (!parsed.success) return zerr(parsed.error);
  const p = parsed.data;

  let base: number, sale: number | null = null;
  try { base = toCents(p.basePrice); if (p.salePrice?.trim()) sale = toCents(p.salePrice); } catch { return { error: "Preis ungültig.", fieldErrors: { basePrice: "Ungültiger Betrag" } }; }
  if (base <= 0) return { fieldErrors: { basePrice: "Preis muss größer als 0 sein" }, error: "Preis muss größer als 0 sein." };
  if (sale != null && sale >= base) return { fieldErrors: { salePrice: "Sale-Preis muss unter dem Preis liegen" }, error: "Sale-Preis muss unter dem regulären Preis liegen." };
  if (p.status === "ACTIVE" && p.variants.filter((v) => v.isActive).length === 0) return { error: "Ein aktives Produkt braucht mindestens eine aktive Variante." };

  const slug = slugify(p.slug || p.name);
  if (!slug) return { error: "Slug konnte nicht erzeugt werden." };
  const skus = p.variants.map((v) => v.sku);
  if (new Set(skus).size !== skus.length) return { error: "Varianten-SKUs müssen eindeutig sein." };

  const clash = await db.product.findFirst({ where: { id: { not: p.id ?? "" }, OR: [{ slug }, { sku: p.sku }] }, select: { slug: true, sku: true } });
  if (clash) return { error: clash.slug === slug ? `Der Slug „${slug}“ ist bereits vergeben.` : `Die SKU „${p.sku}“ ist bereits vergeben.` };
  const vClash = await db.productVariant.findFirst({ where: { sku: { in: skus }, ...(p.id ? { productId: { not: p.id } } : {}) }, select: { sku: true } });
  if (vClash) return { error: `Varianten-SKU „${vClash.sku}“ wird bereits von einem anderen Produkt verwendet.` };

  const data: Prisma.ProductUncheckedUpdateInput = {
    name: p.name, slug, shortDescription: p.shortDescription, description: p.description,
    material: p.material || null, careInfo: p.careInfo || null, sizeGuide: p.sizeGuide || null, sku: p.sku,
    basePriceCents: base, salePriceCents: sale, currentPriceCents: effectivePrice(base, sale), status: p.status,
    weightGrams: p.weightGrams?.trim() ? Math.max(0, parseInt(p.weightGrams, 10) || 0) : null,
    categoryId: p.categoryId, brandId: p.brandId || null, seoTitle: p.seoTitle || null, seoDescription: p.seoDescription || null, featured: p.featured,
  };

  const id = await db.$transaction(async (tx) => {
    const prod = p.id
      ? await tx.product.update({ where: { id: p.id }, data })
      : await tx.product.create({ data: data as Prisma.ProductUncheckedCreateInput });

    // Bilder: Menge abgleichen
    const keepImg = p.images.filter((i) => i.id).map((i) => i.id!);
    await tx.productImage.deleteMany({ where: { productId: prod.id, id: { notIn: keepImg } } });
    for (const [pos, im] of p.images.entries()) {
      const d = { url: im.url, alt: im.alt, color: im.color || null, position: pos };
      if (im.id) await tx.productImage.updateMany({ where: { id: im.id, productId: prod.id }, data: d });
      else await tx.productImage.create({ data: { ...d, productId: prod.id } });
    }

    // Varianten: vorhandene aktualisieren, neue anlegen, entfernte löschen (bzw. deaktivieren, wenn bereits bestellt)
    const keepVar = p.variants.filter((v) => v.id).map((v) => v.id!);
    const removed = await tx.productVariant.findMany({ where: { productId: prod.id, id: { notIn: keepVar } }, select: { id: true, _count: { select: { orderItems: true } } } });
    for (const r of removed) {
      if (r._count.orderItems > 0) await tx.productVariant.update({ where: { id: r.id }, data: { isActive: false } });
      else await tx.productVariant.delete({ where: { id: r.id } });
    }
    for (const [pos, v] of p.variants.entries()) {
      const d = { sku: v.sku, size: v.size || null, color: v.color || null, colorHex: v.colorHex || null, isActive: v.isActive, position: pos };
      if (v.id) {
        await tx.productVariant.updateMany({ where: { id: v.id, productId: prod.id }, data: d });
        await tx.inventory.upsert({ where: { variantId: v.id }, update: { quantity: v.quantity, lowStockThreshold: v.threshold }, create: { variantId: v.id, quantity: v.quantity, lowStockThreshold: v.threshold } });
      } else {
        await tx.productVariant.create({ data: { ...d, productId: prod.id, inventory: { create: { quantity: v.quantity, lowStockThreshold: v.threshold } } } });
      }
    }
    return prod.id;
  });

  await audit(admin.id, p.id ? "product.update" : "product.create", "Product", id, { name: p.name, status: p.status });
  bust();
  if (!p.id) redirect(`/admin/products/${id}?created=1`);
  return { ok: "Produkt gespeichert." };
}

export async function deleteProductAction(_: FormState, form: FormData): Promise<FormState> {
  const admin = await requireAdmin();
  const id = fd(form, "id");
  const p = await db.product.findUnique({ where: { id }, select: { name: true, _count: { select: { orderItems: true } } } });
  if (!p) return { error: "Produkt nicht gefunden." };
  if (p._count.orderItems > 0) return { error: "Dieses Produkt wurde bereits bestellt und kann nicht gelöscht werden. Bitte deaktiviere es stattdessen." };
  await db.product.delete({ where: { id } });
  await audit(admin.id, "product.delete", "Product", id, { name: p.name });
  bust();
  redirect("/admin/products");
}

export async function setProductStatusAction(form: FormData) {
  const admin = await requireAdmin();
  const id = fd(form, "id"), status = z.enum(["DRAFT", "ACTIVE", "INACTIVE"]).parse(fd(form, "status"));
  await db.product.update({ where: { id }, data: { status } });
  await audit(admin.id, "product.status", "Product", id, { status });
  bust();
}

// ───────────────────────── Kategorien ─────────────────────────

const categorySchema = z.object({
  id: z.string().optional(), name: z.string().trim().min(2, "Name fehlt").max(80), slug: z.string().trim().max(80).optional(),
  description: z.string().trim().max(300).optional(), introText: z.string().trim().max(3000).optional(),
  seoTitle: z.string().trim().max(70).optional(), seoDescription: z.string().trim().max(170).optional(),
  image: z.string().trim().max(300).optional().refine((u) => !u || /^(\/media\/|\/seed\/|https:\/\/)/.test(u), "Ungültige Bild-URL"),
  sortOrder: z.coerce.number().int().min(0).max(999).default(0),
});

export async function saveCategoryAction(_: FormState, form: FormData): Promise<FormState> {
  const admin = await requireAdmin();
  const parsed = categorySchema.safeParse(Object.fromEntries([...form.entries()].filter(([, v]) => typeof v === "string")));
  if (!parsed.success) return zerr(parsed.error);
  const c = parsed.data;
  const slug = slugify(c.slug || c.name);
  if (await db.category.findFirst({ where: { slug, id: { not: c.id ?? "" } } })) return { error: `Der Slug „${slug}“ ist bereits vergeben.` };
  const data = { name: c.name, slug, description: c.description || null, introText: c.introText || null, seoTitle: c.seoTitle || null, seoDescription: c.seoDescription || null, image: c.image || null, sortOrder: c.sortOrder, isActive: form.get("isActive") === "on" };
  const rec = c.id ? await db.category.update({ where: { id: c.id }, data }) : await db.category.create({ data });
  await audit(admin.id, c.id ? "category.update" : "category.create", "Category", rec.id, { name: c.name });
  bust();
  return { ok: "Kategorie gespeichert." };
}

export async function deleteCategoryAction(_: FormState, form: FormData): Promise<FormState> {
  const admin = await requireAdmin();
  const id = fd(form, "id");
  if ((await db.product.count({ where: { categoryId: id } })) > 0) return { error: "Kategorie enthält noch Produkte." };
  await db.category.delete({ where: { id } });
  await audit(admin.id, "category.delete", "Category", id);
  bust();
  return { ok: "Kategorie gelöscht." };
}

// ───────────────────────── Marken ─────────────────────────

export async function saveBrandAction(_: FormState, form: FormData): Promise<FormState> {
  const admin = await requireAdmin();
  const name = fd(form, "name").trim(), id = fd(form, "id");
  if (name.length < 2 || name.length > 80) return { error: "Name: 2–80 Zeichen." };
  const slug = slugify(fd(form, "slug").trim() || name);
  if (await db.brand.findFirst({ where: { slug, id: { not: id || "" } } })) return { error: `Der Slug „${slug}“ ist bereits vergeben.` };
  const data = { name, slug, description: fd(form, "description").trim().slice(0, 400) || null };
  const rec = id ? await db.brand.update({ where: { id }, data }) : await db.brand.create({ data });
  await audit(admin.id, id ? "brand.update" : "brand.create", "Brand", rec.id, { name });
  bust();
  return { ok: "Marke gespeichert." };
}

export async function deleteBrandAction(_: FormState, form: FormData): Promise<FormState> {
  const admin = await requireAdmin();
  const id = fd(form, "id");
  if ((await db.product.count({ where: { brandId: id } })) > 0) return { error: "Marke wird noch von Produkten verwendet." };
  await db.brand.delete({ where: { id } });
  await audit(admin.id, "brand.delete", "Brand", id);
  bust();
  return { ok: "Marke gelöscht." };
}

// ───────────────────────── Bestellungen ─────────────────────────

export async function orderAction(_: FormState, form: FormData): Promise<FormState> {
  const admin = await requireAdmin();
  const id = fd(form, "id"), op = fd(form, "op");
  const order = await db.order.findUnique({ where: { id }, include: { payments: true } });
  if (!order) return { error: "Bestellung nicht gefunden." };
  const pay = order.payments[0];
  try {
    switch (op) {
      case "paid":
        if (order.status !== "NEW") throw new ApiError(409, "Bestellung ist nicht offen.");
        await markOrderPaid(id, { provider: pay?.provider ?? "BANK_TRANSFER", method: "manuell bestätigt" });
        break;
      case "processing":
        if (order.status !== "PAID") throw new ApiError(409, "Nur bezahlte Bestellungen können in Bearbeitung gesetzt werden.");
        await db.order.update({ where: { id }, data: { status: "PROCESSING" } });
        break;
      case "ship": {
        const carrier = fd(form, "carrier").trim() || "DHL";
        const tracking = fd(form, "trackingNumber").trim();
        let url = fd(form, "trackingUrl").trim();
        if (!url && tracking && /dhl/i.test(carrier)) url = `https://www.dhl.de/de/privatkunden/pakete-empfangen/verfolgen.html?piececode=${encodeURIComponent(tracking)}`;
        if (url && !/^https?:\/\//.test(url)) throw new ApiError(400, "Tracking-URL muss mit http(s):// beginnen.");
        await shipOrder(id, { carrier, trackingNumber: tracking || undefined, trackingUrl: url || undefined });
        break;
      }
      case "delivered": await markDelivered(id); break;
      case "cancel":
        if (pay?.status === "PAID") throw new ApiError(409, "Bezahlte Bestellungen bitte erstatten statt stornieren.");
        if (!["NEW", "PAID", "PROCESSING"].includes(order.status)) throw new ApiError(409, "Diese Bestellung kann nicht storniert werden.");
        await cancelOrder(id, "Vom Admin storniert");
        break;
      case "refund": await refundOrder(id); break;
      default: throw new ApiError(400, "Unbekannte Aktion.");
    }
  } catch (e) { return fail(e); }
  await audit(admin.id, `order.${op}`, "Order", id, { number: order.number });
  revalidatePath(`/admin/orders/${id}`); revalidatePath("/admin/orders");
  return { ok: "Gespeichert." };
}

// ───────────────────────── Inventar ─────────────────────────

export async function inventoryAction(_: FormState, form: FormData): Promise<FormState> {
  const admin = await requireAdmin();
  const variantId = fd(form, "variantId");
  const quantity = parseInt(fd(form, "quantity"), 10), threshold = parseInt(fd(form, "threshold"), 10);
  if (!Number.isInteger(quantity) || quantity < 0 || !Number.isInteger(threshold) || threshold < 0) return { error: "Ungültige Zahl." };
  const before = await db.inventory.findUnique({ where: { variantId } });
  await db.inventory.upsert({ where: { variantId }, update: { quantity, lowStockThreshold: threshold }, create: { variantId, quantity, lowStockThreshold: threshold } });
  await audit(admin.id, "inventory.update", "ProductVariant", variantId, { from: before?.quantity ?? null, to: quantity });
  bust();
  return { ok: "✓" };
}

// ───────────────────────── Gutscheine ─────────────────────────

const couponSchema = z.object({
  id: z.string().optional(), code: z.string().trim().toUpperCase().regex(/^[A-Z0-9_-]{3,30}$/, "Code: 3–30 Zeichen (A–Z, 0–9, - _)"),
  description: z.string().trim().max(120).optional(), type: z.enum(["PERCENT", "FIXED"]), value: z.string().min(1, "Wert fehlt"),
  minOrder: z.string().optional(), maxUses: z.string().optional(), validFrom: z.string().optional(), validUntil: z.string().optional(),
});

export async function saveCouponAction(_: FormState, form: FormData): Promise<FormState> {
  const admin = await requireAdmin();
  const parsed = couponSchema.safeParse(Object.fromEntries([...form.entries()].filter(([, v]) => typeof v === "string")));
  if (!parsed.success) return zerr(parsed.error);
  const c = parsed.data;
  let value: number;
  try { value = c.type === "PERCENT" ? Math.round(Number(c.value.replace(",", "."))) : toCents(c.value); } catch { return { error: "Wert ungültig." }; }
  if (c.type === "PERCENT" && (value < 1 || value > 100)) return { error: "Prozentwert muss zwischen 1 und 100 liegen." };
  if (c.type === "FIXED" && value <= 0) return { error: "Rabattbetrag muss größer als 0 sein." };
  const minOrderCents = c.minOrder?.trim() ? toCents(c.minOrder) : 0;
  const maxUses = c.maxUses?.trim() ? Math.max(1, parseInt(c.maxUses, 10)) : null;
  const validFrom = c.validFrom ? new Date(c.validFrom) : null, validUntil = c.validUntil ? new Date(`${c.validUntil}T23:59:59`) : null;
  if (validFrom && validUntil && validUntil < validFrom) return { error: "„Gültig bis“ liegt vor „Gültig ab“." };
  if (await db.coupon.findFirst({ where: { code: c.code, id: { not: c.id ?? "" } } })) return { error: `Der Code ${c.code} existiert bereits.` };

  const products = form.getAll("products").filter((x): x is string => typeof x === "string" && !!x);
  const categories = form.getAll("categories").filter((x): x is string => typeof x === "string" && !!x);
  const data = {
    code: c.code, description: c.description || null, type: c.type, value, minOrderCents, maxUses, validFrom, validUntil,
    oncePerCustomer: form.get("oncePerCustomer") === "on", isActive: form.get("isActive") === "on",
    products: { set: products.map((id) => ({ id })) }, categories: { set: categories.map((id) => ({ id })) },
  };
  const rec = c.id ? await db.coupon.update({ where: { id: c.id }, data }) : await db.coupon.create({ data: { ...data, products: { connect: data.products.set }, categories: { connect: data.categories.set } } });
  await audit(admin.id, c.id ? "coupon.update" : "coupon.create", "Coupon", rec.id, { code: c.code });
  revalidatePath("/admin/coupons");
  return { ok: "Gutschein gespeichert." };
}

export async function deleteCouponAction(_: FormState, form: FormData): Promise<FormState> {
  const admin = await requireAdmin();
  const id = fd(form, "id");
  if ((await db.couponRedemption.count({ where: { couponId: id } })) > 0) {
    await db.coupon.update({ where: { id }, data: { isActive: false } });
    await audit(admin.id, "coupon.deactivate", "Coupon", id);
    revalidatePath("/admin/coupons");
    return { ok: "Gutschein wurde bereits eingelöst – deaktiviert statt gelöscht." };
  }
  await db.coupon.delete({ where: { id } });
  await audit(admin.id, "coupon.delete", "Coupon", id);
  revalidatePath("/admin/coupons");
  return { ok: "Gelöscht." };
}

// ───────────────────────── Bewertungen ─────────────────────────

export async function moderateReviewAction(form: FormData) {
  const admin = await requireAdmin();
  const id = fd(form, "id"), op = z.enum(["approve", "reject", "delete"]).parse(fd(form, "op"));
  const r = await db.review.findUnique({ where: { id }, select: { productId: true, product: { select: { slug: true } } } });
  if (!r) return;
  if (op === "delete") await db.review.delete({ where: { id } });
  else await db.review.update({ where: { id }, data: { status: op === "approve" ? "APPROVED" : "REJECTED" } });
  const agg = await db.review.aggregate({ where: { productId: r.productId, status: "APPROVED" }, _avg: { rating: true }, _count: true });
  await db.product.update({ where: { id: r.productId }, data: { ratingAvg: agg._avg.rating ?? 0, ratingCount: agg._count } });
  await audit(admin.id, `review.${op}`, "Review", id);
  revalidatePath(`/product/${r.product.slug}`); revalidatePath("/admin/reviews");
}

// ───────────────────────── Kunden ─────────────────────────

export async function toggleUserAction(form: FormData) {
  const admin = await requireAdmin();
  const id = fd(form, "id");
  if (id === admin.id) return;
  const u = await db.user.findUnique({ where: { id } });
  if (!u) return;
  await db.user.update({ where: { id }, data: { disabledAt: u.disabledAt ? null : new Date() } });
  if (!u.disabledAt) await db.session.deleteMany({ where: { userId: id } });
  await audit(admin.id, u.disabledAt ? "user.enable" : "user.disable", "User", id);
  revalidatePath(`/admin/customers/${id}`);
}

// ───────────────────────── Verträge & Dokumente ─────────────────────────

const contractSchema = z.object({
  id: z.string().optional(), userEmail: z.string().trim().toLowerCase().email("Kunden-E-Mail ungültig"),
  title: z.string().trim().min(2, "Titel fehlt").max(140), type: z.string().trim().min(2).max(60),
  status: z.enum(["DRAFT", "ACTIVE", "ENDED", "CANCELLED"]), startsAt: z.string().optional(), endsAt: z.string().optional(), notes: z.string().trim().max(4000).optional(),
});

export async function saveContractAction(_: FormState, form: FormData): Promise<FormState> {
  const admin = await requireAdmin();
  const parsed = contractSchema.safeParse(Object.fromEntries([...form.entries()].filter(([, v]) => typeof v === "string")));
  if (!parsed.success) return zerr(parsed.error);
  const c = parsed.data;
  const user = await db.user.findUnique({ where: { email: c.userEmail } });
  if (!user) return { fieldErrors: { userEmail: "Kein Kunde mit dieser E-Mail" }, error: "Kein Kunde mit dieser E-Mail-Adresse gefunden." };
  const data = { userId: user.id, title: c.title, type: c.type, status: c.status, startsAt: c.startsAt ? new Date(c.startsAt) : null, endsAt: c.endsAt ? new Date(c.endsAt) : null, notes: c.notes || null };
  let id = c.id;
  if (id) await db.contract.update({ where: { id }, data });
  else {
    const seq = await db.sequence.upsert({ where: { name: "contract" }, update: { value: { increment: 1 } }, create: { name: "contract", value: 1 } });
    id = (await db.contract.create({ data: { ...data, number: `V-${new Date().getFullYear()}-${String(seq.value).padStart(4, "0")}` } })).id;
  }
  await audit(admin.id, c.id ? "contract.update" : "contract.create", "Contract", id);
  if (!c.id) redirect(`/admin/contracts/${id}`);
  revalidatePath(`/admin/contracts/${id}`);
  return { ok: "Vertrag gespeichert." };
}

export async function uploadContractDocAction(_: FormState, form: FormData): Promise<FormState> {
  const admin = await requireAdmin();
  const contractId = fd(form, "contractId");
  const file = form.get("file");
  if (!(file instanceof File) || file.size === 0) return { error: "Bitte eine Datei auswählen." };
  if (!(await db.contract.findUnique({ where: { id: contractId } }))) return { error: "Vertrag nicht gefunden." };
  try {
    const rec = await saveFile({ data: Buffer.from(await file.arrayBuffer()), filename: file.name, kind: "CONTRACT", visibility: "PRIVATE", allow: DOC_MIMES, maxBytes: MAX_UPLOAD_BYTES, uploadedById: admin.id });
    await db.contractDocument.create({ data: { contractId, fileId: rec.id, title: fd(form, "title").trim() || file.name } });
    await audit(admin.id, "contract.document_add", "Contract", contractId, { file: rec.filename });
  } catch (e) { return fail(e); }
  revalidatePath(`/admin/contracts/${contractId}`);
  return { ok: "Dokument hochgeladen." };
}

export async function deleteContractDocAction(form: FormData) {
  const admin = await requireAdmin();
  const doc = await db.contractDocument.findUnique({ where: { id: fd(form, "id") }, include: { file: true } });
  if (!doc) return;
  await db.contractDocument.delete({ where: { id: doc.id } });
  await db.storedFile.delete({ where: { id: doc.fileId } });
  await storage.remove(doc.file.key).catch(() => {});
  await audit(admin.id, "contract.document_delete", "Contract", doc.contractId);
  revalidatePath(`/admin/contracts/${doc.contractId}`);
}

export async function deleteContractAction(_: FormState, form: FormData): Promise<FormState> {
  const admin = await requireAdmin();
  const id = fd(form, "id");
  const docs = await db.contractDocument.findMany({ where: { contractId: id }, include: { file: true } });
  await db.contract.delete({ where: { id } });
  for (const d of docs) { await db.storedFile.delete({ where: { id: d.fileId } }).catch(() => {}); await storage.remove(d.file.key).catch(() => {}); }
  await audit(admin.id, "contract.delete", "Contract", id);
  redirect("/admin/contracts");
}

// ───────────────────────── Einstellungen ─────────────────────────

export async function saveSettingsAction(_: FormState, form: FormData): Promise<FormState> {
  const admin = await requireAdmin();
  const str = (k: keyof Settings) => fd(form, k).trim().slice(0, 200);
  const eur = (k: keyof Settings) => { try { return toCents(fd(form, k)); } catch { return SETTINGS_DEFAULTS[k] as number; } };
  const int = (k: keyof Settings, min: number, max: number) => Math.min(max, Math.max(min, parseInt(fd(form, k), 10) || (SETTINGS_DEFAULTS[k] as number)));
  const iban = str("bankIban").replace(/\s+/g, "").toUpperCase();
  if (iban && !/^[A-Z]{2}\d{2}[A-Z0-9]{11,30}$/.test(iban)) return { fieldErrors: { bankIban: "IBAN ungültig" }, error: "IBAN ungültig." };
  await saveSettings({
    legalName: str("legalName"), legalForm: str("legalForm"), street: str("street"), postalCode: str("postalCode"), city: str("city"), country: str("country"),
    email: str("email"), phone: str("phone"), managingDirector: str("managingDirector"), registerCourt: str("registerCourt"), registerNumber: str("registerNumber"), vatId: str("vatId"),
    bankHolder: str("bankHolder"), bankIban: iban, bankBic: str("bankBic").toUpperCase(), bankName: str("bankName"),
    taxRatePercent: int("taxRatePercent", 0, 30), shippingStandardCents: eur("shippingStandardCents"), shippingExpressCents: eur("shippingExpressCents"),
    freeShippingThresholdCents: eur("freeShippingThresholdCents"), returnDays: int("returnDays", 14, 60), reservationMinutes: int("reservationMinutes", 10, 240),
  });
  await audit(admin.id, "settings.update", "Setting", "shop");
  revalidatePath("/", "layout");
  return { ok: "Einstellungen gespeichert." };
}
