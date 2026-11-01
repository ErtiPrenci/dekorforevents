import { eq } from "drizzle-orm";
import { cache } from "react";
import { db } from "@/db";
import { biznes } from "@/db/schema";

export type Biznes = typeof biznes.$inferSelect;

// Faza 1 runs one business. Faza 2 resolves it from the request hostname
// (subdomain or custom domain) — keep every caller going through here.
export const merrBiznesinPublik = cache(async (): Promise<Biznes> => {
  const slug = process.env.DEFAULT_BIZNES_SLUG;
  if (!slug) throw new Error("DEFAULT_BIZNES_SLUG is not set");
  const b = await db.query.biznes.findFirst({ where: eq(biznes.slug, slug) });
  if (!b) throw new Error(`Business "${slug}" not found — run npm run db:seed`);
  return b;
});

export async function merrBiznesinMeId(id: string): Promise<Biznes> {
  const b = await db.query.biznes.findFirst({ where: eq(biznes.id, id) });
  if (!b) throw new Error("Business not found");
  return b;
}
