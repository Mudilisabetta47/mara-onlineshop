export async function register() {
  // Nicht während `next build` – nur beim tatsächlichen Serverstart. Wirft absichtlich nicht (siehe middleware.ts).
  if (process.env.NEXT_RUNTIME !== "nodejs" || process.env.NEXT_PHASE === "phase-production-build") return;
  const { logConfig } = await import("./lib/config");
  logConfig();
}
