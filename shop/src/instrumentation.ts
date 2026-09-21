export async function register() {
  // Nicht während `next build` prüfen – nur beim tatsächlichen Serverstart.
  if (process.env.NEXT_RUNTIME !== "nodejs" || process.env.NEXT_PHASE === "phase-production-build") return;
  const { assertConfig } = await import("./lib/config");
  assertConfig();
}
