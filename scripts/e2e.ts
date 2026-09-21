/**
 * End-to-End-Test gegen einen laufenden Server (npm run dev -- -p 3100, dann npm run e2e – Testzahlung existiert nur außerhalb von Production).
 * Prüft den echten Kaufprozess über die HTTP-API und verifiziert Ergebnisse direkt in PostgreSQL.
 */
import { PrismaClient } from "@prisma/client";
import { hashPassword, randomToken, sha256 } from "../src/lib/auth/password";

import { appEnv } from "../src/lib/config";

// Schutz: E2E legt Testkunden/-bestellungen an und darf NIE gegen Production laufen.
const dbHost = (() => { try { return new URL(process.env.DATABASE_URL ?? "").hostname; } catch { return ""; } })();
const localDb = ["localhost", "127.0.0.1", "::1", "[::1]"].includes(dbHost);
if (appEnv() === "production") { console.error("✖ E2E ist in APP_ENV=production verboten."); process.exit(1); }
if (!localDb && !(appEnv() === "staging" && process.env.E2E_ALLOW_REMOTE === "1")) { console.error("✖ E2E nur gegen lokale DB (oder staging + E2E_ALLOW_REMOTE=1)."); process.exit(1); }
const BASE = process.env.E2E_BASE || "http://localhost:3100";
const db = new PrismaClient();
let pass = 0, failN = 0;
const ok = (c: unknown, name: string, extra = "") => { if (c) { pass++; console.log("  ✓", name); } else { failN++; console.log("  ✗", name, extra); } };

class Client {
  jar = new Map<string, string>();
  async req(path: string, init: RequestInit & { json?: unknown; origin?: string | null } = {}) {
    const headers: Record<string, string> = { ...(init.headers as Record<string, string>) };
    if (init.json !== undefined) headers["Content-Type"] = "application/json";
    if (init.origin !== null && (init.method ?? "GET") !== "GET") headers.Origin = init.origin ?? BASE;
    headers.Cookie = [...this.jar].map(([k, v]) => `${k}=${v}`).join("; ");
    const res = await fetch(BASE + path, { ...init, headers, body: init.json !== undefined ? JSON.stringify(init.json) : init.body, redirect: "manual" });
    for (const c of res.headers.getSetCookie()) { const [kv] = c.split(";"); const i = kv.indexOf("="); if (/Max-Age=0|expires=Thu, 01 Jan 1970/i.test(c)) this.jar.delete(kv.slice(0, i)); else this.jar.set(kv.slice(0, i), kv.slice(i + 1)); }
    const text = await res.text();
    let data: any = {}; try { data = JSON.parse(text); } catch { /* html */ }
    return { status: res.status, data, res, text };
  }
}

const addr = { firstName: "Erika", lastName: "Muster", line1: "Musterstraße 1", postalCode: "30159", city: "Hannover", country: "DE" };

