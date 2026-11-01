import { and, asc, eq, inArray, ne, sql } from "drizzle-orm";
import { db } from "@/db";
import { foto, kategori, produkt, produktTema, tema } from "@/db/schema";

export type ProduktKarte = Awaited<ReturnType<typeof listoProduktet>>[number];

/** Public catalog: active and maintenance items (shown greyed out), never sold or retired ones. */
export async function listoProduktet(biznesId: string, filtra: { kategoria?: string; tema?: string } = {}) {
  const kushtet = [eq(produkt.biznesId, biznesId), inArray(produkt.statusi, ["AKTIV", "NE_MIREMBAJTJE"])];
  if (filtra.kategoria) {
    kushtet.push(
      sql`${produkt.kategoriId} = (select id from ${kategori} where ${kategori.biznesId} = ${biznesId} and ${kategori.slug} = ${filtra.kategoria})`,
    );
  }
  if (filtra.tema) {
    kushtet.push(
      sql`exists (select 1 from ${produktTema} pt join ${tema} t on t.id = pt.tema_id where pt.produkt_id = ${produkt.id} and t.slug = ${filtra.tema})`,
    );
  }
  return db
    .select({
      id: produkt.id,
      emri: produkt.emri,
      slug: produkt.slug,
      cmimiQira: produkt.cmimiQira,
      cmimiPorosi: produkt.cmimiPorosi,
      modet: produkt.modet,
      gjeresiCm: produkt.gjeresiCm,
      lartesiCm: produkt.lartesiCm,
      thellesiCm: produkt.thellesiCm,
      sasiaNeStok: produkt.sasiaNeStok,
      diteMontimi: produkt.diteMontimi,
      diteCmontimi: produkt.diteCmontimi,
      statusi: produkt.statusi,
      kategoria: kategori.emri,
      foto: sql<string | null>`(select ${foto.rruga} from ${foto} where ${foto.produktId} = ${produkt.id} order by ${foto.renditja} limit 1)`,
      kaNgjyra: sql<boolean>`exists (select 1 from opsion_produkti o where o.produkt_id = ${produkt.id} and o.lloji = 'NGJYRE')`,
    })
    .from(produkt)
    .leftJoin(kategori, eq(kategori.id, produkt.kategoriId))
    .where(and(...kushtet))
    .orderBy(asc(produkt.renditja), asc(produkt.emri));
}

export async function merrProduktin(biznesId: string, slug: string) {
  return db.query.produkt.findFirst({
    where: and(eq(produkt.biznesId, biznesId), eq(produkt.slug, slug), ne(produkt.statusi, "I_TERHEQUR")),
    with: {
      fotot: { orderBy: (f, { asc }) => [asc(f.renditja)] },
      kategori: true,
      temat: { with: { tema: true } },
      opsionet: {
        orderBy: (o, { asc }) => [asc(o.renditja)],
        with: { vlerat: { orderBy: (v, { asc }) => [asc(v.renditja)] } },
      },
    },
  });
}

/** Categories with at least one visible product, each with a cover photo and a count — for the home page. */
export async function kategoriteMeFoto(biznesId: string) {
  const teDukshme = sql`${produkt.statusi} in ('AKTIV', 'NE_MIREMBAJTJE')`;
  return db
    .select({
      emri: kategori.emri,
      slug: kategori.slug,
      produkte: sql<number>`count(${produkt.id})::int`,
      foto: sql<string | null>`(select f.rruga from ${foto} f join ${produkt} p2 on p2.id = f.produkt_id
        where p2.kategori_id = ${kategori.id} and p2.statusi in ('AKTIV', 'NE_MIREMBAJTJE')
        order by p2.renditja, f.renditja limit 1)`,
    })
    .from(kategori)
    .innerJoin(produkt, and(eq(produkt.kategoriId, kategori.id), teDukshme))
    .where(eq(kategori.biznesId, biznesId))
    .groupBy(kategori.id)
    .orderBy(asc(kategori.renditja), asc(kategori.emri));
}

/** Categories and themes that actually have products in this shop. */
export async function filtratEPerdorur(biznesId: string) {
  const [kategorite, temat] = await Promise.all([
    db
      .selectDistinct({ emri: kategori.emri, slug: kategori.slug, renditja: kategori.renditja })
      .from(kategori)
      .innerJoin(produkt, and(eq(produkt.kategoriId, kategori.id), eq(produkt.biznesId, biznesId), eq(produkt.statusi, "AKTIV")))
      .where(eq(kategori.biznesId, biznesId))
      .orderBy(asc(kategori.renditja)),
    db
      .selectDistinct({ emri: tema.emri, slug: tema.slug })
      .from(tema)
      .innerJoin(produktTema, and(eq(produktTema.temaId, tema.id), eq(produktTema.biznesId, biznesId)))
      .orderBy(asc(tema.emri)),
  ]);
  return { kategorite, temat };
}
