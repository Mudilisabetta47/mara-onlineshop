"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import type { CartView } from "@/lib/cart";
import type { SessionInfo } from "@/lib/types";

const EMPTY: CartView = {
  id: null, lines: [], count: 0, subtotalCents: 0, discountCents: 0, coupon: null, couponError: null,
  shippingCents: 0, freeShippingThresholdCents: 7500, totalCents: 0, taxCents: 0, hasProblems: false,
};

type Toast = { id: number; message: string; tone: "ok" | "error" };

type Ctx = {
  user: SessionInfo["user"];
  ready: boolean;
  unread: number;
  cart: CartView;
  cartCount: number;
  cartLoading: boolean;
  bump: number;
  wishlist: Set<string>;
  cartOpen: boolean;
  searchOpen: boolean;
  menuOpen: boolean;
  setCartOpen: (v: boolean) => void;
  setSearchOpen: (v: boolean) => void;
  setMenuOpen: (v: boolean) => void;
  refreshCart: () => Promise<CartView>;
  addToCart: (variantId: string, quantity?: number, opts?: { openDrawer?: boolean }) => Promise<boolean>;
  updateQty: (lineId: string, quantity: number) => Promise<void>;
  removeLine: (lineId: string) => Promise<void>;
  applyCoupon: (code: string) => Promise<string | null>;
  removeCoupon: () => Promise<void>;
  toggleWish: (productId: string) => Promise<boolean>;
  toast: (message: string, tone?: "ok" | "error") => void;
};

const ShopContext = createContext<Ctx | null>(null);
export const useShop = () => {
  const c = useContext(ShopContext);
  if (!c) throw new Error("useShop außerhalb des ShopProvider");
  return c;
};

async function api<T>(url: string, init?: RequestInit): Promise<{ ok: boolean; data: T & { error?: string } }> {
  try {
    const res = await fetch(url, {
      ...init,
      headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
      credentials: "same-origin",
    });
    return { ok: res.ok, data: (await res.json().catch(() => ({}))) as T & { error?: string } };
  } catch {
    return { ok: false, data: { error: "Netzwerkfehler. Bitte prüfe deine Verbindung." } as T & { error?: string } };
  }
}

