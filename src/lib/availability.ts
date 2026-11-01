import { and, eq, gte, inArray, lte, sql } from "drizzle-orm";
import { db, type Tx } from "@/db";
import { bllokimDate, rezervim, rezervimRresht } from "@/db/schema";
import { ditet, shtoDite, sot } from "./dates";

// docs/PLAN.md §6. A product is blocked over a window around the event:
// setup/transport days before (plus repaint days for chosen colours) and
// teardown days after.

export type Dritare = { nga: string; deri: string };
export type RreshtIZene = { produktId: string; sasia: number; dritarjaNga: string; dritarjaDeri: string };
export type Bllokim = { produktId: string | null; nga: string; deri: string };
export type ProduktPerDisponueshmeri = {
  id: string;
  sasiaNeStok: number;
  diteMontimi: number;
  diteCmontimi: number;
  statusi: string;
};

export function llogaritDritaren(
  dataEventit: string,
  p: Pick<ProduktPerDisponueshmeri, "diteMontimi" | "diteCmontimi">,
  diteShtese = 0,
): Dritare {
  return {
    nga: shtoDite(dataEventit, -(p.diteMontimi + diteShtese)),
    deri: shtoDite(dataEventit, p.diteCmontimi),
  };
}

export function mbivendosen(a: Dritare, b: Dritare): boolean {
  return a.nga <= b.deri && b.nga <= a.deri;
}

/**
 * Highest number of units in use on any single day of the window.
 * Copies of a product are interchangeable, so a new booking fits exactly when
 * peak + requested <= stock (interval graphs: colouring = max clique).
 */
export function kulmiIPerdorimit(rreshtat: RreshtIZene[], dritarja: Dritare): number {
  const teRendesishme = rreshtat.filter((r) => mbivendosen({ nga: r.dritarjaNga, deri: r.dritarjaDeri }, dritarja));
  if (!teRendesishme.length) return 0;
  let kulmi = 0;
  for (const dita of ditet(dritarja.nga, dritarja.deri)) {
    let sasia = 0;
    for (const r of teRendesishme) if (r.dritarjaNga <= dita && dita <= r.dritarjaDeri) sasia += r.sasia;
    kulmi = Math.max(kulmi, sasia);
  }
  return kulmi;
}

export type Gjendja = "I_LIRE" | "I_ZENE" | "I_BLLOKUAR" | "I_KALUAR" | "JO_AKTIV";

export function gjendjaPerDate(
  produkt: ProduktPerDisponueshmeri,
  dataEventit: string,
  sasia: number,
  rreshtat: RreshtIZene[],
  bllokimet: Bllokim[],
  diteShtese = 0,
  dita = sot(),
): Gjendja {
  if (produkt.statusi !== "AKTIV") return "JO_AKTIV";
  const dritarja = llogaritDritaren(dataEventit, produkt, diteShtese);
  if (dritarja.nga <= dita) return "I_KALUAR";
  const bllokuar = bllokimet.some(
    (b) => (b.produktId === null || b.produktId === produkt.id) && mbivendosen({ nga: b.nga, deri: b.deri }, dritarja),
  );
  if (bllokuar) return "I_BLLOKUAR";
  const tePerProduktin = rreshtat.filter((r) => r.produktId === produkt.id);
  return kulmiIPerdorimit(tePerProduktin, dritarja) + sasia <= produkt.sasiaNeStok ? "I_LIRE" : "I_ZENE";
}

/** Reservation statuses that hold a product. Unpaid holds only count until they expire. */
export const kushtiIZene = sql`(${rezervim.statusi} in ('NE_PRITJE_TE_APROVIMIT', 'KONFIRMUAR', 'DOREZUAR')
  or (${rezervim.statusi} = 'NE_PRITJE_TE_KAPARIT' and ${rezervim.mbahetDeri} > now()))`;

export async function rreshtatEZene(
  biznesId: string,
  produktIds: string[],
  dritarja: Dritare,
  conn: Tx | typeof db = db,
  pervecRezervimit?: string,
): Promise<RreshtIZene[]> {
  if (!produktIds.length) return [];
  return conn
    .select({
      produktId: rezervimRresht.produktId,
      sasia: rezervimRresht.sasia,
      dritarjaNga: rezervimRresht.dritarjaNga,
      dritarjaDeri: rezervimRresht.dritarjaDeri,
    })
    .from(rezervimRresht)
    .innerJoin(rezervim, eq(rezervim.id, rezervimRresht.rezervimId))
    .where(
      and(
        eq(rezervimRresht.biznesId, biznesId),
        inArray(rezervimRresht.produktId, produktIds),
        lte(rezervimRresht.dritarjaNga, dritarja.deri),
        gte(rezervimRresht.dritarjaDeri, dritarja.nga),
        kushtiIZene,
        pervecRezervimit ? sql`${rezervim.id} <> ${pervecRezervimit}` : undefined,
      ),
    );
}

