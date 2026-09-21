"use client";

import Link from "next/link";
import { useActionState } from "react";
import { registerAction } from "../actions";
import { Field, FormMessage, SubmitButton } from "@/components/ui/Form";

export function RegisterForm({ next }: { next: string }) {
  const [state, action] = useActionState(registerAction, null);
  const fe = state?.fieldErrors ?? {};
  return (
    <>
      <p className="eyebrow mb-4">Konto</p>
      <h1 className="h-lg mb-8 !text-[clamp(2.4rem,5vw,3.6rem)]">Konto<br />erstellen.</h1>
      <form action={action} className="space-y-4">
        <input type="hidden" name="next" value={next} />
        <div className="grid grid-cols-2 gap-3">
          <Field label="Vorname" name="firstName" autoComplete="given-name" required error={fe.firstName} defaultValue={state?.values?.firstName} />
          <Field label="Nachname" name="lastName" autoComplete="family-name" required error={fe.lastName} defaultValue={state?.values?.lastName} />
        </div>
        <Field label="E-Mail" name="email" type="email" autoComplete="email" required error={fe.email} defaultValue={state?.values?.email} />
        <Field label="Passwort" name="password" type="password" autoComplete="new-password" required error={fe.password} hint="Mindestens 10 Zeichen, mit Buchstaben und Ziffern." />
        <Field label="Passwort wiederholen" name="password2" type="password" autoComplete="new-password" required error={fe.password2} />
        <label className="flex cursor-pointer items-start gap-3 text-[13.5px] text-cream/65"><input type="checkbox" name="newsletter" className="mt-1 h-4 w-4 accent-[#A95D7C]" /> Ich möchte den Newsletter erhalten (jederzeit kündbar).</label>
        <label className="flex cursor-pointer items-start gap-3 text-[13.5px] text-cream/65"><input type="checkbox" name="terms" required className="mt-1 h-4 w-4 accent-[#A95D7C]" /> <span>Ich habe die <Link href="/datenschutz" target="_blank" className="underline underline-offset-2">Datenschutzerklärung</Link> gelesen.</span></label>
        {fe.terms && <p className="field-error">{fe.terms}</p>}
        <FormMessage state={state && !state.fieldErrors ? state : null} />
        <SubmitButton className="btn-primary w-full">Konto erstellen</SubmitButton>
      </form>
      <p className="mt-8 text-center text-[14px] text-cream/55">Schon ein Konto? <Link href="/login" className="text-cream underline underline-offset-4">Anmelden</Link></p>
    </>
  );
}
