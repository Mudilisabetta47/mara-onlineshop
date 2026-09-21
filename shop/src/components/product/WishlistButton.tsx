"use client";

import { useShop } from "@/components/shop/ShopProvider";
import { HeartIcon } from "@/components/ui/Icons";

export function WishlistButton({ productId, className = "", label = false }: { productId: string; className?: string; label?: boolean }) {
  const { wishlist, toggleWish } = useShop();
  const saved = wishlist.has(productId);
  return (
    <button
      type="button"
      aria-pressed={saved}
      aria-label={saved ? "Von der Wunschliste entfernen" : "Auf die Wunschliste"}
      onClick={(e) => { e.preventDefault(); e.stopPropagation(); void toggleWish(productId); }}
      className={`group/heart inline-flex items-center justify-center gap-2 transition-colors duration-300 ${saved ? "text-rose-300" : "text-cream/80 hover:text-rose-300"} ${className}`}
    >
      <span key={String(saved)} className="inline-flex" style={saved ? { animation: "heart-pop .5s var(--ease)" } : undefined}>
        <HeartIcon filled={saved} width={20} height={20} />
      </span>
      {label && <span className="text-[14px]">{saved ? "Auf der Wunschliste" : "Auf die Wunschliste"}</span>}
    </button>
  );
}
