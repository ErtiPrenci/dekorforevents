import { and, desc, eq, gte, lt } from "drizzle-orm";
import { db } from "@/db";
import { klient, pagese, perdorues, rezervim } from "@/db/schema";
import { ZONA_KOHORE } from "./dates";

/** Start of a month in Tirana time, as a UTC instant. */
function fillimiIMuajit(viti: number, muaji: number): Date {
  const utc = new Date(Date.UTC(viti, muaji - 1, 1));
  const ora = Number(
    new Intl.DateTimeFormat("en-GB", { timeZone: ZONA_KOHORE, hour: "2-digit", hour12: false }).format(utc),
  );
  return new Date(utc.getTime() - (ora === 24 ? 0 : ora) * 3_600_000);
}

export async function pagesatEMuajit(biznesId: string, muaji: string) {
  const [y, m] = muaji.split("-").map(Number);
  const nga = fillimiIMuajit(y, m);
  const deri = fillimiIMuajit(m === 12 ? y + 1 : y, m === 12 ? 1 : m + 1);
  const rreshtat = await db
    .select({
      id: pagese.id,
      krijuarMe: pagese.krijuarMe,
      lloji: pagese.lloji,
      shuma: pagese.shuma,
      shenim: pagese.shenim,
      kodi: rezervim.kodi,
      rezervimId: rezervim.id,
      klienti: klient.emri,
      regjistruarNga: perdorues.emri,
    })
    .from(pagese)
    .innerJoin(rezervim, eq(rezervim.id, pagese.rezervimId))
    .innerJoin(klient, eq(klient.id, rezervim.klientId))
    .leftJoin(perdorues, eq(perdorues.id, pagese.regjistruarNga))
    .where(and(eq(pagese.biznesId, biznesId), gte(pagese.krijuarMe, nga), lt(pagese.krijuarMe, deri)))
    .orderBy(desc(pagese.krijuarMe));

  const shuma = (l: string) => rreshtat.filter((r) => r.lloji === l).reduce((s, r) => s + r.shuma, 0);
  const totalet = {
    kapare: shuma("KAPAR"),
    mbetje: shuma("MBETJE"),
    garanciMarre: shuma("GARANCI"),
    garanciKthyer: shuma("KTHIM_GARANCIE"),
  };
  return { rreshtat, totalet, teArdhurat: totalet.kapare + totalet.mbetje };
}

export const EMRAT_E_PAGESAVE: Record<string, string> = {
  KAPAR: "Kapar",
  MBETJE: "Pagesë",
  GARANCI: "Garanci e marrë",
  KTHIM_GARANCIE: "Garanci e kthyer",
};
