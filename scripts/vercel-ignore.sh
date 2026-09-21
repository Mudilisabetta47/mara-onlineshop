#!/bin/bash
# Vercel „Ignored Build Step“ (vercel.json → ignoreCommand).  Exit 0 = Deployment überspringen, Exit 1 = bauen.
#
# Sicherheitsnetz: Production-Deployments (Branch main) werden ÜBERSPRUNGEN, solange ALLOW_PRODUCTION_DEPLOY nicht
# ausdrücklich auf 1 gesetzt ist (Vercel → Settings → Environment Variables, Scope „Production“).
# So geht nichts versehentlich „live“, bevor Production-Datenbank, Stripe-Live, Storage und Mail eingerichtet sind.
# Preview-Deployments (z. B. Branch staging) sind davon nicht betroffen.
if [ "${VERCEL_ENV:-}" = "production" ] && [ "${ALLOW_PRODUCTION_DEPLOY:-}" != "1" ]; then
  echo "⏸  Production-Deployment übersprungen (ALLOW_PRODUCTION_DEPLOY ist nicht 1). Staging = Branch 'staging' (Preview)."
  exit 0
fi
exit 1
