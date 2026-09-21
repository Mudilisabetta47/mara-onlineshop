import Link from "next/link";
import Image from "next/image";
import { Logo } from "@/components/layout/Logo";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-[100svh] lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)]">
      <div className="relative flex flex-col px-6 py-8 md:px-14">
        <Logo />
        <div className="mx-auto flex w-full max-w-[440px] flex-1 flex-col justify-center py-14">{children}</div>
        <p className="text-[12px] text-cream/35"><Link href="/" className="hover:text-cream">← Zurück zum Shop</Link></p>
      </div>
      <div className="relative hidden overflow-hidden lg:block">
        <Image src="/seed/e/cat-maedchen.webp" alt="" fill priority sizes="50vw" className="object-cover" />
        <div className="absolute inset-0 bg-gradient-to-r from-ink-950 via-ink-950/20 to-transparent" />
        <div className="absolute inset-x-12 bottom-14"><p className="h-md max-w-[420px]">Dein Style.<br />Deine Auswahl.</p></div>
      </div>
    </div>
  );
}
