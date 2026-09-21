import Link from "next/link";
import { db } from "@/lib/db";
import { Badge, PageHead, Tabs } from "@/components/admin/ui";
import { Stars } from "@/components/ui/Stars";
import { moderateReviewAction } from "../actions";
import type { ReviewStatus } from "@prisma/client";

export const metadata = { title: "Bewertungen" };
const LABEL: Record<ReviewStatus, string> = { PENDING: "Zu prüfen", APPROVED: "Freigegeben", REJECTED: "Abgelehnt" };

export default async function Page({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const s = (await searchParams).status;
  const status = (["PENDING", "APPROVED", "REJECTED"].includes(s ?? "") ? s : "PENDING") as ReviewStatus;
  const [reviews, counts] = await Promise.all([
    db.review.findMany({ where: { status }, orderBy: { createdAt: "desc" }, take: 100, include: { product: { select: { name: true, slug: true } }, user: { select: { firstName: true, lastName: true, email: true } } } }),
    db.review.groupBy({ by: ["status"], _count: true }),
  ]);
  return (
    <>
      <PageHead title="Bewertungen" sub="Nur verifizierte Käufer können bewerten. Neue Bewertungen erscheinen erst nach deiner Freigabe." />
      <Tabs active={status} items={(["PENDING", "APPROVED", "REJECTED"] as const).map((k) => ({ key: k, label: LABEL[k], href: `?status=${k}`, count: counts.find((c) => c.status === k)?._count ?? 0 }))} />
      {reviews.length === 0 ? <p className="rounded-2xl border border-dashed border-white/15 p-10 text-center text-cream/45">Keine Bewertungen in diesem Status.</p> : (
        <ul className="space-y-3">{reviews.map((r) => (
          <li key={r.id} className="rounded-2xl border border-white/[0.08] bg-ink-900/70 p-5">
            <div className="flex flex-wrap items-center justify-between gap-3"><Stars value={r.rating} /><Badge tone={r.status === "APPROVED" ? "good" : r.status === "REJECTED" ? "bad" : "warn"}>{LABEL[r.status]}</Badge></div>
            {r.title && <p className="mt-3 font-medium">{r.title}</p>}
            <p className="mt-1.5 text-[14px] leading-relaxed text-cream/70">{r.body}</p>
            <p className="mt-3 text-[12.5px] text-cream/40">{r.user.firstName} {r.user.lastName} ({r.user.email}) zu <Link href={`/product/${r.product.slug}`} className="underline underline-offset-2 hover:text-cream">{r.product.name}</Link> · {r.createdAt.toLocaleDateString("de-DE")}</p>
            <div className="mt-4 flex gap-2">
              {r.status !== "APPROVED" && <form action={moderateReviewAction}><input type="hidden" name="id" value={r.id} /><input type="hidden" name="op" value="approve" /><button className="rounded-full bg-cream px-4 py-2 text-[13px] font-medium text-ink-950">Freigeben</button></form>}
              {r.status !== "REJECTED" && <form action={moderateReviewAction}><input type="hidden" name="id" value={r.id} /><input type="hidden" name="op" value="reject" /><button className="rounded-full border border-white/15 px-4 py-2 text-[13px]">Ablehnen</button></form>}
              <form action={moderateReviewAction}><input type="hidden" name="id" value={r.id} /><input type="hidden" name="op" value="delete" /><button className="rounded-full px-4 py-2 text-[13px] text-[#f0a3b9]">Löschen</button></form>
            </div>
          </li>))}
        </ul>
      )}
    </>
  );
}
