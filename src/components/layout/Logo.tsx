import Link from "next/link";

export function Logo({ className = "" }: { className?: string }) {
  return (
    <Link href="/" aria-label="LUMI – Startseite" className={`group inline-flex items-center gap-2.5 ${className}`}>
      <span className="relative flex h-[26px] w-[26px] items-center justify-center rounded-full border border-rose-300/60 transition-transform duration-700 ease-premium group-hover:rotate-[120deg]">
        <span className="absolute h-[9px] w-[9px] rounded-full bg-rose-300 shadow-[0_0_14px_rgba(220,175,192,0.8)]" />
      </span>
      <span className="text-[19px] font-semibold tracking-[0.34em] text-cream">LUMI</span>
    </Link>
  );
}
