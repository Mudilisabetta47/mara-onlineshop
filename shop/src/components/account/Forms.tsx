"use client";

import { useActionState, useState } from "react";
import { changePasswordAction, deleteAccountAction, saveAddressAction, updateProfileAction } from "@/app/(shop)/account/actions";
import { Field, FormMessage, SubmitButton, type FormState } from "@/components/ui/Form";
import { COUNTRIES } from "@/lib/shipping-client";

export function ProfileForm({ user }: { user: { firstName: string; lastName: string; email: string; phone: string | null } }) {
  const [state, action] = useActionState(updateProfileAction, null);
  const [email, setEmail] = useState(user.email);
  const fe = state?.fieldErrors ?? {};
  return (
    <form action={action} className="max-w-[560px] space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <Field label="Vorname" name="firstName" defaultValue={user.firstName} required autoComplete="given-name" />
        <Field label="Nachname" name="lastName" defaultValue={user.lastName} required autoComplete="family-name" />
      </div>
      <Field label="E-Mail" name="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" error={fe.email} />
      {email !== user.email && <Field label="Aktuelles Passwort (zur Bestätigung)" name="currentPassword" type="password" required autoComplete="current-password" error={fe.currentPassword} />}
      <Field label="Telefon" name="phone" defaultValue={user.phone ?? ""} type="tel" autoComplete="tel" />
      <FormMessage state={state && !state.fieldErrors ? state : null} />
      <SubmitButton>Speichern</SubmitButton>
    </form>
  );
}

export function PasswordForm() {
  const [state, action] = useActionState(changePasswordAction, null);
  const fe = state?.fieldErrors ?? {};
  return (
    <form action={action} className="max-w-[460px] space-y-4">
      <Field label="Aktuelles Passwort" name="current" type="password" required autoComplete="current-password" error={fe.current} />
      <Field label="Neues Passwort" name="password" type="password" required autoComplete="new-password" error={fe.password} hint="Mindestens 10 Zeichen, mit Buchstaben und Ziffern." />
      <Field label="Neues Passwort wiederholen" name="password2" type="password" required autoComplete="new-password" error={fe.password2} />
      <FormMessage state={state && !state.fieldErrors ? state : null} />
      <SubmitButton>Passwort ändern</SubmitButton>
    </form>
  );
}

type Addr = { id: string; label: string | null; firstName: string; lastName: string; company: string | null; line1: string; line2: string | null; postalCode: string; city: string; country: string; phone: string | null; isDefault: boolean };

export function AddressForm({ address, onDone }: { address?: Addr; onDone?: () => void }) {
  const [state, action] = useActionState(async (p: FormState, f: FormData) => { const r = await saveAddressAction(p, f); if (r?.ok) onDone?.(); return r; }, null);
  const fe = state?.fieldErrors ?? {};
  return (
    <form action={action} className="grid gap-4 sm:grid-cols-2">
      <input type="hidden" name="id" value={address?.id ?? ""} />
      <Field label="Bezeichnung" name="label" defaultValue={address?.label ?? ""} placeholder="z. B. Zuhause" className="sm:col-span-2" />
      <Field label="Vorname" name="firstName" defaultValue={address?.firstName} required autoComplete="given-name" error={fe.firstName} />
      <Field label="Nachname" name="lastName" defaultValue={address?.lastName} required autoComplete="family-name" error={fe.lastName} />
      <Field label="Firma" name="company" defaultValue={address?.company ?? ""} className="sm:col-span-2" autoComplete="organization" />
      <Field label="Straße und Hausnummer" name="line1" defaultValue={address?.line1} required autoComplete="address-line1" error={fe.line1} className="sm:col-span-2" />
      <Field label="Adresszusatz" name="line2" defaultValue={address?.line2 ?? ""} autoComplete="address-line2" className="sm:col-span-2" />
      <Field label="PLZ" name="postalCode" defaultValue={address?.postalCode} required inputMode="numeric" autoComplete="postal-code" error={fe.postalCode} />
      <Field label="Ort" name="city" defaultValue={address?.city} required autoComplete="address-level2" error={fe.city} />
      <div><label className="label" htmlFor="country">Land</label><select id="country" name="country" defaultValue={address?.country ?? "DE"} className="field">{COUNTRIES.map((c) => <option key={c.code} value={c.code}>{c.name}</option>)}</select></div>
      <Field label="Telefon" name="phone" defaultValue={address?.phone ?? ""} type="tel" autoComplete="tel" />
      <label className="flex items-center gap-3 text-[14px] text-cream/70 sm:col-span-2"><input type="checkbox" name="isDefault" defaultChecked={address?.isDefault} className="h-4 w-4 accent-[#A95D7C]" /> Als Standardadresse verwenden</label>
      <div className="sm:col-span-2"><FormMessage state={state && !state.fieldErrors ? state : null} /></div>
      <div className="flex gap-3 sm:col-span-2"><SubmitButton>Adresse speichern</SubmitButton>{onDone && <button type="button" onClick={onDone} className="btn-ghost">Abbrechen</button>}</div>
    </form>
  );
}

export function DeleteAccountForm() {
  const [state, action] = useActionState(deleteAccountAction, null);
  const [open, setOpen] = useState(false);
  if (!open) return <button onClick={() => setOpen(true)} className="text-[14px] text-[#f0a3b9] underline underline-offset-4">Konto löschen …</button>;
  return (
    <form action={action} className="max-w-[460px] space-y-4 rounded-2xl border border-[#f0a3b9]/30 p-5">
      <p className="text-[14px] text-cream/70">Dein Konto, deine Adressen und deine Wunschliste werden unwiderruflich gelöscht. Bestellungen bleiben aus gesetzlichen Gründen (Aufbewahrungspflicht) ohne Kontoverknüpfung erhalten.</p>
      <Field label="Passwort zur Bestätigung" name="password" type="password" required autoComplete="current-password" />
      <FormMessage state={state} />
      <div className="flex gap-3"><SubmitButton className="btn bg-[#f0a3b9] text-ink-950 hover:bg-[#f7bccd]">Endgültig löschen</SubmitButton><button type="button" onClick={() => setOpen(false)} className="btn-ghost">Abbrechen</button></div>
    </form>
  );
}
