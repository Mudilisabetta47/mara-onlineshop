"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { loadStripe, type Stripe, type StripeElements } from "@stripe/stripe-js";
import { Elements, PaymentElement, useElements, useStripe } from "@stripe/react-stripe-js";
import { useShop } from "@/components/shop/ShopProvider";
import { AnimatedPrice } from "@/components/ui/Price";
import { CheckIcon } from "@/components/ui/Icons";
import { formatEUR } from "@/lib/money";
import { COUNTRIES } from "@/lib/shipping-client";

type Addr = { firstName: string; lastName: string; company: string; line1: string; line2: string; postalCode: string; city: string; country: "DE" | "AT"; phone: string };
const EMPTY_ADDR: Addr = { firstName: "", lastName: "", company: "", line1: "", line2: "", postalCode: "", city: "", country: "DE", phone: "" };
type SavedAddr = Addr & { id: string; label: string | null; isDefault: boolean };
type Config = {
  payments: Record<"STRIPE" | "PAYPAL" | "BANK_TRANSFER" | "TEST", boolean>;
  stripePublishableKey: string | null;
  shipping: { methods: { id: "standard" | "express"; label: string; carrier: string; eta: string; priceCents: number }[]; freeThresholdCents: number };
  taxRatePercent: number;
};
type Provider = "STRIPE" | "PAYPAL" | "BANK_TRANSFER" | "TEST";
const STEPS = ["Adresse", "Versand", "Zahlung", "Prüfen", "Bestätigung"] as const;
const PAY_LABEL: Record<Provider, { title: string; sub: string }> = {
  STRIPE: { title: "Karte, Apple Pay, Google Pay & mehr", sub: "Sicher über Stripe – Kartendaten erreichen nie unseren Server." },
  PAYPAL: { title: "PayPal", sub: "Du wirst zu PayPal weitergeleitet und kommst danach zurück." },
  BANK_TRANSFER: { title: "Vorkasse / Überweisung", sub: "Wir versenden, sobald dein Geld eingegangen ist." },
  TEST: { title: "Testzahlung (nur Entwicklung)", sub: "Schließt die Bestellung ohne Zahlungsanbieter als bezahlt ab." },
};

let stripePromise: Promise<Stripe | null> | null = null;

