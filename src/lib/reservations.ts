import { randomBytes } from "node:crypto";
import { and, eq, inArray, sql } from "drizzle-orm";
import { db, type Tx } from "@/db";
import {
  biznes as biznesTable,
  fotoFrymezimi,
  historikRezervimi,
  klient,
  pagese,
  produkt,
  rezervim,
  rezervimRresht,
  type ZgjedhjeRuajtur,
} from "@/db/schema";
import {
  bllokimetNeDritare,
  gjendjaPerDate,
  llogaritDritaren,
  rreshtatEZene,
  type Dritare,
  type RreshtIZene,
} from "./availability";
import { eshteDateValide, formatoDaten, sot } from "./dates";
import { GJATESIA_MAX_SHENIM, llogaritOpsionet, type OpsionPerKlient, type ZgjedhjeHyrese } from "./options";
import { normalizoTelefonin } from "./phone";
import { llogaritKaparin } from "./pricing";
import type { Biznes } from "./tenant";

export class GabimRezervimi extends Error {}

export { EMRAT_E_STATUSEVE, type Statusi } from "./status";
import { EMRAT_E_STATUSEVE, type Statusi } from "./status";

export type ArtikullHyres = {
  produktId: string;
  sasia: number;
  zgjedhjet: ZgjedhjeHyrese[];
  shenimi?: string;
  fotot: string[];
};

export type RezervimHyres = {
  dataEventit: string;
  llojiEventit?: string;
  emri: string;
  telefoni: string;
  menyraDorezimit: "MARRJE" | "DERGESE";
  adresaDorezimit?: string;
  shenimeKlienti?: string;
  artikujt: ArtikullHyres[];
};

type ProduktMeOpsione = Awaited<ReturnType<typeof ngarkoProduktet>>[number];

async function ngarkoProduktet(biznesId: string, ids: string[]) {
  return db.query.produkt.findMany({
    where: and(eq(produkt.biznesId, biznesId), inArray(produkt.id, ids)),
    with: {
      opsionet: {
        orderBy: (o, { asc }) => [asc(o.renditja)],
        with: { vlerat: { orderBy: (v, { asc }) => [asc(v.renditja)] } },
      },
    },
  });
}

export function opsionetPerKlient(p: Pick<ProduktMeOpsione, "opsionet">): OpsionPerKlient[] {
  return p.opsionet.map((o) => ({
    id: o.id,
    lloji: o.lloji,
    emri: o.emri,
    iDetyrueshem: o.iDetyrueshem,
    gjatesiaMax: o.gjatesiaMax,
    cmimiShtese: o.cmimiShtese,
    lejonNgjyreTjeter: o.lejonNgjyreTjeter,
    vlerat: o.vlerat.map((v) => ({
      id: v.id,
      emri: v.emri,
      hex: v.hex,
      cmimiShtese: v.cmimiShtese,
      diteShtese: v.diteShtese,
      fotoId: v.fotoId,
    })),
  }));
}

/** Serialises availability checks per product for the rest of the transaction. */
async function kycProduktet(tx: Tx, produktIds: string[]) {
  for (const id of [...new Set(produktIds)].sort()) {
    await tx.execute(sql`select pg_advisory_xact_lock(hashtextextended(${id}, 0))`);
  }
}

async function shtoHistorik(
  tx: Tx,
  r: { biznesId: string; rezervimId: string; nga: Statusi | null; ne: Statusi; perdoruesId?: string; shenim?: string },
) {
  await tx.insert(historikRezervimi).values({
    biznesId: r.biznesId,
    rezervimId: r.rezervimId,
    ngaStatusi: r.nga,
    neStatusi: r.ne,
    perdoruesId: r.perdoruesId,
    shenim: r.shenim,
  });
}

/** Marks unpaid holds past their deadline as SKADUAR. Safe to call anywhere. */
export async function skadoMbajtjet(conn: Tx | typeof db = db, biznesId?: string) {
  const skaduar = await conn
    .update(rezervim)
    .set({ statusi: "SKADUAR" })
    .where(
      and(
        eq(rezervim.statusi, "NE_PRITJE_TE_KAPARIT"),
        sql`${rezervim.mbahetDeri} <= now()`,
        biznesId ? eq(rezervim.biznesId, biznesId) : undefined,
      ),
    )
    .returning({ id: rezervim.id, biznesId: rezervim.biznesId, kodi: rezervim.kodi });
  if (skaduar.length) {
    await conn.insert(historikRezervimi).values(
      skaduar.map((r) => ({
        biznesId: r.biznesId,
        rezervimId: r.id,
        ngaStatusi: "NE_PRITJE_TE_KAPARIT" as const,
        neStatusi: "SKADUAR" as const,
        shenim: "Kapari nuk u pagua në afat",
      })),
    );
  }
  return skaduar;
}

