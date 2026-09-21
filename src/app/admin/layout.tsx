import type { Metadata } from "next";
import Link from "next/link";
import { requireAdmin } from "@/lib/auth/guards";
import { AdminNav } from "@/components/admin/AdminNav";
import { logoutAction } from "@/app/(auth)/actions";

export const metadata: Metadata = { title: { default: "Admin", template: "%s | LUMI Admin" }, robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  // Autorisierung immer serverseitig – nicht-Admins erhalten 404
  const admin = await requireAdmin();
  return (
    <div className="min-h-[100svh] lg:grid lg:grid-cols-[248px_1fr]">
      <AdminNav name={`${admin.firstName} ${admin.lastName}`} />
      <div className="min-w-0">
        <div className="sticky top-0 z-20 hidden h-[60px] items-center justify-between border-b border-white/[0.07] bg-ink-950/80 px-8 backdrop-blur-xl lg:flex">
          <p className="text-[13px] text-cream/45">Admin · {admin.email}</p>
          <div className="flex items-center gap-5 text-[13px]"><Link href="/" target="_blank" className="text-cream/60 hover:text-cream">Shop ansehen ↗</Link><form action={logoutAction}><button className="text-cream/60 hover:text-cream">Abmelden</button></form></div>
        </div>
        <div className="mx-auto max-w-[1400px] px-5 py-8 md:px-8 md:py-10">{children}</div>
      </div>
    </div>
  );
}