export function CheckoutFlow({ user, saved }: { user: { email: string; firstName: string; lastName: string } | null; saved: SavedAddr[] }) {
  const router = useRouter();
  const sp = useSearchParams();
  const { cart, refreshCart, cartLoading, applyCoupon, removeCoupon } = useShop();
  const [cfg, setCfg] = useState<Config | null>(null);
  const [step, setStep] = useState(0);
  const [email, setEmail] = useState(user?.email ?? "");
  const def = saved.find((s) => s.isDefault) ?? saved[0];
  const [savedId, setSavedId] = useState<string | "new">(def?.id ?? "new");
  const [ship, setShip] = useState<Addr>(def ?? { ...EMPTY_ADDR, firstName: user?.firstName ?? "", lastName: user?.lastName ?? "" });
  const [diffBilling, setDiffBilling] = useState(false);
  const [bill, setBill] = useState<Addr>(EMPTY_ADDR);
  const [method, setMethod] = useState<"standard" | "express">("standard");
  const [provider, setProvider] = useState<Provider | null>(null);
  const [note, setNote] = useState("");
  const [terms, setTerms] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(sp.get("error"));
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [code, setCode] = useState("");
  const [codeErr, setCodeErr] = useState<string | null>(null);
  const stripeRef = useRef<{ stripe: Stripe; elements: StripeElements } | null>(null);
  const top = useRef<HTMLDivElement>(null);

  useEffect(() => { void refreshCart(); }, [refreshCart]);
  useEffect(() => {
    fetch("/api/checkout/config").then((r) => r.json()).then((c: Config) => {
      setCfg(c);
      setProvider((p) => p ?? (["STRIPE", "PAYPAL", "BANK_TRANSFER", "TEST"] as Provider[]).find((k) => c.payments[k]) ?? null);
      if (c.stripePublishableKey) stripePromise ??= loadStripe(c.stripePublishableKey);
    });
  }, []);

  const goods = Math.max(0, cart.subtotalCents - cart.discountCents);
  const shipMethod = cfg?.shipping.methods.find((m) => m.id === method);
  const shippingCents = cart.lines.length === 0 ? 0 : method === "express" ? shipMethod?.priceCents ?? 0 : goods >= (cfg?.shipping.freeThresholdCents ?? 7500) ? 0 : cfg?.shipping.methods.find((m) => m.id === "standard")?.priceCents ?? 0;
  const total = goods + shippingCents;
  const tax = Math.round(total - total / (1 + (cfg?.taxRatePercent ?? 19) / 100));

  const go = (n: number) => { setStep(n); setError(null); setTimeout(() => top.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 30); };
  const usesSaved = savedId !== "new" && !!saved.find((s) => s.id === savedId);

  const pickSaved = (id: string) => {
    setSavedId(id);
    const s = saved.find((x) => x.id === id);
    if (s) setShip({ firstName: s.firstName, lastName: s.lastName, company: s.company ?? "", line1: s.line1, line2: s.line2 ?? "", postalCode: s.postalCode, city: s.city, country: s.country, phone: s.phone ?? "" });
    else setShip({ ...EMPTY_ADDR, firstName: user?.firstName ?? "", lastName: user?.lastName ?? "" });
  };

  const addrOk = (a: Addr) => a.firstName && a.lastName && a.line1 && /^\d{4,5}$/.test(a.postalCode) && a.city;
  const step0Ok = /^\S+@\S+\.\S+$/.test(email) && addrOk(ship) && (!diffBilling || addrOk(bill));

  async function placeOrder() {
    if (!provider || !terms) return;
    setBusy(true); setError(null); setFieldErrors({});
    try {
      if (provider === "STRIPE") {
        const s = stripeRef.current;
        if (!s) throw new Error("Das Zahlungsformular ist noch nicht geladen.");
        const { error: e } = await s.elements.submit();
        if (e) { setError(e.message ?? "Bitte prüfe deine Zahlungsdaten."); go(2); setBusy(false); return; }
      }
      const res = await fetch("/api/checkout", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, shipping: ship, billing: diffBilling ? bill : undefined, shippingMethod: method, provider, note: note || undefined, acceptTerms: true }),
      });
      const d = await res.json();
      if (!res.ok) {
        if (d.fields) setFieldErrors(d.fields);
        setError(d.error ?? "Die Bestellung konnte nicht angelegt werden.");
        if (d.code === "stock" || d.code === "empty_cart") void refreshCart();
        setBusy(false);
        if (d.code === "validation") go(0);
        return;
      }
      if (d.action === "stripe") {
        const s = stripeRef.current!;
        const { error: e } = await s.stripe.confirmPayment({ elements: s.elements, clientSecret: d.clientSecret, confirmParams: { return_url: d.returnUrl }, redirect: "if_required" });
        if (e) { setError(e.message ?? "Die Zahlung wurde abgelehnt. Bitte versuche es mit einer anderen Zahlungsart."); setBusy(false); go(2); return; }
        router.push(`/checkout/success/${d.orderId}?t=${d.guestToken}`);
        return;
      }
      if (d.action === "redirect") { window.location.href = d.url; return; }
      router.push(d.url);
    } catch (e) {
      setError((e as Error).message || "Etwas ist schiefgelaufen.");
      setBusy(false);
    }
  }

  if (!cfg || (cartLoading && cart.lines.length === 0)) return <div className="container-x pt-40"><div className="skeleton mx-auto h-64 max-w-3xl rounded-3xl" /></div>;
  if (cart.lines.length === 0)
    return (
      <div className="container-x flex min-h-[70svh] flex-col items-center justify-center text-center">
        <h1 className="h-lg mb-4">Dein Warenkorb<br />ist leer.</h1>
        <p className="mb-8 text-cream/55">Lege zuerst Artikel in den Warenkorb, um zur Kasse zu gehen.</p>
        <Link href="/shop" className="btn-primary">Jetzt entdecken</Link>
      </div>
    );

  const content = (
    <div ref={top} className="container-x scroll-mt-24 pb-24 pt-8">
      <Stepper step={step} onGo={(n) => n < step && go(n)} />
      <div className="mt-10 grid gap-10 lg:grid-cols-[1fr_440px] xl:gap-16">
        <div className="min-w-0">
          <AnimatePresence>{error && <motion.p initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} role="alert" className="mb-6 rounded-2xl border border-[#f0a3b9]/30 bg-[#f0a3b9]/10 px-5 py-4 text-[14px] text-[#f0a3b9]">{error}</motion.p>}</AnimatePresence>

          {/* 1 · Adresse */}
          <Section n={0} step={step} title="Adresse">
            {!user && (
              <div className="mb-8 grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-cream/70 bg-white/[0.04] p-5"><p className="font-medium">Als Gast bestellen</p><p className="mt-1 text-[13px] text-cream/55">Schnell und ohne Konto.</p></div>
                <Link href="/login?next=/checkout" className="rounded-2xl border border-white/12 p-5 transition-colors hover:border-rose-300/60"><p className="font-medium">Mit Konto bestellen</p><p className="mt-1 text-[13px] text-cream/55">Anmelden oder <span className="underline">Konto erstellen</span> – Bestellungen verwalten, Adressen speichern.</p></Link>
              </div>
            )}
            <div className="grid gap-4">
              <F label="E-Mail für Bestellbestätigung" value={email} onChange={setEmail} type="email" autoComplete="email" required readOnly={!!user} error={fieldErrors.email?.[0]} />
            </div>
            {saved.length > 0 && (
              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                {saved.map((s) => <button type="button" key={s.id} onClick={() => pickSaved(s.id)} className={`rounded-2xl border p-4 text-left text-[14px] transition-colors ${savedId === s.id ? "border-cream bg-white/[0.05]" : "border-white/12 hover:border-white/40"}`}><b className="font-medium">{s.label || `${s.firstName} ${s.lastName}`}</b><br /><span className="text-cream/60">{s.line1}, {s.postalCode} {s.city}</span></button>)}
                <button type="button" onClick={() => pickSaved("new")} className={`rounded-2xl border border-dashed p-4 text-left text-[14px] ${savedId === "new" ? "border-cream" : "border-white/20 hover:border-white/40"}`}>+ Neue Adresse</button>
              </div>
            )}
            {!usesSaved && <AddrFields a={ship} set={setShip} prefix="ship" errors={fieldErrors} />}
            <label className="mt-6 flex min-h-[44px] cursor-pointer items-center gap-3 text-[14.5px] text-cream/75"><input type="checkbox" checked={diffBilling} onChange={(e) => setDiffBilling(e.target.checked)} className="h-4 w-4 accent-[#A95D7C]" /> Abweichende Rechnungsadresse</label>
            {diffBilling && <div className="mt-4"><p className="eyebrow mb-4">Rechnungsadresse</p><AddrFields a={bill} set={setBill} prefix="bill" errors={{}} /></div>}
            <Next disabled={!step0Ok} onClick={() => go(1)}>Weiter zum Versand</Next>
          </Section>

          {/* 2 · Versand */}
          <Section n={1} step={step} title="Versand">
            <div className="grid gap-3" role="radiogroup" aria-label="Versandart">
              {cfg.shipping.methods.map((m) => {
                const price = m.id === "express" ? m.priceCents : goods >= cfg.shipping.freeThresholdCents ? 0 : m.priceCents;
                return (
                  <Radio key={m.id} checked={method === m.id} onChange={() => setMethod(m.id)} title={m.label} sub={`${m.carrier} · ${m.eta}`} right={price === 0 ? <span className="text-rose-300">Kostenlos</span> : formatEUR(price)} />
                );
              })}
            </div>
            <p className="mt-4 text-[13px] text-cream/45">Kostenloser Standardversand ab {formatEUR(cfg.shipping.freeThresholdCents)} Bestellwert. Lieferung nach Deutschland und Österreich.</p>
            <div className="mt-6"><label className="label" htmlFor="note">Anmerkung zur Bestellung (optional)</label><textarea id="note" value={note} onChange={(e) => setNote(e.target.value)} maxLength={500} className="field min-h-[80px] py-3" /></div>
            <Next onClick={() => go(2)}>Weiter zur Zahlung</Next>
          </Section>

          {/* 3 · Zahlung */}
          <Section n={2} step={step} title="Zahlung" keepMounted>
            <div className="grid gap-3" role="radiogroup" aria-label="Zahlungsart">
              {(Object.keys(PAY_LABEL) as Provider[]).filter((k) => cfg.payments[k]).map((k) => (
                <div key={k}>
                  <Radio checked={provider === k} onChange={() => setProvider(k)} title={PAY_LABEL[k].title} sub={PAY_LABEL[k].sub} />
                  {k === "STRIPE" && provider === "STRIPE" && <div className="mt-3 rounded-2xl border border-white/10 p-4"><PaymentElement options={{ layout: "accordion" }} /></div>}
                </div>
              ))}
            </div>
            {!Object.values(cfg.payments).some(Boolean) && <p className="rounded-2xl border border-[#f0a3b9]/30 p-5 text-[#f0a3b9]">Derzeit ist keine Zahlungsart konfiguriert.</p>}
            <p className="mt-5 flex items-center gap-2 text-[12.5px] text-cream/45">🔒 Zahlungsdaten werden ausschließlich von Stripe bzw. PayPal verarbeitet und nie bei uns gespeichert.</p>
            <Next disabled={!provider} onClick={() => go(3)}>Bestellung prüfen</Next>
          </Section>

          {/* 4 · Prüfen */}
          <Section n={3} step={step} title="Bestellung prüfen">
            <div className="grid gap-4 md:grid-cols-2">
              <Review title="Lieferadresse" onEdit={() => go(0)}>{ship.firstName} {ship.lastName}<br />{ship.line1}{ship.line2 && <>, {ship.line2}</>}<br />{ship.postalCode} {ship.city}<br /><span className="text-cream/50">{email}</span></Review>
              <Review title="Rechnungsadresse" onEdit={() => go(0)}>{diffBilling ? <>{bill.firstName} {bill.lastName}<br />{bill.line1}<br />{bill.postalCode} {bill.city}</> : "Wie Lieferadresse"}</Review>
              <Review title="Versandart" onEdit={() => go(1)}>{shipMethod?.label}<br /><span className="text-cream/50">{shipMethod?.eta}</span></Review>
              <Review title="Zahlungsart" onEdit={() => go(2)}>{provider && PAY_LABEL[provider].title}</Review>
            </div>
            <label className="mt-8 flex cursor-pointer items-start gap-3 text-[14px] leading-relaxed text-cream/75">
              <input type="checkbox" checked={terms} onChange={(e) => setTerms(e.target.checked)} className="mt-1 h-[18px] w-[18px] shrink-0 accent-[#A95D7C]" />
              <span>Ich habe die <Link href="/agb" target="_blank" className="underline underline-offset-2">AGB</Link>, die <Link href="/widerruf" target="_blank" className="underline underline-offset-2">Widerrufsbelehrung</Link> und die <Link href="/datenschutz" target="_blank" className="underline underline-offset-2">Datenschutzerklärung</Link> gelesen und akzeptiere sie.</span>
            </label>
            <button onClick={placeOrder} disabled={!terms || busy} className="btn-primary mt-6 h-[60px] w-full text-[16px]">{busy ? <><span className="h-4 w-4 animate-spin rounded-full border-2 border-ink-950/30 border-t-ink-950" /> Bestellung wird angelegt …</> : <>Zahlungspflichtig bestellen · {formatEUR(total)}</>}</button>
            <p className="mt-3 text-center text-[12.5px] text-cream/40">Mit Klick auf „Zahlungspflichtig bestellen“ gibst du eine verbindliche Bestellung ab.</p>
          </Section>
        </div>

        {/* Zusammenfassung */}
        <aside className="lg:sticky lg:top-8 lg:self-start">
          <div className="panel p-6">
            <h2 className="mb-5 text-[19px] font-semibold tracking-tight">Deine Bestellung</h2>
            <ul className="divide-y divide-white/[0.07]">
              {cart.lines.map((l) => (
                <li key={l.id} className="flex gap-4 py-4 first:pt-0">
                  <div className="relative h-[84px] w-[66px] shrink-0 overflow-hidden rounded-lg bg-plum-900">{l.imageUrl && <Image src={l.imageUrl} alt="" fill sizes="66px" className="object-cover" />}<span className="absolute -right-0 -top-0 flex h-5 min-w-5 items-center justify-center rounded-bl-lg bg-cream px-1 text-[11px] font-semibold text-ink-950">{l.quantity}</span></div>
                  <div className="min-w-0 flex-1"><p className="truncate text-[14px] font-medium">{l.name}</p><p className="text-[12.5px] text-cream/50">{[l.color, l.size && `Gr. ${l.size}`].filter(Boolean).join(" · ")}</p>{l.problem && <p className="text-[12.5px] text-[#f0a3b9]">{l.problem === "reduced" ? `Nur noch ${l.stock} verfügbar` : "Nicht verfügbar"}</p>}</div>
                  <p className="text-[14px] tabular-nums">{formatEUR(l.lineTotalCents)}</p>
                </li>
              ))}
            </ul>
            <div className="mt-5 border-t border-white/10 pt-5">
              {cart.coupon ? <div className="mb-4 flex items-center justify-between rounded-xl bg-rose-500/10 px-3.5 py-2.5 text-[13px]"><span><b className="font-medium text-rose-300">{cart.coupon.code}</b></span><button onClick={() => removeCoupon()} className="text-cream/60 underline">Entfernen</button></div> : (
                <form className="mb-4" onSubmit={async (e) => { e.preventDefault(); if (!code.trim()) return; const r = await applyCoupon(code); setCodeErr(r); if (!r) setCode(""); }}>
                  <div className="flex gap-2"><input value={code} onChange={(e) => { setCode(e.target.value); setCodeErr(null); }} placeholder="Gutscheincode" aria-label="Gutscheincode" className="field !min-h-[44px] uppercase" /><button className="btn-ghost btn-sm shrink-0">Einlösen</button></div>
                  {codeErr && <p className="field-error">{codeErr}</p>}
                </form>
              )}
              <dl className="space-y-2 text-[14.5px]">
                <div className="flex justify-between"><dt className="text-cream/60">Warenkorb</dt><dd className="tabular-nums">{formatEUR(cart.subtotalCents)}</dd></div>
                {cart.discountCents > 0 && <div className="flex justify-between text-rose-300"><dt>Rabatt</dt><dd className="tabular-nums">−{formatEUR(cart.discountCents)}</dd></div>}
                <div className="flex justify-between"><dt className="text-cream/60">Versandkosten</dt><dd className="tabular-nums">{shippingCents === 0 ? <span className="text-rose-300">Kostenlos</span> : formatEUR(shippingCents)}</dd></div>
                <div className="flex justify-between text-cream/50"><dt>enthaltene MwSt. ({cfg.taxRatePercent} %)</dt><dd className="tabular-nums">{formatEUR(tax)}</dd></div>
                <div className="flex items-baseline justify-between border-t border-white/10 pt-4"><dt className="text-[16px] font-semibold">Gesamtbetrag</dt><dd className="text-[26px] font-semibold"><AnimatedPrice cents={total} /></dd></div>
              </dl>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );

  const stripeOn = provider === "STRIPE" && cfg.stripePublishableKey && stripePromise;
  return stripeOn ? (
    <Elements stripe={stripePromise!} options={{ mode: "payment", amount: Math.max(50, total), currency: "eur", paymentMethodCreation: "manual", locale: "de",
      appearance: { theme: "night", variables: { colorPrimary: "#A95D7C", colorBackground: "#151015", colorText: "#F6EEF2", colorDanger: "#f0a3b9", borderRadius: "12px", fontFamily: "Inter, system-ui, sans-serif" } } }}>
      <StripeBridge reg={stripeRef} />
      {content}
    </Elements>
  ) : content;
}