export function ShopProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<SessionInfo | null>(null);
  const [cart, setCart] = useState<CartView>(EMPTY);
  const [cartCount, setCartCount] = useState(0);
  const [cartLoading, setCartLoading] = useState(false);
  const [wishlist, setWishlist] = useState<Set<string>>(new Set());
  const [cartOpen, setCartOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [bump, setBump] = useState(0);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const tid = useRef(0);

  const toast = useCallback((message: string, tone: "ok" | "error" = "ok") => {
    const id = ++tid.current;
    setToasts((t) => [...t.slice(-2), { id, message, tone }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3600);
  }, []);

  const applyCart = useCallback((c: CartView) => { setCart(c); setCartCount(c.count); }, []);

  useEffect(() => {
    let alive = true;
    api<SessionInfo>("/api/session").then(({ ok, data }) => {
      if (!alive || !ok) return;
      setSession(data);
      setCartCount(data.cartCount);
      setWishlist(new Set(data.wishlist));
    });
    return () => { alive = false; };
  }, []);

  const refreshCart = useCallback(async () => {
    setCartLoading(true);
    const { ok, data } = await api<{ cart: CartView }>("/api/cart");
    setCartLoading(false);
    if (ok) { applyCart(data.cart); return data.cart; }
    return EMPTY;
  }, [applyCart]);

  // Drawer öffnen → aktuellen Warenkorb laden
  useEffect(() => { if (cartOpen) void refreshCart(); }, [cartOpen, refreshCart]);

  const addToCart: Ctx["addToCart"] = useCallback(async (variantId, quantity = 1, opts) => {
    const { ok, data } = await api<{ cart: CartView; notice: string | null }>("/api/cart", {
      method: "POST", body: JSON.stringify({ variantId, quantity }),
    });
    if (!ok) { toast(data.error ?? "Konnte nicht hinzugefügt werden.", "error"); return false; }
    applyCart(data.cart);
    setBump((b) => b + 1);
    if (data.notice) toast(data.notice, "error");
    if (opts?.openDrawer !== false) setCartOpen(true);
    return true;
  }, [applyCart, toast]);

  const updateQty: Ctx["updateQty"] = useCallback(async (lineId, quantity) => {
    // optimistisch: Menge sofort anzeigen, Server bestätigt
    setCart((c) => ({
      ...c,
      lines: c.lines.map((l) => l.id === lineId ? { ...l, quantity, lineTotalCents: l.unitPriceCents * quantity } : l),
    }));
    const { ok, data } = await api<{ cart: CartView }>(`/api/cart/items/${lineId}`, { method: "PATCH", body: JSON.stringify({ quantity }) });
    if (ok) applyCart(data.cart); else { toast(data.error ?? "Menge konnte nicht geändert werden.", "error"); void refreshCart(); }
  }, [applyCart, refreshCart, toast]);

  const removeLine: Ctx["removeLine"] = useCallback(async (lineId) => {
    setCart((c) => ({ ...c, lines: c.lines.filter((l) => l.id !== lineId) }));
    const { ok, data } = await api<{ cart: CartView }>(`/api/cart/items/${lineId}`, { method: "DELETE" });
    if (ok) applyCart(data.cart); else void refreshCart();
  }, [applyCart, refreshCart]);

  const applyCoupon: Ctx["applyCoupon"] = useCallback(async (code) => {
    const { ok, data } = await api<{ cart: CartView }>("/api/cart/coupon", { method: "POST", body: JSON.stringify({ code }) });
    if (ok) { applyCart(data.cart); toast("Gutschein angewendet"); return null; }
    return data.error ?? "Gutschein ungültig.";
  }, [applyCart, toast]);

  const removeCoupon: Ctx["removeCoupon"] = useCallback(async () => {
    const { ok, data } = await api<{ cart: CartView }>("/api/cart/coupon", { method: "DELETE" });
    if (ok) applyCart(data.cart);
  }, [applyCart]);

  const toggleWish: Ctx["toggleWish"] = useCallback(async (productId) => {
    const was = wishlist.has(productId);
    setWishlist((w) => { const n = new Set(w); if (was) n.delete(productId); else n.add(productId); return n; });
    const { ok, data } = await api<{ saved: boolean; wishlist: string[] }>("/api/wishlist", { method: "POST", body: JSON.stringify({ productId }) });
    if (!ok) {
      setWishlist((w) => { const n = new Set(w); if (was) n.add(productId); else n.delete(productId); return n; });
      toast(data.error ?? "Wunschliste nicht verfügbar.", "error");
      return was;
    }
    setWishlist(new Set(data.wishlist));
    toast(data.saved ? "Zur Wunschliste hinzugefügt" : "Von der Wunschliste entfernt");
    return data.saved;
  }, [wishlist, toast]);

  // Body-Scroll sperren, solange ein Overlay offen ist
  const locked = cartOpen || searchOpen || menuOpen;
  useEffect(() => {
    document.documentElement.classList.toggle("lenis-stopped", locked);
    document.body.style.overflow = locked ? "hidden" : "";
    return () => { document.body.style.overflow = ""; document.documentElement.classList.remove("lenis-stopped"); };
  }, [locked]);

  const value = useMemo<Ctx>(() => ({
    user: session?.user ?? null, ready: session !== null, unread: session?.unread ?? 0,
    cart, cartCount, cartLoading, bump, wishlist, cartOpen, searchOpen, menuOpen,
    setCartOpen, setSearchOpen, setMenuOpen, refreshCart, addToCart, updateQty, removeLine,
    applyCoupon, removeCoupon, toggleWish, toast,
  }), [session, cart, cartCount, cartLoading, bump, wishlist, cartOpen, searchOpen, menuOpen, refreshCart, addToCart, updateQty, removeLine, applyCoupon, removeCoupon, toggleWish, toast]);

  return (
    <ShopContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 bottom-5 z-[120] flex flex-col items-center gap-2 px-4" aria-live="polite">
        <AnimatePresence>
          {toasts.map((t) => (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, y: 16, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.98 }}
              transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
              className={`glass pointer-events-auto flex items-center gap-2.5 rounded-full px-5 py-3 text-[13.5px] shadow-soft ${t.tone === "error" ? "border-[#f0a3b9]/40" : ""}`}
            >
              <span className={`h-1.5 w-1.5 rounded-full ${t.tone === "error" ? "bg-[#f0a3b9]" : "bg-rose-300"}`} />
              {t.message}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ShopContext.Provider>
  );
}
