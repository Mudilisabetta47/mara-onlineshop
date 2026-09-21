import type { Metadata } from "next";
import { RegisterForm } from "./RegisterForm";
export const metadata: Metadata = { title: "Konto erstellen", robots: { index: false } };

export default async function RegisterPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  return <RegisterForm next={(await searchParams).next ?? ""} />;
}