function StripeBridge({ reg }: { reg: React.MutableRefObject<{ stripe: Stripe; elements: StripeElements } | null> }) {
  const stripe = useStripe(), elements = useElements();
  useEffect(() => { reg.current = stripe && elements ? { stripe, elements } : null; return () => { reg.current = null; }; }, [stripe, elements, reg]);
  return null;
}

// ───────────── UI-Bausteine ─────────────

function Stepper({ step, onGo }: { step: number; onGo: (n: number) => void }) {
  return (
    <ol className="flex items-center gap-2 overflow-x-auto scrollbar-none" aria-label="Fortschritt">
      {STEPS.map((s, i) => (
        <li key={s} className="flex shrink-0 items-center gap-2">
          <button type="button" onClick={() => onGo(i)} disabled={i >= step} aria-current={i === step ? "step" : undefined}
            className={`flex min-h-[44px] items-center gap-2.5 rounded-full pr-4 text-[13.5px] transition-colors ${i === step ? "text-cream" : i < step ? "text-cream/70 hover:text-cream" : "text-cream/30"}`}>
            <span className={`flex h-7 w-7 items-center justify-center rounded-full border text-[12px] transition-all duration-500 ${i < step ? "border-rose-300 bg-rose-300 text-ink-950" : i === step ? "border-cream" : "border-white/15"}`}>{i < step ? <CheckIcon width={14} height={14} /> : i + 1}</span>
            <span className="hidden sm:inline">{s}</span>
            {i === step && <span className="sm:hidden">{s}</span>}
          </button>
          {i < STEPS.length - 1 && <span className={`h-px w-6 sm:w-10 ${i < step ? "bg-rose-300/70" : "bg-white/12"}`} />}
        </li>
      ))}
    </ol>
  );
}

