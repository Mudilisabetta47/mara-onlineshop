import Link from "next/link";
import type { ReactNode } from "react";

export const PageHead = ({ title, sub, actions }: { title: string; sub?: string; actions?: ReactNode }) => (
  <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
    <div><h1 className="text-[28px] font-semibold tracking-[-0.03em] md:text-[32px]">{title}</h1>{sub && <p className="mt-1 text-[14px] text-cream/50">{sub}</p>}</div>
    {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
  </div>
);

export const Card = ({ title, children, className = "", right }: { title?: string; children: ReactNode; className?: string; right?: ReactNode }) => (
  <section className={`rounded-2xl border border-white/[0.08] bg-ink-900/70 ${className}`}>
    {title && <div className="flex items-center justify-between border-b border-white/[0.07] px-5 py-4"><h2 className="text-[14.5px] font-medium">{title}</h2>{right}</div>}
    <div className="p-5">{children}</div>
  </section>
);

export const Stat = ({ label, value, sub, accent }: { label: string; value: ReactNode; sub?: ReactNode; accent?: boolean }) => (
  <div className="rounded-2xl border border-white/[0.08] bg-ink-900/70 p-5">
    <p className="text-[12px] uppercase tracking-[0.16em] text-cream/45">{label}</p>
    <p className={`mt-3 text-[30px] font-semibold tracking-tight tabular-nums ${accent ? "text-rose-300" : ""}`}>{value}</p>
    {sub && <p className="mt-1 text-[12.5px] text-cream/45">{sub}</p>}
  </div>
);

export const Badge = ({ tone = "neutral", children }: { tone?: "neutral" | "good" | "warn" | "bad" | "rose"; children: ReactNode }) => {
  const c = { neutral: "bg-white/10 text-cream/75", good: "bg-emerald-300/15 text-emerald-200", warn: "bg-amber-300/15 text-amber-200", bad: "bg-[#f0a3b9]/15 text-[#f0a3b9]", rose: "bg-rose-500/20 text-rose-300" }[tone];
  return <span className={`inline-flex whitespace-nowrap rounded-full px-2.5 py-1 text-[11.5px] font-medium ${c}`}>{children}</span>;
};

export const Table = ({ head, children, empty }: { head: string[]; children: ReactNode; empty?: string }) => (
  <div className="overflow-x-auto rounded-2xl border border-white/[0.08]" data-lenis-prevent>
    <table className="w-full min-w-[640px] text-left text-[13.5px]">
      <thead className="bg-white/[0.03] text-[11.5px] uppercase tracking-[0.12em] text-cream/45"><tr>{head.map((h, i) => <th key={i} className="whitespace-nowrap px-4 py-3 font-medium">{h}</th>)}</tr></thead>
      <tbody className="divide-y divide-white/[0.06] [&_td]:px-4 [&_td]:py-3.5 [&_td]:align-middle">{children}</tbody>
    </table>
    {empty && <p className="p-8 text-center text-cream/45">{empty}</p>}
  </div>
);

export const Tabs = ({ items, active }: { items: { label: string; href: string; key: string; count?: number }[]; active: string }) => (
  <div className="mb-6 flex flex-wrap gap-1.5">
    {items.map((t) => (
      <Link key={t.key} href={t.href} className={`inline-flex min-h-[38px] items-center gap-2 rounded-full border px-4 text-[13px] transition-colors ${active === t.key ? "border-cream bg-cream text-ink-950" : "border-white/12 text-cream/70 hover:border-white/35"}`}>
        {t.label}{t.count != null && <span className={`text-[11.5px] ${active === t.key ? "text-ink-950/60" : "text-cream/40"}`}>{t.count}</span>}
      </Link>
    ))}
  </div>
);

export const Btn = ({ children, className = "", ...p }: React.ButtonHTMLAttributes<HTMLButtonElement>) => (
  <button {...p} className={`inline-flex min-h-[40px] items-center justify-center gap-2 rounded-full border border-white/15 px-4 text-[13px] font-medium transition-colors hover:border-rose-300/60 hover:bg-white/[0.05] disabled:opacity-40 ${className}`}>{children}</button>
);
export const BtnPrimary = ({ children, className = "", ...p }: React.ButtonHTMLAttributes<HTMLButtonElement>) => (
  <button {...p} className={`inline-flex min-h-[40px] items-center justify-center gap-2 rounded-full bg-cream px-5 text-[13px] font-medium text-ink-950 transition-colors hover:bg-white disabled:opacity-40 ${className}`}>{children}</button>
);
export const LinkBtn = ({ href, children, primary }: { href: string; children: ReactNode; primary?: boolean }) => (
  <Link href={href} className={`inline-flex min-h-[40px] items-center justify-center gap-2 rounded-full px-5 text-[13px] font-medium transition-colors ${primary ? "bg-cream text-ink-950 hover:bg-white" : "border border-white/15 hover:border-rose-300/60 hover:bg-white/[0.05]"}`}>{children}</Link>
);

export const fieldCls = "min-h-[42px] w-full rounded-xl border border-white/[0.12] bg-white/[0.04] px-3.5 text-[14px] text-cream placeholder:text-cream/30 focus:border-rose-300/70 focus:outline-none focus:ring-4 focus:ring-rose-500/15";
export const Lbl = ({ label, children, hint, className = "" }: { label: string; children: ReactNode; hint?: string; className?: string }) => (
  <label className={`block ${className}`}><span className="mb-1.5 block text-[12px] font-medium text-cream/60">{label}</span>{children}{hint && <span className="mt-1 block text-[11.5px] text-cream/35">{hint}</span>}</label>
);
