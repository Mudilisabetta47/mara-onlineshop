import { db } from "@/lib/db";
import { Card, Lbl, PageHead, fieldCls } from "@/components/admin/ui";
import { ActionForm, Submit } from "@/components/admin/ActionForm";
import { deleteBrandAction, deleteCategoryAction, saveBrandAction, saveCategoryAction } from "../actions";

export const metadata = { title: "Kategorien" };

function CategoryForm({ c }: { c?: { id: string; name: string; slug: string; description: string | null; introText: string | null; seoTitle: string | null; seoDescription: string | null; image: string | null; sortOrder: number; isActive: boolean } }) {
  return (
    <ActionForm action={saveCategoryAction} className="grid gap-4 sm:grid-cols-2">
      {c && <input type="hidden" name="id" value={c.id} />}
      <Lbl label="Name *"><input name="name" defaultValue={c?.name} required className={fieldCls} /></Lbl>
      <Lbl label="Slug"><input name="slug" defaultValue={c?.slug} className={fieldCls} /></Lbl>
      <Lbl label="Kurzbeschreibung" className="sm:col-span-2"><input name="description" defaultValue={c?.description ?? ""} className={fieldCls} /></Lbl>
      <Lbl label="Textbereich (SEO-Text unter dem Produktgrid)" className="sm:col-span-2"><textarea name="introText" defaultValue={c?.introText ?? ""} className={`${fieldCls} min-h-[100px] py-3`} /></Lbl>
      <Lbl label="SEO-Titel"><input name="seoTitle" defaultValue={c?.seoTitle ?? ""} maxLength={70} className={fieldCls} /></Lbl>
      <Lbl label="Meta-Beschreibung"><input name="seoDescription" defaultValue={c?.seoDescription ?? ""} maxLength={170} className={fieldCls} /></Lbl>
      <Lbl label="Bild-URL"><input name="image" defaultValue={c?.image ?? ""} className={fieldCls} placeholder="/media/…" /></Lbl>
      <Lbl label="Reihenfolge"><input name="sortOrder" type="number" defaultValue={c?.sortOrder ?? 0} className={fieldCls} /></Lbl>
      <label className="flex items-center gap-3 text-[13.5px]"><input type="checkbox" name="isActive" defaultChecked={c?.isActive ?? true} className="h-4 w-4 accent-[#A95D7C]" /> Aktiv (im Shop sichtbar)</label>
      <div className="sm:col-span-2"><Submit>Speichern</Submit></div>
    </ActionForm>
  );
}

export default async function Page() {
  const [cats, brands] = await Promise.all([
    db.category.findMany({ orderBy: { sortOrder: "asc" }, include: { _count: { select: { products: true } } } }),
    db.brand.findMany({ orderBy: { name: "asc" }, include: { _count: { select: { products: true } } } }),
  ]);
  return (
    <>
      <PageHead title="Kategorien" sub="Diese Kategorien erscheinen in der Navigation und als Kampagnen auf der Startseite." />
      <div className="space-y-4">
        {cats.map((c) => (
          <details key={c.id} className="group rounded-2xl border border-white/[0.08] bg-ink-900/70">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-4"><span className="font-medium">{c.name} <span className="ml-2 text-[12.5px] font-normal text-cream/45">/{c.slug} · {c._count.products} Produkte{c.isActive ? "" : " · inaktiv"}</span></span><span className="text-[12.5px] text-cream/45 group-open:hidden">Bearbeiten</span></summary>
            <div className="border-t border-white/[0.07] p-5">
              <CategoryForm c={c} />
              <div className="mt-6 border-t border-white/[0.07] pt-4"><ActionForm action={deleteCategoryAction} confirm="Kategorie löschen?"><input type="hidden" name="id" value={c.id} /><Submit danger>Kategorie löschen</Submit></ActionForm></div>
            </div>
          </details>
        ))}
      </div>
      <Card title="Neue Kategorie" className="mt-8"><CategoryForm /></Card>

      <h2 className="mb-4 mt-14 text-[22px] font-semibold tracking-tight">Marken</h2>
      <div className="space-y-3">
        {brands.map((b) => (
          <details key={b.id} className="rounded-2xl border border-white/[0.08] bg-ink-900/70">
            <summary className="flex cursor-pointer list-none items-center justify-between px-5 py-4 text-[14px]"><span className="font-medium">{b.name} <span className="ml-2 font-normal text-cream/45">/{b.slug} · {b._count.products} Produkte</span></span><span className="text-[12.5px] text-cream/45">Bearbeiten</span></summary>
            <div className="space-y-4 border-t border-white/[0.07] p-5">
              <ActionForm action={saveBrandAction} className="grid gap-4 sm:grid-cols-3"><input type="hidden" name="id" value={b.id} />
                <Lbl label="Name"><input name="name" defaultValue={b.name} required className={fieldCls} /></Lbl><Lbl label="Slug"><input name="slug" defaultValue={b.slug} className={fieldCls} /></Lbl><Lbl label="Beschreibung"><input name="description" defaultValue={b.description ?? ""} className={fieldCls} /></Lbl>
                <div className="sm:col-span-3"><Submit>Speichern</Submit></div></ActionForm>
              <ActionForm action={deleteBrandAction} confirm="Marke löschen?"><input type="hidden" name="id" value={b.id} /><Submit danger>Marke löschen</Submit></ActionForm>
            </div>
          </details>
        ))}
      </div>
      <Card title="Neue Marke" className="mt-4">
        <ActionForm action={saveBrandAction} className="grid gap-4 sm:grid-cols-3"><Lbl label="Name *"><input name="name" required className={fieldCls} /></Lbl><Lbl label="Slug"><input name="slug" className={fieldCls} /></Lbl><Lbl label="Beschreibung"><input name="description" className={fieldCls} /></Lbl><div className="sm:col-span-3"><Submit>Marke anlegen</Submit></div></ActionForm>
      </Card>
    </>
  );
}
