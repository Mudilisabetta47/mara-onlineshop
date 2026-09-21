"use client";

import { useFormStatus } from "react-dom";
import type { InputHTMLAttributes, ReactNode } from "react";

export type FormState = { error?: string; ok?: string; fieldErrors?: Record<string, string>; values?: Record<string, string> } | null;

export function SubmitButton({ children, className = "btn-primary", pendingText }: { children: ReactNode; className?: string; pendingText?: string }) {
  const { pending } = useFormStatus();
  return <button type="submit" disabled={pending} className={className}>{pending ? pendingText ?? "Bitte warten …" : children}</button>;
}

export function Field({ label, name, error, hint, className = "", ...rest }: { label: string; name: string; error?: string; hint?: string } & InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className={className}>
      <label htmlFor={name} className="label">{label}{rest.required ? "" : <span className="text-cream/30"> (optional)</span>}</label>
      <input id={name} name={name} className="field" aria-invalid={!!error} aria-describedby={error ? `${name}-err` : undefined} {...rest} />
      {hint && !error && <p className="mt-1.5 text-[12px] text-cream/40">{hint}</p>}
      {error && <p id={`${name}-err`} className="field-error" role="alert">{error}</p>}
    </div>
  );
}

export function FormMessage({ state }: { state: FormState }) {
  if (!state) return null;
  if (state.error) return <p role="alert" className="rounded-xl border border-[#f0a3b9]/30 bg-[#f0a3b9]/10 px-4 py-3 text-[13.5px] text-[#f0a3b9]">{state.error}</p>;
  if (state.ok) return <p role="status" className="rounded-xl border border-rose-300/30 bg-rose-500/10 px-4 py-3 text-[13.5px] text-rose-300">{state.ok}</p>;
  return null;
}
