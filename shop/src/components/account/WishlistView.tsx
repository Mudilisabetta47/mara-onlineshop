import { db } from "@/lib/db";
import { getCards } from "@/lib/catalog";
import { resolveWishlist } from "@/lib/cart";
import { ProductCard } from "@/components/product/ProductCard";
import { Empty } from "./bits";

export async function WishlistView() {
  const wish = await resolveWishlist(false);
  const items = wish ? await db.wishlistItem.findMany({ where: { wishlistId: wish.id }, orderBy: { createdAt: "desc" }, select: { productId: true } }) : [];
  const cards = items.length ? await getCards({ id: { in: items.map((i) => i.productId) } }, [{ createdAt: "desc" }], 60) : [];
  const order = new Map(items.map((i, n) => [i.productId, n]));
  cards.sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0));
  if (!cards.length) return <Empty title="Deine Wunschliste ist noch leer." text="Tippe auf das Herz bei einem Produkt, um es hier zu speichern." href="/shop" cta="Jetzt entdecken" />;
  return (
    <div data-reveal-stagger="0.07" className="grid grid-cols-2 gap-x-4 gap-y-10 md:grid-cols-3 md:gap-x-6 xl:grid-cols-4">
      {cards.map((p) => <div data-reveal="up" key={p.id}><ProductCard p={p} /></div>)}
    </div>
  );
}
