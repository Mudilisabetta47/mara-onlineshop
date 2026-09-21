"use client";

import Image from "next/image";
import { useActionState, useMemo, useState } from "react";
import { saveProductAction } from "@/app/admin/actions";
import { Card, Lbl, fieldCls } from "./ui";
import { Submit } from "./ActionForm";
import { centsToInput } from "@/lib/money";

type Variant = { id?: string; sku: string; size: string; color: string; colorHex: string; quantity: number; threshold: number; isActive: boolean };
type Img = { id?: string; url: string; alt: string; color: string | null };
export type ProductFormData = {
  id?: string; name: string; slug: string; shortDescription: string; description: string; material: string; careInfo: string; sizeGuide: string;
  sku: string; basePriceCents: number | null; salePriceCents: number | null; status: "DRAFT" | "ACTIVE" | "INACTIVE"; weightGrams: number | null;
  categoryId: string; brandId: string; seoTitle: string; seoDescription: string; featured: boolean; images: Img[]; variants: Variant[];
};

export function ProductForm({ initial, categories, brands }: { initial: ProductFormData; categories: { id: string; name: string }[]; brands: { id: string; name: string }[] }) {
  const [state, action] = useActionState(saveProductAction, null);
  const [f, setF] = useState({ ...initial, basePrice: centsToInput(initial.basePriceCents), salePrice: centsToInput(initial.salePriceCents), weight: initial.weightGrams?.toString() ?? "" });
  const [images, setImages] = useState<Img[]>(initial.images);
  const [variants, setVariants] = useState<Variant[]>(initial.variants);
  const [uploading, setUploading] = useState(false);
  const [uploadErr, setUploadErr] = useState<string | null>(null);
  const [genColors, setGenColors] = useState("");
  const [genSizes, setGenSizes] = useState("");
  const fe = state?.fieldErrors ?? {};
  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => setF((p) => ({ ...p, [k]: v }));
  const colorNames = useMemo(() => [...new Set(variants.map((v) => v.color).filter(Boolean))], [variants]);

  const payload = JSON.stringify({
    id: initial.id, name: f.name, slug: f.slug, shortDescription: f.shortDescription, description: f.description, material: f.material, careInfo: f.careInfo,
    sizeGuide: f.sizeGuide, sku: f.sku, basePrice: f.basePrice, salePrice: f.salePrice, status: f.status, weightGrams: f.weight, categoryId: f.categoryId,
    brandId: f.brandId, seoTitle: f.seoTitle, seoDescription: f.seoDescription, featured: f.featured, images,
    variants: variants.map((v) => ({ ...v, size: v.size || null, color: v.color || null, colorHex: v.colorHex || null })),
  });

  async function upload(files: FileList | null) {
    if (!files?.length) return;
    setUploading(true); setUploadErr(null);
    const body = new FormData();
    [...files].forEach((x) => body.append("files", x));
    const res = await fetch("/api/admin/upload", { method: "POST", body });
    const d = await res.json().catch(() => ({}));
    setUploading(false);
    if (!res.ok) { setUploadErr(d.error ?? "Upload fehlgeschlagen"); return; }
    setImages((imgs) => [...imgs, ...d.files.map((x: { url: string; filename: string }) => ({ url: x.url, alt: f.name || x.filename, color: null }))]);
  }

  function generate() {
    const colors = genColors.split(",").map((s) => s.trim()).filter(Boolean).map((s) => { const [n, h] = s.split("|"); return { name: n.trim(), hex: (h ?? "").trim() }; });
    const sizes = genSizes.split(",").map((s) => s.trim()).filter(Boolean);
    const cs = colors.length ? colors : [{ name: "", hex: "" }], ss = sizes.length ? sizes : [""];
    const next = [...variants];
    for (const c of cs) for (const s of ss) {
      if (next.some((v) => v.color === c.name && v.size === s)) continue;
      const code = (c.name || "STD").replace(/[^A-Za-z0-9]/g, "").slice(0, 3).toUpperCase();
      next.push({ sku: [f.sku || "SKU", code, s].filter(Boolean).join("-"), size: s, color: c.name, colorHex: c.hex, quantity: 0, threshold: 3, isActive: true });
    }
    setVariants(next); setGenColors(""); setGenSizes("");
  }
  const upV = (i: number, patch: Partial<Variant>) => setVariants((vs) => vs.map((v, j) => (j === i ? { ...v, ...patch } : v)));
  const move = (i: number, d: number) => setImages((im) => { const n = [...im]; const j = i + d; if (j < 0 || j >= n.length) return n; [n[i], n[j]] = [n[j], n[i]]; return n; });

  return (
    <form action={action} className="space-y-5">
      <input type="hidden" name="payload" value={payload} />
      {state?.error && <p role="alert" className="rounded-xl border border-[#f0a3b9]/30 bg-[#f0a3b9]/10 px-4 py-3 text-[13.5px] text-[#f0a3b9]">{state.error}</p>}
      {state?.ok && <p role="status" className="rounded-xl border border-emerald-300/30 bg-emerald-300/10 px-4 py-3 text-[13.5px] text-emerald-200">{state.ok}</p>}

      <div className="grid gap-5 xl:grid-cols-[2fr_1fr]">
        <div className="space-y-5">
          <Card title="Allgemein">
            <div className="grid gap-4 sm:grid-cols-2">
              <Lbl label="Name *" className="sm:col-span-2"><input className={fieldCls} value={f.name} onChange={(e) => set("name", e.target.value)} required /></Lbl>
              <Lbl label="Slug (URL)" hint="Leer lassen → aus dem Namen erzeugt"><input className={fieldCls} value={f.slug} onChange={(e) => set("slug", e.target.value)} placeholder="z-b-hoodie-nordlicht" /></Lbl>
              <Lbl label="SKU *"><input className={fieldCls} value={f.sku} onChange={(e) => set("sku", e.target.value)} required /></Lbl>
              <Lbl label="Kurzbeschreibung" className="sm:col-span-2"><input className={fieldCls} value={f.shortDescription} onChange={(e) => set("shortDescription", e.target.value)} maxLength={240} /></Lbl>
              <Lbl label="Beschreibung" className="sm:col-span-2"><textarea className={`${fieldCls} min-h-[140px] py-3`} value={f.description} onChange={(e) => set("description", e.target.value)} /></Lbl>
              <Lbl label="Material"><input className={fieldCls} value={f.material} onChange={(e) => set("material", e.target.value)} /></Lbl>
              <Lbl label="Pflegehinweis"><input className={fieldCls} value={f.careInfo} onChange={(e) => set("careInfo", e.target.value)} /></Lbl>
              <Lbl label="Größentabelle" hint="Zeilen per Enter, Spalten mit |  (z. B. Größe|Körpergröße)" className="sm:col-span-2"><textarea className={`${fieldCls} min-h-[100px] py-3 font-mono text-[12.5px]`} value={f.sizeGuide} onChange={(e) => set("sizeGuide", e.target.value)} /></Lbl>
            </div>
          </Card>

          <Card title="Bilder">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {images.map((im, i) => (
                <div key={im.url + i} className="rounded-xl border border-white/10 p-2">
                  <div className="relative aspect-[4/5] overflow-hidden rounded-lg bg-plum-900"><Image src={im.url} alt="" fill sizes="200px" className="object-cover" />{i === 0 && <span className="absolute left-1.5 top-1.5 rounded-full bg-cream px-2 py-0.5 text-[10.5px] font-medium text-ink-950">Hauptbild</span>}</div>
                  <input className={`${fieldCls} mt-2 !min-h-[34px] !text-[12px]`} value={im.alt} onChange={(e) => setImages((a) => a.map((x, j) => (j === i ? { ...x, alt: e.target.value } : x)))} placeholder="Alt-Text" />
                  <select className={`${fieldCls} mt-1.5 !min-h-[34px] !text-[12px]`} value={im.color ?? ""} onChange={(e) => setImages((a) => a.map((x, j) => (j === i ? { ...x, color: e.target.value || null } : x)))}><option value="">Alle Farben</option>{colorNames.map((c) => <option key={c} value={c}>{c}</option>)}</select>
                  <div className="mt-2 flex justify-between text-[12px]"><button type="button" onClick={() => move(i, -1)} className="px-2 py-1 text-cream/60 hover:text-cream" aria-label="Nach vorne">←</button><button type="button" onClick={() => setImages((a) => a.filter((_, j) => j !== i))} className="px-2 py-1 text-[#f0a3b9]">Entfernen</button><button type="button" onClick={() => move(i, 1)} className="px-2 py-1 text-cream/60 hover:text-cream" aria-label="Nach hinten">→</button></div>
                </div>
              ))}
              <label className="flex aspect-[4/5] cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-white/20 text-center text-[12.5px] text-cream/55 hover:border-rose-300/60 hover:text-cream">
                <span className="text-2xl">+</span>{uploading ? "Lädt hoch …" : "Bilder hochladen"}<span className="mt-1 text-[11px] text-cream/35">JPG, PNG, WebP, AVIF · max. 4 MB</span>
                <input type="file" multiple accept="image/jpeg,image/png,image/webp,image/avif" className="sr-only" onChange={(e) => { void upload(e.target.files); e.target.value = ""; }} />
              </label>
            </div>
            {uploadErr && <p className="mt-3 text-[12.5px] text-[#f0a3b9]">{uploadErr}</p>}
          </Card>

          <Card title="Varianten & Bestand">
            <div className="mb-5 grid gap-3 rounded-xl bg-white/[0.03] p-4 md:grid-cols-[1fr_1fr_auto]">
              <Lbl label="Farben" hint="Name|#Hex, kommagetrennt – z. B. Sand|#cdbca8, Anthrazit|#332e31"><input className={fieldCls} value={genColors} onChange={(e) => setGenColors(e.target.value)} /></Lbl>
              <Lbl label="Größen" hint="kommagetrennt – z. B. 92, 98, 104 oder XS, S, M"><input className={fieldCls} value={genSizes} onChange={(e) => setGenSizes(e.target.value)} /></Lbl>
              <button type="button" onClick={generate} className="self-end rounded-full border border-white/15 px-5 py-2.5 text-[13px] hover:border-rose-300/60">Matrix erzeugen</button>
            </div>
            {variants.length === 0 ? <p className="text-[13.5px] text-cream/45">Noch keine Varianten. Erzeuge sie oben oder füge eine hinzu (z. B. „One Size“).</p> : (
              <div className="overflow-x-auto" data-lenis-prevent>
                <table className="w-full min-w-[720px] text-[13px]">
                  <thead className="text-left text-[11px] uppercase tracking-wider text-cream/40"><tr><th className="pb-2 pr-2">Farbe</th><th className="pb-2 pr-2">Hex</th><th className="pb-2 pr-2">Größe</th><th className="pb-2 pr-2">SKU</th><th className="pb-2 pr-2">Bestand</th><th className="pb-2 pr-2">Warnung ab</th><th className="pb-2 pr-2">Aktiv</th><th /></tr></thead>
                  <tbody>{variants.map((v, i) => (
                    <tr key={v.id ?? `n${i}`} className="border-t border-white/[0.06]">
                      <td className="py-1.5 pr-2"><input className={`${fieldCls} !min-h-[36px]`} value={v.color} onChange={(e) => upV(i, { color: e.target.value })} /></td>
                      <td className="py-1.5 pr-2"><input className={`${fieldCls} !min-h-[36px] w-[92px]`} value={v.colorHex} onChange={(e) => upV(i, { colorHex: e.target.value })} placeholder="#RRGGBB" /></td>
                      <td className="py-1.5 pr-2"><input className={`${fieldCls} !min-h-[36px] w-[72px]`} value={v.size} onChange={(e) => upV(i, { size: e.target.value })} /></td>
                      <td className="py-1.5 pr-2"><input className={`${fieldCls} !min-h-[36px]`} value={v.sku} onChange={(e) => upV(i, { sku: e.target.value })} /></td>
                      <td className="py-1.5 pr-2"><input type="number" min={0} className={`${fieldCls} !min-h-[36px] w-[84px]`} value={v.quantity} onChange={(e) => upV(i, { quantity: Math.max(0, parseInt(e.target.value, 10) || 0) })} /></td>
                      <td className="py-1.5 pr-2"><input type="number" min={0} className={`${fieldCls} !min-h-[36px] w-[72px]`} value={v.threshold} onChange={(e) => upV(i, { threshold: Math.max(0, parseInt(e.target.value, 10) || 0) })} /></td>
                      <td className="py-1.5 pr-2"><input type="checkbox" checked={v.isActive} onChange={(e) => upV(i, { isActive: e.target.checked })} className="h-4 w-4 accent-[#A95D7C]" /></td>
                      <td className="py-1.5 text-right"><button type="button" onClick={() => setVariants((vs) => vs.filter((_, j) => j !== i))} className="px-2 text-[#f0a3b9]" aria-label="Variante entfernen">✕</button></td>
                    </tr>))}</tbody>
                </table>
              </div>
            )}
            <button type="button" onClick={() => setVariants((vs) => [...vs, { sku: `${f.sku || "SKU"}-${vs.length + 1}`, size: "", color: "", colorHex: "", quantity: 0, threshold: 3, isActive: true }])} className="mt-4 rounded-full border border-white/15 px-4 py-2 text-[13px] hover:border-rose-300/60">+ Variante</button>
          </Card>
        </div>

        <div className="space-y-5">
          <Card title="Veröffentlichung">
            <div className="grid gap-4">
              <Lbl label="Status"><select className={fieldCls} value={f.status} onChange={(e) => set("status", e.target.value as typeof f.status)}><option value="DRAFT">Entwurf</option><option value="ACTIVE">Aktiv (im Shop sichtbar)</option><option value="INACTIVE">Deaktiviert</option></select></Lbl>
              <Lbl label="Kategorie *"><select className={fieldCls} value={f.categoryId} onChange={(e) => set("categoryId", e.target.value)} required><option value="">Bitte wählen</option>{categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></Lbl>
              <Lbl label="Marke"><select className={fieldCls} value={f.brandId} onChange={(e) => set("brandId", e.target.value)}><option value="">–</option>{brands.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}</select></Lbl>
              <label className="flex items-center gap-3 text-[13.5px]"><input type="checkbox" checked={f.featured} onChange={(e) => set("featured", e.target.checked)} className="h-4 w-4 accent-[#A95D7C]" /> Empfohlen (weiter vorne im Katalog)</label>
            </div>
          </Card>
          <Card title="Preis & Versand">
            <div className="grid gap-4">
              <Lbl label="Preis (brutto, €) *"><input className={fieldCls} inputMode="decimal" value={f.basePrice} onChange={(e) => set("basePrice", e.target.value)} placeholder="49,90" required />{fe.basePrice && <span className="text-[12px] text-[#f0a3b9]">{fe.basePrice}</span>}</Lbl>
              <Lbl label="Sale-Preis (€)" hint="Leer = kein Angebot"><input className={fieldCls} inputMode="decimal" value={f.salePrice} onChange={(e) => set("salePrice", e.target.value)} />{fe.salePrice && <span className="text-[12px] text-[#f0a3b9]">{fe.salePrice}</span>}</Lbl>
              <Lbl label="Gewicht (g)"><input className={fieldCls} inputMode="numeric" value={f.weight} onChange={(e) => set("weight", e.target.value)} /></Lbl>
            </div>
          </Card>
          <Card title="SEO">
            <div className="grid gap-4">
              <Lbl label={`SEO-Titel (${f.seoTitle.length}/70)`}><input className={fieldCls} maxLength={70} value={f.seoTitle} onChange={(e) => set("seoTitle", e.target.value)} /></Lbl>
              <Lbl label={`Meta-Beschreibung (${f.seoDescription.length}/170)`}><textarea className={`${fieldCls} min-h-[90px] py-3`} maxLength={170} value={f.seoDescription} onChange={(e) => set("seoDescription", e.target.value)} /></Lbl>
            </div>
          </Card>
        </div>
      </div>

      <div className="sticky bottom-4 z-10 flex items-center justify-between rounded-full border border-white/10 bg-ink-900/90 px-5 py-3 backdrop-blur-xl">
        <span className="text-[13px] text-cream/50">{initial.id ? "Änderungen werden sofort im Shop sichtbar." : "Das Produkt wird angelegt."}</span>
        <Submit>Speichern</Submit>
      </div>
    </form>
  );
}
