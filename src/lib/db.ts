import { PrismaClient } from "@prisma/client";
import { resolveDatabaseUrl } from "./config";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    // Neon-/PgBouncer-Pooler-URL der Vercel-Integration korrekt für Prisma aufbereiten (siehe resolveDatabaseUrl)
    datasourceUrl: resolveDatabaseUrl(),
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;
