import { and, asc, between, count, desc, eq, ilike, inArray, or, sql } from "drizzle-orm";
import { db } from "@/db";
import { klient, produkt, pushAbonim, rezervim } from "@/db/schema";
import { shtoDite, sot } from "./dates";
import type { Statusi } from "./status";

const meDetaje = {
  klient: { columns: { emri: true, telefoni: true } },
  rreshtat: { columns: { emriProduktit: true, sasia: true, kerkonAprovim: true } },
} as const;

export type RezervimNeListe = Awaited<ReturnType<typeof listoRezervimet>>[number];

export async function permbledhjaEPanelit(biznesId: string) {
  const dita = sot();
  const [aprovime, kapare, dorezime, jashte, [javaKjo], [nrProdukte], [nrPush]] = await Promise.all([
    db.query.rezervim.findMany({
      where: and(eq(rezervim.biznesId, biznesId), eq(rezervim.statusi, "NE_PRITJE_TE_APROVIMIT")),
      with: meDetaje,
      orderBy: asc(rezervim.krijuarMe),
    }),
    db.query.rezervim.findMany({
      where: and(eq(rezervim.biznesId, biznesId), eq(rezervim.statusi, "NE_PRITJE_TE_KAPARIT")),
      with: meDetaje,
      orderBy: asc(rezervim.mbahetDeri),
    }),
    db.query.rezervim.findMany({
      where: and(
        eq(rezervim.biznesId, biznesId),
        eq(rezervim.statusi, "KONFIRMUAR"),
        between(rezervim.dataEventit, dita, shtoDite(dita, 3)),
      ),
      with: meDetaje,
      orderBy: asc(rezervim.dataEventit),
    }),
    db.query.rezervim.findMany({
      where: and(eq(rezervim.biznesId, biznesId), eq(rezervim.statusi, "DOREZUAR")),
      with: meDetaje,
      orderBy: asc(rezervim.dataEventit),
    }),
    db
      .select({ n: count() })
      .from(rezervim)
      .where(
        and(
          eq(rezervim.biznesId, biznesId),
          inArray(rezervim.statusi, ["NE_PRITJE_TE_APROVIMIT", "NE_PRITJE_TE_KAPARIT", "KONFIRMUAR", "DOREZUAR"]),
          between(rezervim.dataEventit, dita, shtoDite(dita, 7)),
        ),
      ),
    db.select({ n: count() }).from(produkt).where(eq(produkt.biznesId, biznesId)),
    db.select({ n: count() }).from(pushAbonim).where(eq(pushAbonim.biznesId, biznesId)),
  ]);
  return { aprovime, kapare, dorezime, jashte, javaKjo: javaKjo.n, nrProdukte: nrProdukte.n, nrPush: nrPush.n };
}

export const GRUPET: Record<string, { emri: string; statuset: Statusi[] }> = {
  aktive: { emri: "Aktive", statuset: ["NE_PRITJE_TE_APROVIMIT", "NE_PRITJE_TE_KAPARIT", "KONFIRMUAR", "DOREZUAR"] },
  aprovim: { emri: "Për konfirmim", statuset: ["NE_PRITJE_TE_APROVIMIT"] },
  kapar: { emri: "Kapar në pritje", statuset: ["NE_PRITJE_TE_KAPARIT"] },
  konfirmuar: { emri: "Konfirmuar", statuset: ["KONFIRMUAR"] },
  jashte: { emri: "Jashtë punishtes", statuset: ["DOREZUAR"] },
  arkiv: { emri: "Arkiv", statuset: ["PERFUNDUAR", "ANULUAR", "REFUZUAR", "SKADUAR", "MOSPARAQITJE"] },
};

export async function listoRezervimet(biznesId: string, grupi: string, kerkim?: string) {
  const g = GRUPET[grupi] ?? GRUPET.aktive;
  const q = kerkim?.trim();
  const shifrat = q?.replace(/\D/g, "").replace(/^0/, "");
  return db.query.rezervim.findMany({
    where: and(
      eq(rezervim.biznesId, biznesId),
      inArray(rezervim.statusi, g.statuset),
      q
        ? or(
            ilike(rezervim.kodi, `%${q}%`),
            sql`${rezervim.klientId} in (select ${klient.id} from ${klient} where ${klient.biznesId} = ${biznesId} and (${ilike(klient.emri, `%${q}%`)}${
              shifrat && shifrat.length >= 4 ? sql` or ${klient.telefoni} like ${`%${shifrat}%`}` : sql``
            }))`,
          )
        : undefined,
    ),
    with: meDetaje,
    orderBy: grupi === "arkiv" ? desc(rezervim.dataEventit) : asc(rezervim.dataEventit),
    limit: 200,
  });
}

export async function rezervimetEMuajit(biznesId: string, nga: string, deri: string) {
  return db.query.rezervim.findMany({
    where: and(
      eq(rezervim.biznesId, biznesId),
      between(rezervim.dataEventit, nga, deri),
      inArray(rezervim.statusi, ["NE_PRITJE_TE_APROVIMIT", "NE_PRITJE_TE_KAPARIT", "KONFIRMUAR", "DOREZUAR", "PERFUNDUAR"]),
    ),
    with: meDetaje,
    orderBy: asc(rezervim.krijuarMe),
  });
}
