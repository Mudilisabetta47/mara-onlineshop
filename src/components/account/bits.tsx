import type { OrderStatus } from "@prisma/client";
import { CUSTOMER_STATUS_LABEL, CUSTOMER_STEPS, customerStepIndex } from "@/lib/orders";

const tone: Record<OrderStatus, string> = {
  NEW: "bg-white/10 text-cream/80", PAID: "bg-rose-500/20 text-rose-300", PROCESSING: "bg-rose-500/20 text-rose-300",
  SHIPPED: "bg-sky-300/15 text-sky-200", DELIVERED: "bg-emerald-300/15 text-emerald-200", CANCELLED: "bg-white/10 text-cream/50", REFUNDED: "bg-white/10 text-cream/60",
};

export const StatusPill = ({ status, admin, label }: { status: OrderStatus; admin?: boolean; label?: string }) => (
  <span className={`inline-flex rounded-full px-3 py-1 text-[12px] font-medium ${tone[status]}`}>{label ?? CUSTOMER_STATUS_LABEL[status]}</span>
);

export function StatusTimeline({ status }: { status: OrderStatus }) {
  const idx = customerStepIndex(status);
  if (idx < 0) return <p className="text-[14px] text-cream/60">Diese Bestellung wurde {status === "CANCELLED" ? "storniert" : "erstattet"}.</p>;
  return (
    <ol className="grid grid-cols-4 gap-2" aria-label="Bestellstatus">
      {CUSTOMER_STEPS.map((s, i) => (
        <li key={s} className="min-w-0">
          <div className={`h-[3px] rounded-full transition-colors ${i <= idx ? "bg-rose-300" : "bg-white/10"}`} />
          <p className={`mt-2.5 truncate text-[12.5px] ${i <= idx ? "text-cream" : "text-cream/35"}`}>{s}</p>
        </li>
      ))}
    </ol>
  );
}

export const PageTitle = ({ eyebrow, children, sub }: { eyebrow?: string; children: React.ReactNode; sub?: string }) => (
  <div className="mb-10">
    {eyebrow && <p className="eyebrow mb-3">{eyebrow}</p>}
    <h1 className="h-lg !text-[clamp(2.2rem,4.5vw,3.6rem)]">{children}</h1>
    {sub && <p className="mt-4 max-w-[520px] text-[16px] text-cream/60">{sub}</p>}
  </div>
);

export const Empty = ({ title, text, href, cta }: { title: string; text: string; href?: string; cta?: string }) => (
  <div className="rounded-3xl border border-dashed border-white/15 px-6 py-16 text-center">
    <p className="text-xl font-medium tracking-tight">{title}</p>
    <p className="mx-auto mt-2 max-w-sm text-[14.5px] text-cream/55">{text}</p>
    {href && <a href={href} className="btn-primary mt-7">{cta}</a>}
  </div>
);