/**
 * Checks that every line still fits, ignoring the reservation itself.
 * Lines inside one cart are counted against each other too.
 */
async function kontrolloDisponueshmerine(
  tx: Tx,
  biznesId: string,
  rreshtat: { produktId: string; emri: string; sasia: number; diteShtese: number; dritarja: Dritare }[],
  produktet: Map<string, { id: string; sasiaNeStok: number; diteMontimi: number; diteCmontimi: number; statusi: string }>,
  dataEventit: string,
  pervecRezervimit?: string,
) {
  const nga = rreshtat.reduce((m, r) => (r.dritarja.nga < m ? r.dritarja.nga : m), rreshtat[0].dritarja.nga);
  const deri = rreshtat.reduce((m, r) => (r.dritarja.deri > m ? r.dritarja.deri : m), rreshtat[0].dritarja.deri);
  const ids = [...new Set(rreshtat.map((r) => r.produktId))];
  const [teZena, bllokimet] = await Promise.all([
    rreshtatEZene(biznesId, ids, { nga, deri }, tx, pervecRezervimit),
    bllokimetNeDritare(biznesId, { nga, deri }, tx),
  ]);
  const tePranuara: RreshtIZene[] = [...teZena];
  const dita = sot();
  for (const r of rreshtat) {
    const p = produktet.get(r.produktId)!;
    const gjendja = gjendjaPerDate(p, dataEventit, r.sasia, tePranuara, bllokimet, r.diteShtese, dita);
    if (gjendja === "I_KALUAR") {
      throw new GabimRezervimi(`"${r.emri}" nuk mund të rezervohet më kaq afër datës — na kontaktoni.`);
    }
    if (gjendja !== "I_LIRE") {
      throw new GabimRezervimi(`"${r.emri}" nuk është i lirë për ${formatoDaten(dataEventit, false)}.`);
    }
    tePranuara.push({ produktId: r.produktId, sasia: r.sasia, dritarjaNga: r.dritarja.nga, dritarjaDeri: r.dritarja.deri });
  }
}

function tokenIRi() {
  return randomBytes(18).toString("base64url");
}

