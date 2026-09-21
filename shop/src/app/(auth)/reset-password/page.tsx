import type { Metadata } from "next";
import Link from "next/link";
import { ResetForm } from "./ResetForm";
export const metadata: Metadata = { title: "Neues Passwort", robots: { index: false } };

export default async function Page({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const token = (await searchParams).token;
  if (!token) return <p>Ungültiger Link. <Link href="/forgot-password" className="underline">Neuen Link anfordern</Link></p>;
  return <ResetForm token={token} />;
}
