"use client";

import { useEffect, useState } from "react";
import { Stars } from "@/components/ui/Stars";
import { StarIcon } from "@/components/ui/Icons";

export type ReviewItem = { id: string; rating: number; title: string | null; body: string; author: string; date: string };

export function ReviewSection({ productId, rating, count, reviews }: {
  productId: string; rating: number; count: number; reviews: ReviewItem[];
}) {
  // Berechtigung nutzerspezifisch nachladen – die Produktseite selbst bleibt statisch cachebar
  const [elig, setElig] = useState<{ canReview: boolean; loggedIn: boolean }>({ canReview: false, loggedIn: false });
  useEffect(() => {
    fetch(`/api/reviews?productId=${productId}`).then((r) => r.json()).then(setElig).catch(() => {});
  }, [productId]);
  const { canReview, loggedIn } = elig;
  return (
    <section id="bewertungen" className="scroll-mt-28 border-t border-white/10 py-16 md:py-24">
      <div className="grid gap-12 md:grid-cols-[1fr_1.6fr]">
        <div>
          <p className="eyebrow mb-4">Bewertungen</p>
          <h2 className="h-md mb-5">Das sagen Kunden.</h2>
          {count > 0 ? (
            <div className="flex items-end gap-4"><span className="text-[64px] font-semibold leading-none tracking-tight">{rating.toFixed(1)}</span><div className="pb-2"><Stars value={rating} size={18} /><p className="mt-1 text-[13px] text-cream/50">{count} {count === 1 ? "Bewertung" : "Bewertungen"}</p></div></div>
          ) : <p className="text-cream/55">Noch keine Bewertungen.</p>}
          <div className="mt-8">
            {canReview ? <ReviewForm productId={productId} /> : !loggedIn ? <p className="text-[13.5px] text-cream/50">Melde dich an, um gekaufte Produkte zu bewerten.</p> : <p className="text-[13.5px] text-cream/50">Bewerten kannst du Produkte, die du bei uns gekauft hast.</p>}
          </div>
        </div>
        <ul className="divide-y divide-white/10">
          {reviews.map((r) => (
            <li key={r.id} className="py-7 first:pt-0">
              <div className="flex items-center justify-between gap-3"><Stars value={r.rating} /><time className="text-[12.5px] text-cream/40">{r.date}</time></div>
              {r.title && <p className="mt-3 text-[16px] font-medium tracking-tight">{r.title}</p>}
              <p className="mt-2 text-[14.5px] leading-relaxed text-cream/65">{r.body}</p>
              <p className="mt-3 text-[12.5px] text-cream/40">{r.author} · Verifizierter Kauf</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

function ReviewForm({ productId }: { productId: string }) {
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  if (msg?.ok) return <p className="rounded-2xl border border-rose-300/30 bg-rose-500/10 p-4 text-[14px] text-rose-300">{msg.text}</p>;
  return (
    <form className="space-y-4" onSubmit={async (e) => {
      e.preventDefault(); setBusy(true); setMsg(null);
      const res = await fetch("/api/reviews", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ productId, rating, title, body }) });
      const d = await res.json().catch(() => ({}));
      setMsg({ ok: res.ok, text: res.ok ? d.message : d.error ?? "Fehler" }); setBusy(false);
    }}>
      <p className="label !mb-0">Deine Bewertung</p>
      <div className="flex" onMouseLeave={() => setHover(0)} role="radiogroup" aria-label="Sterne">
        {[1, 2, 3, 4, 5].map((i) => (
          <button type="button" key={i} role="radio" aria-checked={rating === i} aria-label={`${i} Sterne`} onMouseEnter={() => setHover(i)} onClick={() => setRating(i)} className="flex h-11 w-9 items-center justify-center text-rose-300 transition-transform hover:scale-110">
            <StarIcon filled={i <= (hover || rating)} width={26} height={26} />
          </button>
        ))}
      </div>
      <input className="field" placeholder="Titel (optional)" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={100} />
      <textarea className="field min-h-[120px] py-3" placeholder="Wie gefällt dir das Produkt?" required minLength={10} value={body} onChange={(e) => setBody(e.target.value)} maxLength={2000} />
      {msg && !msg.ok && <p className="field-error">{msg.text}</p>}
      <button className="btn-primary" disabled={busy || rating === 0}>Bewertung abschicken</button>
    </form>
  );
}