function Section({ n, step, title, children, keepMounted }: { n: number; step: number; title: string; children: React.ReactNode; keepMounted?: boolean }) {
  const active = step === n;
  if (!active && !keepMounted) return null;
  return (
    <motion.section hidden={!active} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }} aria-labelledby={`s${n}`}>
      <h1 id={`s${n}`} className="h-lg mb-8 !text-[clamp(2rem,4vw,3rem)]">{title}</h1>
      {children}
    </motion.section>
  );
}

const Next = ({ children, onClick, disabled }: { children: React.ReactNode; onClick: () => void; disabled?: boolean }) => (
  <button type="button" onClick={onClick} disabled={disabled} className="btn-primary mt-8 w-full sm:w-auto sm:min-w-[280px]">{children}</button>
);

function Radio({ checked, onChange, title, sub, right }: { checked: boolean; onChange: () => void; title: string; sub?: string; right?: React.ReactNode }) {
  return (
    <button type="button" role="radio" aria-checked={checked} onClick={onChange}
      className={`flex w-full items-center gap-4 rounded-2xl border p-5 text-left transition-all duration-300 ${checked ? "border-cream bg-white/[0.05]" : "border-white/12 hover:border-white/35"}`}>
      <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition-colors ${checked ? "border-cream" : "border-white/30"}`}>{checked && <span className="h-2.5 w-2.5 rounded-full bg-rose-300" />}</span>
      <span className="min-w-0 flex-1"><span className="block text-[15px] font-medium">{title}</span>{sub && <span className="mt-0.5 block text-[13px] text-cream/50">{sub}</span>}</span>
      {right && <span className="text-[15px] tabular-nums">{right}</span>}
    </button>
  );
}

function Review({ title, children, onEdit }: { title: string; children: React.ReactNode; onEdit: () => void }) {
  return <div className="panel p-5"><div className="mb-2 flex justify-between"><p className="eyebrow !text-cream/45">{title}</p><button onClick={onEdit} className="min-h-[24px] text-[12.5px] text-cream/60 underline underline-offset-4 hover:text-cream">Ändern</button></div><p className="text-[14.5px] leading-relaxed text-cream/80">{children}</p></div>;
}

function F({ label, value, onChange, error, className = "", ...rest }: { label: string; value: string; onChange: (v: string) => void; error?: string; className?: string } & Omit<React.InputHTMLAttributes<HTMLInputElement>, "onChange" | "value">) {
  const id = `f-${label.replace(/\W/g, "")}-${rest.autoComplete ?? ""}`;
  return <div className={className}><label htmlFor={id} className="label">{label}{rest.required ? "" : <span className="text-cream/30"> (optional)</span>}</label><input id={id} value={value} onChange={(e) => onChange(e.target.value)} className="field" aria-invalid={!!error} {...rest} />{error && <p className="field-error" role="alert">{error}</p>}</div>;
}

function AddrFields({ a, set, prefix, errors }: { a: Addr; set: (a: Addr) => void; prefix: string; errors: Record<string, string[]> }) {
  const u = (k: keyof Addr) => (v: string) => set({ ...a, [k]: v } as Addr);
  const sec = prefix === "ship" ? "shipping" : "billing";
  const ac = (s: string) => `${sec} ${s}`;
  return (
    <div className="mt-6 grid gap-4 sm:grid-cols-2">
      <F label="Vorname" value={a.firstName} onChange={u("firstName")} required autoComplete={ac("given-name")} />
      <F label="Nachname" value={a.lastName} onChange={u("lastName")} required autoComplete={ac("family-name")} />
      <F label="Firma" value={a.company} onChange={u("company")} className="sm:col-span-2" autoComplete={ac("organization")} />
      <F label="Straße und Hausnummer" value={a.line1} onChange={u("line1")} required className="sm:col-span-2" autoComplete={ac("address-line1")} error={errors["shipping.line1"]?.[0]} />
      <F label="Adresszusatz" value={a.line2} onChange={u("line2")} className="sm:col-span-2" autoComplete={ac("address-line2")} />
      <F label="PLZ" value={a.postalCode} onChange={u("postalCode")} required inputMode="numeric" autoComplete={ac("postal-code")} />
      <F label="Ort" value={a.city} onChange={u("city")} required autoComplete={ac("address-level2")} />
      <div><label className="label" htmlFor={`${prefix}-country`}>Land</label><select id={`${prefix}-country`} className="field" value={a.country} onChange={(e) => set({ ...a, country: e.target.value as "DE" | "AT" })} autoComplete={ac("country")}>{COUNTRIES.map((c) => <option key={c.code} value={c.code}>{c.name}</option>)}</select></div>
      <F label="Telefon" value={a.phone} onChange={u("phone")} type="tel" autoComplete="tel" />
    </div>
  );
}
