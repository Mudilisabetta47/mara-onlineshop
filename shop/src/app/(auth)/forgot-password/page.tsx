import type { Metadata } from "next";
import { ForgotForm } from "./ForgotForm";
export const metadata: Metadata = { title: "Passwort vergessen", robots: { index: false } };
export default function Page() { return <ForgotForm />; }
