import { Card, PageHead } from "@/components/admin/ui";
import { ContractForm } from "../ContractForm";

export const metadata = { title: "Neuer Vertrag" };

export default async function Page({ searchParams }: { searchParams: Promise<{ email?: string }> }) {
  return <><PageHead title="Neuer Vertrag" /><Card><ContractForm email={(await searchParams).email} /></Card></>;
}
