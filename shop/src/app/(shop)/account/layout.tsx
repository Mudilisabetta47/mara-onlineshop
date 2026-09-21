import type { Metadata } from "next";
import { requireUser } from "@/lib/auth/guards";
import { AccountNav } from "@/components/account/AccountNav";

export const metadata: Metadata = { title: { default: "Mein Konto", template: "%s | Mein Konto" }, robots: { index: false, follow: false } };

export default async function AccountLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser("/account");
  return (
    <div className="container-x pb-8 pt-[110px] md:pt-[130px]">
      <div className="grid gap-10 lg:grid-cols-[270px_1fr] lg:gap-16">
        <AccountNav name={`${user.firstName} ${user.lastName}`} email={user.email} isAdmin={user.role === "ADMIN"} />
        <div className="min-w-0 pb-16">{children}</div>
      </div>
    </div>
  );
}