export async function krijoRezervim(biznes: Biznes, hyrja: RezervimHyres) {
  const dataEventit = hyrja.dataEventit;
  if (!eshteDateValide(dataEventit) || dataEventit <= sot()) throw new GabimRezervimi("Zgjidhni një datë eventi në të ardhmen.");
  const emri = hyrja.emri.trim();
  if (emri.length < 2 || emri.length > 80) throw new GabimRezervimi("Shkruani emrin dhe mbiemrin.");
  const telefoni = normalizoTelefonin(hyrja.telefoni);
  if (!telefoni) throw new GabimRezervimi("Numri i telefonit nuk është i saktë (p.sh. 069 123 4567).");
  if (hyrja.menyraDorezimit === "DERGESE" && !hyrja.adresaDorezimit?.trim()) {
    throw new GabimRezervimi("Shkruani adresën ku do të dorëzohet dekori.");
  }
  if (!hyrja.artikujt.length) throw new GabimRezervimi("Shporta është bosh.");
  if (hyrja.artikujt.length > 30) throw new GabimRezervimi("Shumë artikuj në një rezervim.");

  const produktet = await ngarkoProduktet(
    biznes.id,
    hyrja.artikujt.map((a) => a.produktId),
  );
  const sipasId = new Map(produktet.map((p) => [p.id, p]));

  const rreshtat = hyrja.artikujt.map((a) => {
    const p = sipasId.get(a.produktId);
    if (!p || p.statusi !== "AKTIV" || !p.modet.includes("RENTAL") || p.cmimiQira == null) {
      throw new GabimRezervimi("Një nga produktet nuk është më në dispozicion.");
    }
    const sasia = Math.trunc(a.sasia);
    if (!(sasia >= 1 && sasia <= p.sasiaNeStok)) throw new GabimRezervimi(`Sasi e pavlefshme për "${p.emri}".`);
    const shenimi = a.shenimi?.trim().slice(0, GJATESIA_MAX_SHENIM) || null;
    const r = llogaritOpsionet(
      p.cmimiQira,
      opsionetPerKlient(p),
      a.zgjedhjet,
      p.shenimetKerkojneAprovim,
      !!shenimi || a.fotot.length > 0,
    );
    if (r.gabimet.length) throw new GabimRezervimi(`${p.emri}: ${r.gabimet[0]}`);
    return {
      produktId: p.id,
      emri: p.emri,
      sasia,
      cmimiNjesi: r.cmimiNjesi,
      zgjedhjet: r.zgjedhjet,
      diteShtese: r.diteShtese,
      kerkonAprovim: r.kerkonAprovim,
      shenimi,
      fotot: a.fotot,
      garancia: p.garanciaDemtimit * sasia,
      dritarja: llogaritDritaren(dataEventit, p, r.diteShtese),
    };
  });

  const nentotali = rreshtat.reduce((s, r) => s + r.cmimiNjesi * r.sasia, 0);
  // Without a kapar the owner confirms every reservation himself.
  const kerkonAprovim = !biznes.kerkonKapar || rreshtat.some((r) => r.kerkonAprovim);
  const kapari = biznes.kerkonKapar
    ? llogaritKaparin(nentotali, biznes.kapariPerqindje, biznes.kapariMinimum, biznes.monedha)
    : 0;

  const rezultati = await db.transaction(async (tx) => {
    await kycProduktet(
      tx,
      rreshtat.map((r) => r.produktId),
    );
    await skadoMbajtjet(tx, biznes.id);
    await kontrolloDisponueshmerine(tx, biznes.id, rreshtat, sipasId, dataEventit);

    const [k] = await tx
      .insert(klient)
      .values({ biznesId: biznes.id, emri, telefoni })
      .onConflictDoUpdate({ target: [klient.biznesId, klient.telefoni], set: { emri } })
      .returning({ id: klient.id });

    const [{ numeruesi }] = await tx
      .update(biznesTable)
      .set({ numeruesiRezervimeve: sql`${biznesTable.numeruesiRezervimeve} + 1` })
      .where(eq(biznesTable.id, biznes.id))
      .returning({ numeruesi: biznesTable.numeruesiRezervimeve });
    const kodi = `${biznes.kodiPrefix}-${new Date().getFullYear()}-${String(numeruesi).padStart(4, "0")}`;

    const statusi: Statusi = kerkonAprovim ? "NE_PRITJE_TE_APROVIMIT" : "NE_PRITJE_TE_KAPARIT";
    const [r] = await tx
      .insert(rezervim)
      .values({
        biznesId: biznes.id,
        kodi,
        tokenPublik: tokenIRi(),
        klientId: k.id,
        dataEventit,
        llojiEventit: hyrja.llojiEventit?.trim().slice(0, 80) || null,
        menyraDorezimit: hyrja.menyraDorezimit,
        adresaDorezimit: hyrja.menyraDorezimit === "DERGESE" ? hyrja.adresaDorezimit!.trim().slice(0, 300) : null,
        statusi,
        mbahetDeri: kerkonAprovim ? null : new Date(Date.now() + biznes.oretMbajtjes * 3_600_000),
        nentotali,
        kapari,
        garancia: rreshtat.reduce((s, x) => s + x.garancia, 0),
        shenimeKlienti: hyrja.shenimeKlienti?.trim().slice(0, 1000) || null,
      })
      .returning({ id: rezervim.id, kodi: rezervim.kodi, tokenPublik: rezervim.tokenPublik });

    for (const x of rreshtat) {
      const [rr] = await tx
        .insert(rezervimRresht)
        .values({
          biznesId: biznes.id,
          rezervimId: r.id,
          produktId: x.produktId,
          emriProduktit: x.emri,
          sasia: x.sasia,
          cmimiNjesi: x.cmimiNjesi,
          zgjedhjet: x.zgjedhjet,
          shenimi: x.shenimi,
          kerkonAprovim: x.kerkonAprovim,
          dritarjaNga: x.dritarja.nga,
          dritarjaDeri: x.dritarja.deri,
        })
        .returning({ id: rezervimRresht.id });
      if (x.fotot.length) {
        await tx.insert(fotoFrymezimi).values(x.fotot.map((rruga) => ({ biznesId: biznes.id, rreshtId: rr.id, rruga })));
      }
    }
    await shtoHistorik(tx, { biznesId: biznes.id, rezervimId: r.id, nga: null, ne: statusi });
    return r;
  });

  return rezultati;
}

