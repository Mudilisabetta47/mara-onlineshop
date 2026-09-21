import type { Metadata } from "next";
import { LoginForm } from "./LoginForm";
export const metadata: Metadata = { title: "Anmelden", robots: { index: false } };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string; reset?: string }> }) {
  const sp = await searchParams;
  return <LoginForm next={sp.next ?? ""} reset={sp.reset === "1"} />;
}