async function main() {
  console.log("Smoke");
  for (const p of ["/", "/shop", "/shop/junge", "/product/hoodie-nordlicht", "/login", "/versand", "/sitemap.xml", "/robots.txt"]) {
    const r = await new Client().req(p); ok(r.status === 200, `GET ${p} → 200`, String(r.status));
  }
  ok((await new Client().req("/product/gibt-es-nicht")).status === 404, "unbekanntes Produkt → 404");
  const health = await new Client().req("/api/health");
  ok(health.status === 200 && health.data.status === "ok" && health.data.checks.database && health.data.checks.migrations, "Health Check: DB, Schema, Migrationen ok");
  ok(!("details" in (await new Client().req("/api/health?detail=1")).data), "Health-Details ohne Token nicht öffentlich");

  console.log("Sicherheit");
  const anon = new Client();
  ok((await anon.req("/admin")).status === 404, "/admin als Gast → 404 (kein Info-Leak)");
  ok((await anon.req("/account", {})).status === 307, "/account als Gast → Redirect zum Login");
  ok((await anon.req("/api/cart", { method: "POST", json: { variantId: "x" }, origin: "https://evil.example" })).status === 403, "Cross-Origin POST → 403 (CSRF)");
  ok((await anon.req("/api/admin/upload", { method: "POST", body: new FormData() })).status === 403, "Upload ohne Admin → 403");
  const h = (await anon.req("/")).res.headers;
  ok(!!h.get("content-security-policy") && h.get("x-frame-options") === "DENY", "Security-Header gesetzt");

  console.log("Katalog & Suche");
  const s1 = await anon.req("/api/search?q=hoodie");
  ok(s1.data.products?.some((p: any) => p.slug === "hoodie-nordlicht"), "Suche nach Name");
  const s2 = await anon.req("/api/search?q=LU-HOOD-001");
  ok(s2.data.products?.length >= 1, "Suche nach SKU");
  const s3 = await anon.req("/api/search?q=Schuhe");
  ok(s3.data.categories?.some((c: any) => c.slug === "schuhe"), "Suche nach Kategorie");
  const filtered = await anon.req("/shop?size=110&sale=1&sort=price-asc&stock=1");
  ok(filtered.status === 200 && filtered.text.includes("Bomberjacke"), "Filter Größe + Sale + Sortierung");
  const f104 = await anon.req("/shop?size=104&sale=1&stock=1");
  ok(!f104.text.includes("Bomberjacke"), "Ausverkaufte Größe wird bei „nur verfügbar“ ausgeblendet");

  console.log("Warenkorb (Gast)");
  const prod = await db.product.findUniqueOrThrow({ where: { slug: "sommerkleid-lina" }, include: { variants: { include: { inventory: true }, orderBy: { position: "asc" } } } });
  const v = prod.variants.find((x) => (x.inventory?.quantity ?? 0) >= 5)!;
  const stock0 = v.inventory!.quantity;
  const c = new Client();
  let r = await c.req("/api/cart", { method: "POST", json: { variantId: v.id, quantity: 2 } });
  ok(r.status === 200 && r.data.cart.count === 2, "In den Warenkorb (2×)");
  ok(r.data.cart.lines[0].unitPriceCents === prod.currentPriceCents, "Preis kommt aus der DB");
  const line = r.data.cart.lines[0];
  r = await c.req(`/api/cart/items/${line.id}`, { method: "PATCH", json: { quantity: 3 } });
  ok(r.data.cart.count === 3 && r.data.cart.subtotalCents === 3 * prod.currentPriceCents, "Menge ändern → Summe neu");
  r = await c.req("/api/cart", { method: "POST", json: { variantId: v.id, quantity: 10 } });
  ok(r.data.cart.lines[0].quantity <= Math.min(10, stock0), "Menge wird auf Bestand/Limit begrenzt");
  await c.req(`/api/cart/items/${line.id}`, { method: "PATCH", json: { quantity: 3 } });
  const soldOut = (await db.inventory.findFirst({ where: { quantity: 0, variant: { product: { status: "ACTIVE" } } } }))!;
  r = await c.req("/api/cart", { method: "POST", json: { variantId: soldOut.variantId, quantity: 1 } });
  ok(r.status === 409, "Ausverkaufte Variante → 409");

  console.log("Gutschein");
  r = await c.req("/api/cart/coupon", { method: "POST", json: { code: "NOPE" } });
  ok(r.status === 404, "Unbekannter Code abgelehnt");
  r = await c.req("/api/cart/coupon", { method: "POST", json: { code: "welcome10" } });
  ok(r.status === 200 && r.data.cart.discountCents === Math.round(r.data.cart.subtotalCents * 0.1), "WELCOME10 = 10 %");

  console.log("Checkout – Validierung");
  const body = { email: `gast-${Date.now()}@example.com`, shipping: addr, shippingMethod: "standard", provider: "TEST", acceptTerms: true };
  ok((await c.req("/api/checkout", { method: "POST", json: { ...body, acceptTerms: false } })).status === 400, "AGB nicht akzeptiert → 400");
  ok((await c.req("/api/checkout", { method: "POST", json: { ...body, shipping: { ...addr, postalCode: "12" } } })).status === 400, "Ungültige PLZ → 400");
  ok((await c.req("/api/checkout", { method: "POST", json: { ...body, provider: "STRIPE" } })).status === 400, "Nicht konfigurierter Provider → 400");

  console.log("Checkout – Gastbestellung (Testzahlung)");
  r = await c.req("/api/checkout", { method: "POST", json: body });
  ok(r.status === 200 && r.data.action === "done", "Bestellung angelegt", JSON.stringify(r.data));
  const order = await db.order.findUniqueOrThrow({ where: { id: r.data.orderId }, include: { items: true, payments: true } });
  ok(order.status === "PAID" && order.payments[0].status === "PAID", "Zahlung erfolgreich → Bestellung „bezahlt“");
  ok(order.number >= 100001, `Bestellnummer #${order.number}`);
  ok(order.discountCents > 0 && order.totalCents === order.subtotalCents - order.discountCents + order.shippingCents, "Summen serverseitig korrekt");
  const after = await db.inventory.findUniqueOrThrow({ where: { variantId: v.id } });
  ok(after.quantity === stock0 - 3, `Bestand reduziert (${stock0} → ${after.quantity})`);
  ok((await db.coupon.findUniqueOrThrow({ where: { code: "WELCOME10" } })).usedCount >= 1, "Gutschein-Zähler erhöht");
  ok(!!order.invoiceFileId, "Rechnung (PDF) erzeugt");
  ok((await c.req("/api/cart")).data.cart.count === 0, "Warenkorb nach Kauf geleert");
  const success = await c.req(`/checkout/success/${order.id}?t=${order.guestToken}`);
  ok(success.status === 200 && success.text.includes(String(order.number)), "Bestätigungsseite (Gast-Token)");
  ok((await new Client().req(`/checkout/success/${order.id}?t=falsch`)).status === 404, "Bestätigungsseite ohne gültiges Token → 404");
  const inv = await c.req(`/api/files/${order.invoiceFileId}?t=${order.guestToken}`);
  ok(inv.status === 200 && inv.res.headers.get("content-type") === "application/pdf" && inv.text.startsWith("%PDF"), "Rechnung per Gast-Token abrufbar");
  ok((await new Client().req(`/api/files/${order.invoiceFileId}`)).status === 404, "Rechnung ohne Berechtigung → 404");

  console.log("Gutschein nur einmal pro Kunde");
  const again = new Client();
  await again.req("/api/cart", { method: "POST", json: { variantId: v.id, quantity: 1 } });
  await again.req("/api/cart/coupon", { method: "POST", json: { code: "WELCOME10" } });
  r = await again.req("/api/checkout", { method: "POST", json: body });
  ok(r.status === 409 && r.data.code === "coupon", "WELCOME10 zweites Mal mit derselben E-Mail → abgelehnt");
  ok((await db.order.count({ where: { email: body.email } })) === 1, "Abgelehnte Bestellung hinterlässt keine Bestellung");

  console.log("Überverkauf verhindern");
  const last = await db.productVariant.findFirstOrThrow({ where: { sku: v.sku } });
  await db.inventory.update({ where: { variantId: last.id }, data: { quantity: 1 } });
  const a = new Client(), b = new Client();
  await a.req("/api/cart", { method: "POST", json: { variantId: last.id, quantity: 1 } });
  await b.req("/api/cart", { method: "POST", json: { variantId: last.id, quantity: 1 } });
  const [ra, rb] = await Promise.all([a.req("/api/checkout", { method: "POST", json: { ...body, provider: "BANK_TRANSFER" } }), b.req("/api/checkout", { method: "POST", json: { ...body, provider: "BANK_TRANSFER" } })]);
  ok([ra.status, rb.status].sort().join() === "200,409", "Zwei parallele Käufer, 1 Stück → genau einer gewinnt", `${ra.status},${rb.status}`);
  ok((await db.inventory.findUniqueOrThrow({ where: { variantId: last.id } })).quantity === 0, "Bestand nie negativ");
  const bank = (ra.status === 200 ? ra : rb).data;
  const bo = await db.order.findUniqueOrThrow({ where: { id: bank.orderId } });
  ok(bo.status === "NEW", "Vorkasse-Bestellung wartet auf Zahlung");

  console.log("Reservierung läuft ab");
  await db.order.update({ where: { id: bo.id }, data: { reservationExpiresAt: new Date(Date.now() - 1000) } });
  const cron = await new Client().req("/api/cron/expire-orders", { headers: { Authorization: `Bearer ${process.env.CRON_SECRET}` } });
  ok(cron.status === 200 && cron.data.released >= 1, "Cron gibt abgelaufene Reservierung frei");
  ok((await db.inventory.findUniqueOrThrow({ where: { variantId: last.id } })).quantity === 1, "Bestand wieder zurückgebucht");
  ok((await db.order.findUniqueOrThrow({ where: { id: bo.id } })).status === "CANCELLED", "Bestellung storniert");
  ok((await new Client().req("/api/cron/expire-orders")).status === 401, "Cron ohne Secret → 401");

  console.log("Kundenkonto, Wunschliste, Merge");
  const email = `kunde-${Date.now()}@example.com`;
  const user = await db.user.create({ data: { email, firstName: "Erika", lastName: "Muster", passwordHash: await hashPassword("Testpasswort123") } });
  const g = new Client();
  await g.req("/api/wishlist", { method: "POST", json: { productId: prod.id } });
  await g.req("/api/cart", { method: "POST", json: { variantId: v.id, quantity: 1 } });
  const tok = randomToken(32);
  await db.session.create({ data: { userId: user.id, tokenHash: sha256(tok), expiresAt: new Date(Date.now() + 3600_000) } });
  g.jar.set("lumi_session", tok);
  const sess = await g.req("/api/session");
  ok(sess.data.user?.firstName === "Erika", "Session-Cookie authentifiziert");
  ok(sess.data.cartCount === 1 && sess.data.wishlist.includes(prod.id), "Gast-Warenkorb & -Wunschliste ins Konto übernommen");
  ok((await g.req("/account/wishlist")).text.includes("Sommerkleid"), "/account/wishlist zeigt gespeichertes Produkt");
  r = await g.req("/api/wishlist", { method: "POST", json: { productId: prod.id } });
  ok(r.data.saved === false, "Wunschliste Toggle entfernt");
  ok((await g.req("/admin")).status === 404, "Kunde kann /admin nicht sehen");
  ok((await g.req("/api/admin/upload", { method: "POST", body: new FormData() })).status === 403, "Kunde kann nicht hochladen");

  console.log("Bestellung als Kunde + Bewertung");
  r = await g.req("/api/checkout", { method: "POST", json: { ...body, email: "ignoriert@example.com" } });
  ok(r.status === 200, "Checkout als Kunde");
  const uo = await db.order.findUniqueOrThrow({ where: { id: r.data.orderId } });
  ok(uo.userId === user.id && uo.email === email, "Bestellung dem Konto zugeordnet");
  ok((await g.req(`/account/orders/${uo.number}`)).text.replace(/<!-- -->/g, "").includes("Bestellung #" + uo.number), "Kundenkonto zeigt Bestellung");
  ok((await new Client().req(`/account/orders/${uo.number}`)).status === 307, "Fremder sieht Bestellung nicht");
  const other = await db.user.create({ data: { email: `x-${Date.now()}@example.com`, firstName: "X", lastName: "Y", passwordHash: "x" } });
  const t2 = randomToken(32); await db.session.create({ data: { userId: other.id, tokenHash: sha256(t2), expiresAt: new Date(Date.now() + 3600_000) } });
  const o2 = new Client(); o2.jar.set("lumi_session", t2);
  ok((await o2.req(`/account/orders/${uo.number}`)).status === 404, "Anderer Kunde: 404 statt fremde Bestellung");
  ok((await o2.req("/api/reviews", { method: "POST", json: { productId: prod.id, rating: 5, body: "Toll toll toll toll" } })).status === 403, "Bewertung ohne Kauf → 403");
  r = await g.req("/api/reviews", { method: "POST", json: { productId: prod.id, rating: 5, title: "Super", body: "Wunderschönes Kleid, sitzt perfekt." } });
  ok(r.status === 200, "Bewertung nach Kauf möglich");
  ok((await g.req("/api/reviews", { method: "POST", json: { productId: prod.id, rating: 4, body: "Zweite Bewertung zum selben Produkt" } })).status === 409, "Doppelte Bewertung → 409");
  ok((await db.review.count({ where: { productId: prod.id, status: "APPROVED" } })) === 0, "Neue Bewertung wartet auf Moderation");

  console.log("Admin");
  const admin = await db.user.findFirstOrThrow({ where: { role: "ADMIN" } });
  const at = randomToken(32); await db.session.create({ data: { userId: admin.id, tokenHash: sha256(at), expiresAt: new Date(Date.now() + 3600_000) } });
  const ad = new Client(); ad.jar.set("lumi_session", at);
  for (const p of ["/admin", "/admin/products", "/admin/orders", "/admin/customers", "/admin/inventory", "/admin/coupons", "/admin/reviews", "/admin/contracts", "/admin/documents", "/admin/settings", "/admin/audit", "/admin/categories", `/admin/orders/${uo.id}`, `/admin/products/${prod.id}`])
    ok((await ad.req(p)).status === 200, `Admin ${p}`);
  const png = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==", "base64");
  const fdm = new FormData(); fdm.append("files", new Blob([png], { type: "image/png" }), "t.png");
  r = await ad.req("/api/admin/upload", { method: "POST", body: fdm });
  ok(r.status === 200 && r.data.files[0].url.startsWith("/media/"), "Admin-Bildupload");
  ok((await new Client().req(r.data.files[0].url)).res.headers.get("content-type") === "image/png", "Hochgeladenes Bild öffentlich ausgeliefert");
  const fake = new FormData(); fake.append("files", new Blob([Buffer.from("<script>alert(1)</script>")], { type: "image/png" }), "x.png");
  ok((await ad.req("/api/admin/upload", { method: "POST", body: fake })).status === 400, "Upload mit falschem Inhalt (Magic Bytes) abgelehnt");
  ok((await ad.req(`/api/files/${uo.invoiceFileId}`)).status === 200, "Admin darf Rechnungen sehen");
  ok(!(await db.order.findUniqueOrThrow({ where: { id: uo.id } })).invoiceFileId === false, "Rechnung für Kundenbestellung vorhanden");

  console.log("Bestellabwicklung (Domain)");
  const { shipOrder, markDelivered, refundOrder } = await import("../src/lib/orders");
  await shipOrder(uo.id, { carrier: "DHL", trackingNumber: "JJD000390001" });
  ok((await db.order.findUniqueOrThrow({ where: { id: uo.id } })).status === "SHIPPED", "Versendet (Shipment + Tracking)");
  ok((await g.req(`/account/orders/${uo.number}`)).text.includes("JJD000390001"), "Tracking im Kundenkonto sichtbar");
  await markDelivered(uo.id);
  ok((await db.notification.count({ where: { userId: user.id, type: "order.delivered" } })) === 1, "Benachrichtigung erzeugt");
  await refundOrder(uo.id);
  const refunded = await db.order.findUniqueOrThrow({ where: { id: uo.id } });
  ok(refunded.status === "REFUNDED", "Erstattung");
  ok((await db.inventory.findUniqueOrThrow({ where: { variantId: v.id } })).quantity >= 0, "Bestand konsistent nach Erstattung");

  console.log(`\n${pass} bestanden, ${failN} fehlgeschlagen`);
  await db.$disconnect();
  process.exit(failN ? 1 : 0);
}
main().catch((e) => { console.error(e); process.exit(1); });