// ---------------------------------------------------------------- admin

type Admin = { biznesId: string; perdoruesId: string };

async function merrPerNdryshim(tx: Tx, admin: Admin, id: string) {
  const [r] = await tx
    .select()
    .from(rezervim)
    .where(and(eq(rezervim.id, id), eq(rezervim.biznesId, admin.biznesId)))
    .for("update");
  if (!r) throw new GabimRezervimi("Rezervimi nuk u gjet.");
  return r;
}

function kerkoStatusin(r: { statusi: Statusi }, lejuar: Statusi[]) {
  if (!lejuar.includes(r.statusi)) {
    throw new GabimRezervimi(`Ky veprim nuk lejohet kur rezervimi është "${EMRAT_E_STATUSEVE[r.statusi]}".`);
  }
}

/** Re-checks a reservation's own lines against everyone else (late payment, extension). */
async function rikontrollo(tx: Tx, admin: Admin, r: typeof rezervim.$inferSelect) {
  const rreshtat = await tx.select().from(rezervimRresht).where(eq(rezervimRresht.rezervimId, r.id));
  const ids = rreshtat.map((x) => x.produktId);
  await kycProduktet(tx, ids);
  const produktet = await tx.select().from(produkt).where(inArray(produkt.id, ids));
  await kontrolloDisponueshmerine(
    tx,
    admin.biznesId,
    rreshtat.map((x) => ({
      produktId: x.produktId,
      emri: x.emriProduktit,
      sasia: x.sasia,
      diteShtese: Math.max(0, ...x.zgjedhjet.map((z) => z.diteShtese)),
      dritarja: { nga: x.dritarjaNga, deri: x.dritarjaDeri },
    })),
    new Map(produktet.map((p) => [p.id, p])),
    r.dataEventit,
    r.id,
  );
}

async function vendosStatusin(
  tx: Tx,
  admin: Admin,
  r: typeof rezervim.$inferSelect,
  ne: Statusi,
  ndryshime: Partial<typeof rezervim.$inferInsert> = {},
  shenim?: string,
) {
  await tx
    .update(rezervim)
    .set({ ...ndryshime, statusi: ne })
    .where(eq(rezervim.id, r.id));
  await shtoHistorik(tx, {
    biznesId: admin.biznesId,
    rezervimId: r.id,
    nga: r.statusi,
    ne,
    perdoruesId: admin.perdoruesId,
    shenim,
  });
}

export async function aprovoRezervimin(
  admin: Admin,
  id: string,
  cmimet: Record<string, number>,
  tarifaTransportit: number,
) {
  return db.transaction(async (tx) => {
    const r = await merrPerNdryshim(tx, admin, id);
    kerkoStatusin(r, ["NE_PRITJE_TE_APROVIMIT"]);
    const b = await tx.query.biznes.findFirst({ where: eq(biznesTable.id, admin.biznesId) });
    const rreshtat = await tx.select().from(rezervimRresht).where(eq(rezervimRresht.rezervimId, r.id));
    let nentotali = 0;
    for (const x of rreshtat) {
      const cmimi = cmimet[x.id];
      const iRi = Number.isFinite(cmimi) && cmimi >= 0 ? Math.round(cmimi) : x.cmimiNjesi;
      if (iRi !== x.cmimiNjesi) await tx.update(rezervimRresht).set({ cmimiNjesi: iRi }).where(eq(rezervimRresht.id, x.id));
      nentotali += iRi * x.sasia;
    }
    const transporti = Math.max(0, Math.round(tarifaTransportit || 0));
    if (!b!.kerkonKapar) {
      await vendosStatusin(tx, admin, r, "KONFIRMUAR", { nentotali, tarifaTransportit: transporti, kapari: 0, mbahetDeri: null }, "U konfirmua");
      return;
    }
    await vendosStatusin(
      tx,
      admin,
      r,
      "NE_PRITJE_TE_KAPARIT",
      {
        nentotali,
        tarifaTransportit: transporti,
        kapari: llogaritKaparin(nentotali, b!.kapariPerqindje, b!.kapariMinimum, b!.monedha),
        mbahetDeri: new Date(Date.now() + b!.oretMbajtjes * 3_600_000),
        kujtuarSkadimi: false,
      },
      "Kërkesat u aprovuan",
    );
  });
}

