export type { CartView, CartLine } from "@/lib/cart";
export type SessionInfo = {
  user: { firstName: string; isAdmin: boolean } | null;
  cartCount: number;
  wishlist: string[];
  unread: number;
};
