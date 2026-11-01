import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { kategori, paletaNgjyrave, tema } from "@/db/schema";

/** Lists the product form needs: shared taxonomy and this business's palette. */
export async function teDhenatEFormes(biznesId: string) {
  const [kategorite, temat, paleta] = await Promise.all([
    db.select({ id: kategori.id, emri: kategori.emri }).from(kategori).orderBy(asc(kategori.renditja)),
    db.select({ id: tema.id, emri: tema.emri }).from(tema).orderBy(asc(tema.emri)),
    db
      .select({ id: paletaNgjyrave.id, emri: paletaNgjyrave.emri, hex: paletaNgjyrave.hex, cmimiShtese: paletaNgjyrave.cmimiShtese })
      .from(paletaNgjyrave)
      .where(eq(paletaNgjyrave.biznesId, biznesId))
      .orderBy(asc(paletaNgjyrave.renditja)),
  ]);
  return { kategorite, temat, paleta };
}