export async function refuzoRezervimin(admin: Admin, id: string, arsyeja: string) {
  return db.transaction(async (tx) => {
    const r = await merrPerNdryshim(tx, admin, id);
    kerkoStatusin(r, ["NE_PRITJE_TE_APROVIMIT", "NE_PRITJE_TE_KAPARIT"]);
    await vendosStatusin(tx, admin, r, "REFUZUAR", { arsyejaRefuzimit: arsyeja.trim() || null, mbahetDeri: null }, arsyeja);
  });
}

export async function regjistroKaparin(admin: Admin, id: string, shuma: number) {
  return db.transaction(async (tx) => {
    const r = await merrPerNdryshim(tx, admin, id);
    kerkoStatusin(r, ["NE_PRITJE_TE_KAPARIT", "SKADUAR"]);
    // A lapsed hold no longer protects the date — someone else may have taken it.
    const kaSkaduar = r.statusi === "SKADUAR" || (r.mbahetDeri && r.mbahetDeri <= new Date());
    if (kaSkaduar) await rikontrollo(tx, admin, r);
    const s = Math.round(shuma);
    if (!(s > 0)) throw new GabimRezervimi("Shkruani shumën e paguar.");
    await tx.insert(pagese).values({
      biznesId: admin.biznesId,
      rezervimId: r.id,
      shuma: s,
      lloji: "KAPAR",
      regjistruarNga: admin.perdoruesId,
    });
    await vendosStatusin(tx, admin, r, "KONFIRMUAR", { mbahetDeri: null }, `Kapari u pagua në kesh`);
  });
}

export async function zgjatAfatin(admin: Admin, id: string, ore: number) {
  return db.transaction(async (tx) => {
    const r = await merrPerNdryshim(tx, admin, id);
    kerkoStatusin(r, ["NE_PRITJE_TE_KAPARIT", "SKADUAR"]);
    if (r.statusi === "SKADUAR" || (r.mbahetDeri && r.mbahetDeri <= new Date())) await rikontrollo(tx, admin, r);
    const baza = Math.max(Date.now(), r.mbahetDeri?.getTime() ?? 0);
    await vendosStatusin(
      tx,
      admin,
      r,
      "NE_PRITJE_TE_KAPARIT",
      { mbahetDeri: new Date(baza + ore * 3_600_000), kujtuarSkadimi: false },
      `Afati u zgjat me ${ore} orë`,
    );
  });
}

export async function shenoDorezimin(admin: Admin, id: string, garancia: number) {
  return db.transaction(async (tx) => {
    const r = await merrPerNdryshim(tx, admin, id);
    kerkoStatusin(r, ["KONFIRMUAR"]);
    if (garancia > 0) {
      await tx.insert(pagese).values({
        biznesId: admin.biznesId,
        rezervimId: r.id,
        shuma: Math.round(garancia),
        lloji: "GARANCI",
        regjistruarNga: admin.perdoruesId,
      });
    }
    await vendosStatusin(tx, admin, r, "DOREZUAR");
  });
}

export async function shenoKthimin(admin: Admin, id: string) {
  return db.transaction(async (tx) => {
    const r = await merrPerNdryshim(tx, admin, id);
    kerkoStatusin(r, ["DOREZUAR"]);
    await vendosStatusin(tx, admin, r, "PERFUNDUAR", {}, "Dekori u kthye");
  });
}

export async function anuloRezervimin(admin: Admin, id: string, shenim: string) {
  return db.transaction(async (tx) => {
    const r = await merrPerNdryshim(tx, admin, id);
    kerkoStatusin(r, ["NE_PRITJE_TE_APROVIMIT", "NE_PRITJE_TE_KAPARIT", "KONFIRMUAR"]);
    await vendosStatusin(tx, admin, r, "ANULUAR", { mbahetDeri: null }, shenim.trim() || undefined);
  });
}

export async function shenoMosparaqitjen(admin: Admin, id: string) {
  return db.transaction(async (tx) => {
    const r = await merrPerNdryshim(tx, admin, id);
    kerkoStatusin(r, ["KONFIRMUAR"]);
    await tx
      .update(klient)
      .set({ numriMosparaqitjeve: sql`${klient.numriMosparaqitjeve} + 1` })
      .where(eq(klient.id, r.klientId));
    await vendosStatusin(tx, admin, r, "MOSPARAQITJE", {}, "Klienti nuk erdhi");
  });
}

