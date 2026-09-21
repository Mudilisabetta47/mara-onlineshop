"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useShop } from "@/components/shop/ShopProvider";

/** Prüft nach Rückkehr von Stripe serverseitig den Zahlungsstatus (Polling, bis bezahlt) und aktualisiert Warenkorb-Badge. */
export function VerifyPayment({ orderId, token, pending }: { orderId: string; token?: string; pending: boolean }) {
  const router = useRouter();
  const { refreshCart } = useShop();
  useEffect(() => { void refreshCart(); }, [refreshCart]);
  useEffect(() => {
    if (!pending) return;
    let tries = 0, stop = false;
    const tick = async () => {
      if (stop || tries++ > 12) return;
      const res = await fetch("/api/checkout/verify", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ orderId, t: token }) });
      const d = await res.json().catch(() => ({}));
      if (d.status && d.status !== "NEW") { router.refresh(); void refreshCart(); return; }
      setTimeout(tick, 1500);
    };
    void tick();
    return () => { stop = true; };
  }, [pending, orderId, token, router, refreshCart]);
  return null;
}
