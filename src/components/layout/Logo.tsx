import Link from "next/link";
import { BrandLogo } from "@/components/brand/Logo";

export function Logo({ className = "" }: { className?: string }) {
  return (
    <Link href="/" aria-label="Lilli und Lou – Startseite" className={`group inline-flex items-center ${className}`}>
      <BrandLogo className="h-[24px] w-auto sm:h-[27px]" />
    </Link>
  );
}
