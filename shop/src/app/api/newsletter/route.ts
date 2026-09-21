import { z } from "zod";
import { db } from "@/lib/db";
import { ok, route } from "@/lib/http";
import { emailSchema } from "@/lib/validation";

export const POST = route(
  async (req) => {
    const { email } = z.object({ email: emailSchema }).parse(await req.json());
    await db.newsletterSubscriber.upsert({ where: { email }, update: {}, create: { email } });
    return ok({ ok: true });
  },
  { limit: { key: "newsletter", max: 8, windowMs: 10 * 60_000 } },
);