export async function regjistroPagesen(
  admin: Admin,
  id: string,
  lloji: "MBETJE" | "GARANCI" | "KTHIM_GARANCIE",
  shuma: number,
  shenim?: string,
) {
  return db.transaction(async (tx) => {
    const r = await merrPerNdryshim(tx, admin, id);
    kerkoStatusin(r, ["KONFIRMUAR", "DOREZUAR", "PERFUNDUAR", "MOSPARAQITJE"]);
    const s = Math.round(shuma);
    if (!(s > 0)) throw new GabimRezervimi("Shkruani një shumë më të madhe se zero.");
    await tx.insert(pagese).values({
      biznesId: admin.biznesId,
      rezervimId: r.id,
      shuma: s,
      lloji,
      shenim: shenim?.trim() || null,
      regjistruarNga: admin.perdoruesId,
    });
  });
}

export async function ruajDetajetBrendshme(
  admin: Admin,
  id: string,
  d: { shenimeBrendshme: string; tarifaTransportit: number },
) {
  await db
    .update(rezervim)
    .set({
      shenimeBrendshme: d.shenimeBrendshme.trim() || null,
      tarifaTransportit: Math.max(0, Math.round(d.tarifaTransportit || 0)),
    })
    .where(and(eq(rezervim.id, id), eq(rezervim.biznesId, admin.biznesId)));
}

// ---------------------------------------------------------------- reads

export async function merrRezervimin(biznesId: string, id: string) {
  return db.query.rezervim.findFirst({
    where: and(eq(rezervim.id, id), eq(rezervim.biznesId, biznesId)),
    with: {
      klient: true,
      rreshtat: { with: { fotot: true, produkt: { with: { fotot: { orderBy: (f, { asc }) => [asc(f.renditja)], limit: 1 } } } } },
      pagesat: { orderBy: (p, { asc }) => [asc(p.krijuarMe)] },
      historiku: { orderBy: (h, { asc }) => [asc(h.krijuarMe)] },
    },
  });
}

export async function merrRezerviminMeToken(token: string) {
  return db.query.rezervim.findFirst({
    where: eq(rezervim.tokenPublik, token),
    with: { rreshtat: { with: { fotot: true } } },
  });
}

/** Amounts paid, outstanding balance and deposit held, from the payment rows. */
export function bilanci(
  r: { nentotali: number; tarifaTransportit: number },
  pagesat: { lloji: string; shuma: number }[],
) {
  const totali = r.nentotali + r.tarifaTransportit;
  const paguar = pagesat.filter((p) => p.lloji === "KAPAR" || p.lloji === "MBETJE").reduce((s, p) => s + p.shuma, 0);
  const garanciaMbajtur =
    pagesat.filter((p) => p.lloji === "GARANCI").reduce((s, p) => s + p.shuma, 0) -
    pagesat.filter((p) => p.lloji === "KTHIM_GARANCIE").reduce((s, p) => s + p.shuma, 0);
  return { totali, paguar, mbetja: Math.max(0, totali - paguar), garanciaMbajtur };
}

/** Warnings shown to the owner — never used to block a customer (docs/PLAN.md §7). */
export async function flamujtEKlientit(biznesId: string, klientId: string, pervecRezervimit: string) {
  const [f] = await db
    .select({
      paPaguar: sql<number>`count(*) filter (where ${rezervim.statusi} in ('NE_PRITJE_TE_APROVIMIT','NE_PRITJE_TE_KAPARIT'))::int`,
      skaduar: sql<number>`count(*) filter (where ${rezervim.statusi} = 'SKADUAR')::int`,
      mosparaqitje: sql<number>`count(*) filter (where ${rezervim.statusi} = 'MOSPARAQITJE')::int`,
    })
    .from(rezervim)
    .where(and(eq(rezervim.biznesId, biznesId), eq(rezervim.klientId, klientId), sql`${rezervim.id} <> ${pervecRezervimit}`));
  return f;
}

export function diteShteseMax(zgjedhjet: ZgjedhjeRuajtur[]) {
  return Math.max(0, ...zgjedhjet.map((z) => z.diteShtese));
}