export async function bllokimetNeDritare(
  biznesId: string,
  dritarja: Dritare,
  conn: Tx | typeof db = db,
): Promise<Bllokim[]> {
  return conn
    .select({ produktId: bllokimDate.produktId, nga: bllokimDate.nga, deri: bllokimDate.deri })
    .from(bllokimDate)
    .where(
      and(
        eq(bllokimDate.biznesId, biznesId),
        lte(bllokimDate.nga, dritarja.deri),
        gte(bllokimDate.deri, dritarja.nga),
      ),
    );
}

/** Day-by-day state of one product for a month, as shown on the product page. */
export async function kalendariIProduktit(
  biznesId: string,
  produkt: ProduktPerDisponueshmeri,
  ditetEMuajit: string[],
): Promise<Record<string, Gjendja>> {
  if (!ditetEMuajit.length) return {};
  const dritarja = {
    nga: shtoDite(ditetEMuajit[0], -produkt.diteMontimi - 7),
    deri: shtoDite(ditetEMuajit[ditetEMuajit.length - 1], produkt.diteCmontimi + 7),
  };
  const [rreshtat, bllokimet] = await Promise.all([
    rreshtatEZene(biznesId, [produkt.id], dritarja),
    bllokimetNeDritare(biznesId, dritarja),
  ]);
  const dita = sot();
  return Object.fromEntries(
    ditetEMuajit.map((d) => [d, gjendjaPerDate(produkt, d, 1, rreshtat, bllokimet, 0, dita)]),
  );
}

/** Which of the given products are free for an event on this date. */
export async function produktetELira(
  biznesId: string,
  produktet: ProduktPerDisponueshmeri[],
  dataEventit: string,
): Promise<Set<string>> {
  if (!produktet.length) return new Set();
  const maxPara = Math.max(...produktet.map((p) => p.diteMontimi));
  const maxPas = Math.max(...produktet.map((p) => p.diteCmontimi));
  const dritarja = { nga: shtoDite(dataEventit, -maxPara), deri: shtoDite(dataEventit, maxPas) };
  const [rreshtat, bllokimet] = await Promise.all([
    rreshtatEZene(
      biznesId,
      produktet.map((p) => p.id),
      dritarja,
    ),
    bllokimetNeDritare(biznesId, dritarja),
  ]);
  const dita = sot();
  return new Set(
    produktet.filter((p) => gjendjaPerDate(p, dataEventit, 1, rreshtat, bllokimet, 0, dita) === "I_LIRE").map((p) => p.id),
  );
}

/** Availability of each cart line for one date, counting the cart's own lines against each other. */
export async function kontrolloShporten(
  biznesId: string,
  produktet: ProduktPerDisponueshmeri[],
  dataEventit: string,
  artikujt: { produktId: string; sasia: number; diteShtese: number }[],
): Promise<Gjendja[]> {
  const sipasId = new Map(produktet.map((p) => [p.id, p]));
  const dritaret = artikujt.map((a) => {
    const p = sipasId.get(a.produktId);
    return p ? llogaritDritaren(dataEventit, p, a.diteShtese) : null;
  });
  const teVlefshme = dritaret.filter((d): d is Dritare => d != null);
  if (!teVlefshme.length) return artikujt.map(() => "JO_AKTIV");
  const dritarja = {
    nga: teVlefshme.reduce((m, d) => (d.nga < m ? d.nga : m), teVlefshme[0].nga),
    deri: teVlefshme.reduce((m, d) => (d.deri > m ? d.deri : m), teVlefshme[0].deri),
  };
  const [rreshtat, bllokimet] = await Promise.all([
    rreshtatEZene(biznesId, [...sipasId.keys()], dritarja),
    bllokimetNeDritare(biznesId, dritarja),
  ]);
  const dita = sot();
  return artikujt.map((a, i) => {
    const p = sipasId.get(a.produktId);
    if (!p) return "JO_AKTIV";
    const g = gjendjaPerDate(p, dataEventit, a.sasia, rreshtat, bllokimet, a.diteShtese, dita);
    if (g === "I_LIRE") {
      const d = dritaret[i]!;
      rreshtat.push({ produktId: p.id, sasia: a.sasia, dritarjaNga: d.nga, dritarjaDeri: d.deri });
    }
    return g;
  });
}
