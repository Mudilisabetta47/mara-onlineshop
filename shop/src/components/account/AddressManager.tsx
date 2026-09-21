"use client";

import { useState } from "react";
import { AddressForm } from "./Forms";
import { deleteAddressAction, defaultAddressAction } from "@/app/(shop)/account/actions";

type Addr = { id: string; label: string | null; firstName: string; lastName: string; company: string | null; line1: string; line2: string | null; postalCode: string; city: string; country: string; phone: string | null; isDefault: boolean };

export function AddressManager({ addresses }: { addresses: Addr[] }) {
  const [editing, setEditing] = useState<string | "new" | null>(null);
  return (
    <div>
      <div className="grid gap-4 md:grid-cols-2">
        {addresses.map((a) => (
          <div key={a.id} className="panel p-6">
            {editing === a.id ? <AddressForm address={a} onDone={() => setEditing(null)} /> : (
              <>
                <div className="mb-3 flex items-center justify-between"><p className="text-[15px] font-medium">{a.label || "Adresse"}</p>{a.isDefault && <span className="rounded-full bg-rose-500/20 px-3 py-1 text-[11.5px] text-rose-300">Standard</span>}</div>
                <address className="text-[14.5px] not-italic leading-relaxed text-cream/70">{a.company && <>{a.company}<br /></>}{a.firstName} {a.lastName}<br />{a.line1}<br />{a.line2 && <>{a.line2}<br /></>}{a.postalCode} {a.city}<br />{a.country === "DE" ? "Deutschland" : "Österreich"}</address>
                <div className="mt-5 flex flex-wrap gap-x-5 gap-y-1 text-[13.5px]">
                  <button onClick={() => setEditing(a.id)} className="min-h-[44px] text-cream underline underline-offset-4">Bearbeiten</button>
                  {!a.isDefault && <form action={defaultAddressAction}><input type="hidden" name="id" value={a.id} /><button className="min-h-[44px] text-cream/60 underline underline-offset-4 hover:text-cream">Als Standard</button></form>}
                  <form action={deleteAddressAction}><input type="hidden" name="id" value={a.id} /><button className="min-h-[44px] text-[#f0a3b9] underline underline-offset-4">Löschen</button></form>
                </div>
              </>
            )}
          </div>
        ))}
        {editing !== "new" && <button onClick={() => setEditing("new")} className="flex min-h-[200px] items-center justify-center rounded-3xl border border-dashed border-white/20 text-[15px] text-cream/70 transition-colors hover:border-rose-300/60 hover:text-cream">+ Neue Adresse hinzufügen</button>}
      </div>
      {editing === "new" && <div className="panel mt-4 p-6"><AddressForm onDone={() => setEditing(null)} /></div>}
    </div>
  );
}
