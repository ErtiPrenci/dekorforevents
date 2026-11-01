"use server";

import { and, eq, max, ne, notInArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db, type Tx } from "@/db";
import { foto, opsionProdukti, paletaNgjyrave, produkt, produktTema, vleraOpsioni } from "@/db/schema";
import type { Rezultat } from "@/components/admin/action-form";
import { kerkoPronarin } from "@/lib/auth";
import { slugify } from "@/lib/format";
import { fshiFoto as fshiSkedarin, GabimFoto, ruajFoto } from "@/lib/storage";

const MAX_FOTO = 12;

const Vlera = z.object({
  id: z.uuid().optional(),
  paletaId: z.uuid().nullish(),
  emri: z.string().trim().min(1).max(60),
  hex: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/)
    .nullish(),
  cmimiShtese: z.int().min(0).max(10_000_000),
  diteShtese: z.int().min(0).max(30),
  fotoId: z.uuid().nullish(),
});

const Opsion = z.object({
  id: z.uuid().optional(),
  lloji: z.enum(["NGJYRE", "TEKST", "NUMER", "ZGJEDHJE"]),
  emri: z.string().trim().min(1, "Çdo opsion duhet të ketë emër.").max(60),
  iDetyrueshem: z.boolean(),
  gjatesiaMax: z.int().min(1).max(60).nullish(),
  cmimiShtese: z.int().min(0).max(10_000_000),
  lejonNgjyreTjeter: z.boolean(),
  vlerat: z.array(Vlera).max(40),
});

const numer = (fd: FormData, k: string) => {
  const v = String(fd.get(k) ?? "").replace(/[^\d]/g, "");
  return v === "" ? null : Number(v);
};
const tekst = (fd: FormData, k: string, max: number) => String(fd.get(k) ?? "").trim().slice(0, max) || null;

async function slugUnik(tx: Tx, biznesId: string, emri: string, pervec?: string) {
  const baza = slugify(emri) || "produkt";
  for (let i = 1; ; i++) {
    const slug = i === 1 ? baza : `${baza}-${i}`;
    const [ekziston] = await tx
      .select({ id: produkt.id })
      .from(produkt)
      .where(and(eq(produkt.biznesId, biznesId), eq(produkt.slug, slug), pervec ? ne(produkt.id, pervec) : undefined));
    if (!ekziston) return slug;
  }
}

/** Upserts options by id so carts that reference existing values stay valid. */
async function ruajOpsionet(tx: Tx, biznesId: string, produktId: string, opsionet: z.infer<typeof Opsion>[]) {
  const paleta = new Set(
    (await tx.select({ id: paletaNgjyrave.id }).from(paletaNgjyrave).where(eq(paletaNgjyrave.biznesId, biznesId))).map((p) => p.id),
  );
  const fotot = new Set((await tx.select({ id: foto.id }).from(foto).where(eq(foto.produktId, produktId))).map((f) => f.id));
  const ekzistuese = new Set(
    (await tx.select({ id: opsionProdukti.id }).from(opsionProdukti).where(eq(opsionProdukti.produktId, produktId))).map((o) => o.id),
  );

  const mbajtur = opsionet.map((o) => o.id).filter((id): id is string => !!id && ekzistuese.has(id));
  await tx
    .delete(opsionProdukti)
    .where(and(eq(opsionProdukti.produktId, produktId), mbajtur.length ? notInArray(opsionProdukti.id, mbajtur) : undefined));

  for (const [renditja, o] of opsionet.entries()) {
    const fushat = {
      lloji: o.lloji,
      emri: o.emri,
      iDetyrueshem: o.iDetyrueshem,
      gjatesiaMax: o.lloji === "TEKST" ? (o.gjatesiaMax ?? null) : null,
      cmimiShtese: o.lloji === "TEKST" || o.lloji === "NUMER" ? o.cmimiShtese : 0,
      lejonNgjyreTjeter: o.lloji === "NGJYRE" && o.lejonNgjyreTjeter,
      renditja,
    };
    let opsionId: string;
    if (o.id && ekzistuese.has(o.id)) {
      opsionId = o.id;
      await tx.update(opsionProdukti).set(fushat).where(eq(opsionProdukti.id, o.id));
    } else {
      [{ id: opsionId }] = await tx
        .insert(opsionProdukti)
        .values({ ...fushat, biznesId, produktId })
        .returning({ id: opsionProdukti.id });
    }

    const vlerat = o.lloji === "NGJYRE" || o.lloji === "ZGJEDHJE" ? o.vlerat : [];
    const vleratEkzistuese = new Set(
      (await tx.select({ id: vleraOpsioni.id }).from(vleraOpsioni).where(eq(vleraOpsioni.opsionId, opsionId))).map((v) => v.id),
    );
    const vleratMbajtur = vlerat.map((v) => v.id).filter((id): id is string => !!id && vleratEkzistuese.has(id));
    await tx
      .delete(vleraOpsioni)
      .where(and(eq(vleraOpsioni.opsionId, opsionId), vleratMbajtur.length ? notInArray(vleraOpsioni.id, vleratMbajtur) : undefined));

    for (const [vRenditja, v] of vlerat.entries()) {
      const vFushat = {
        emri: v.emri,
        paletaId: v.paletaId && paleta.has(v.paletaId) ? v.paletaId : null,
        hex: o.lloji === "NGJYRE" ? (v.hex ?? null) : null,
        cmimiShtese: v.cmimiShtese,
        diteShtese: v.diteShtese,
        fotoId: v.fotoId && fotot.has(v.fotoId) ? v.fotoId : null,
        renditja: vRenditja,
      };
      if (v.id && vleratEkzistuese.has(v.id)) await tx.update(vleraOpsioni).set(vFushat).where(eq(vleraOpsioni.id, v.id));
      else await tx.insert(vleraOpsioni).values({ ...vFushat, biznesId, opsionId });
    }
  }
}

export async function ruajProduktin(produktId: string | null, _: Rezultat, fd: FormData): Promise<Rezultat> {
  const admin = await kerkoPronarin();
  const emri = tekst(fd, "emri", 120);
  if (!emri) return { gabim: "Shkruani emrin e produktit." };
  const modet = fd.getAll("modet").map(String).filter((m) => ["RENTAL", "CUSTOM", "SALE"].includes(m));
  if (!modet.length) return { gabim: "Zgjidhni të paktën një mënyrë: me qira, me porosi ose në shitje." };
  const cmimiQira = numer(fd, "cmimiQira");
  if (modet.includes("RENTAL") && cmimiQira == null) return { gabim: "Shkruani çmimin e qirasë." };
  const statusi = String(fd.get("statusi") ?? "AKTIV");
  if (!["AKTIV", "NE_MIREMBAJTJE", "SHITUR", "I_TERHEQUR"].includes(statusi)) return { gabim: "Status i pavlefshëm." };

  let opsionet: z.infer<typeof Opsion>[];
  try {
    opsionet = z.array(Opsion).max(10).parse(JSON.parse(String(fd.get("opsionet") ?? "[]")));
  } catch (e) {
    const mesazh = e instanceof z.ZodError ? e.issues[0]?.message : undefined;
    return { gabim: mesazh && !mesazh.startsWith("Invalid") ? mesazh : "Kontrolloni opsionet — një fushë nuk është e saktë." };
  }

  const fushat = {
    emri,
    pershkrimi: tekst(fd, "pershkrimi", 3000),
    kategoriId: tekst(fd, "kategoriId", 40),
    modet,
    gjeresiCm: numer(fd, "gjeresiCm"),
    lartesiCm: numer(fd, "lartesiCm"),
    thellesiCm: numer(fd, "thellesiCm"),
    peshaKg: numer(fd, "peshaKg"),
    materiali: tekst(fd, "materiali", 120),
    cmimiQira,
    cmimiPorosi: numer(fd, "cmimiPorosi"),
    cmimiShitje: numer(fd, "cmimiShitje"),
    garanciaDemtimit: numer(fd, "garanciaDemtimit") ?? 0,
    sasiaNeStok: Math.max(1, Math.min(500, numer(fd, "sasiaNeStok") ?? 1)),
    diteMontimi: Math.min(14, numer(fd, "diteMontimi") ?? 0),
    diteCmontimi: Math.min(14, numer(fd, "diteCmontimi") ?? 0),
    diteProdhimi: numer(fd, "diteProdhimi"),
    shenimetKerkojneAprovim: fd.get("shenimetKerkojneAprovim") === "on",
    statusi: statusi as "AKTIV",
  };
  const temat = fd.getAll("temat").map(String).filter((t) => /^[0-9a-f-]{36}$/.test(t));
  const fotoTeReja = fd.getAll("fotot").filter((f): f is File => f instanceof File && f.size > 0);

  const ruajtur: string[] = [];
  let id: string;
  try {
    for (const f of fotoTeReja.slice(0, MAX_FOTO)) ruajtur.push(await ruajFoto(admin.biznesId, "produkte", f));
    id = await db.transaction(async (tx) => {
      let pid = produktId;
      if (pid) {
        const [u] = await tx
          .update(produkt)
          .set({ ...fushat, slug: await slugUnik(tx, admin.biznesId, emri, pid) })
          .where(and(eq(produkt.id, pid), eq(produkt.biznesId, admin.biznesId)))
          .returning({ id: produkt.id });
        if (!u) throw new GabimFoto("Produkti nuk u gjet.");
      } else {
        [{ id: pid }] = await tx
          .insert(produkt)
          .values({ ...fushat, biznesId: admin.biznesId, slug: await slugUnik(tx, admin.biznesId, emri) })
          .returning({ id: produkt.id });
      }
      await tx.delete(produktTema).where(eq(produktTema.produktId, pid));
      if (temat.length) await tx.insert(produktTema).values(temat.map((temaId) => ({ biznesId: admin.biznesId, produktId: pid!, temaId })));
      if (ruajtur.length) {
        const [{ m }] = await tx.select({ m: max(foto.renditja) }).from(foto).where(eq(foto.produktId, pid));
        await tx
          .insert(foto)
          .values(ruajtur.map((rruga, i) => ({ biznesId: admin.biznesId, produktId: pid!, rruga, renditja: (m ?? -1) + 1 + i })));
      }
      await ruajOpsionet(tx, admin.biznesId, pid, opsionet);
      return pid;
    });
  } catch (e) {
    await Promise.all(ruajtur.map(fshiSkedarin));
    if (e instanceof GabimFoto) return { gabim: e.message };
    console.error("[produkt] ruajtja dështoi", e);
    return { gabim: "Produkti nuk u ruajt. Provoni përsëri." };
  }

  revalidatePath("/admin/produktet");
  revalidatePath("/", "layout");
  if (!produktId) redirect(`/admin/produktet/${id}?ruajtur=1`);
  return { ok: "Ndryshimet u ruajtën." };
}

async function fotoEBiznesit(biznesId: string, fotoId: string) {
  const [f] = await db.select().from(foto).where(and(eq(foto.id, fotoId), eq(foto.biznesId, biznesId)));
  return f;
}

export async function ngarkoFotot(produktId: string, _: Rezultat, fd: FormData): Promise<Rezultat> {
  const admin = await kerkoPronarin();
  const [p] = await db.select({ id: produkt.id }).from(produkt).where(and(eq(produkt.id, produktId), eq(produkt.biznesId, admin.biznesId)));
  if (!p) return { gabim: "Produkti nuk u gjet." };
  const skedaret = fd.getAll("fotot").filter((f): f is File => f instanceof File && f.size > 0);
  if (!skedaret.length) return { gabim: "Zgjidhni të paktën një foto." };
  const ekzistuese = await db.select({ id: foto.id, renditja: foto.renditja }).from(foto).where(eq(foto.produktId, produktId));
  if (ekzistuese.length + skedaret.length > MAX_FOTO) return { gabim: `Maksimumi është ${MAX_FOTO} foto për produkt.` };
  const ruajtur: string[] = [];
  try {
    for (const f of skedaret) ruajtur.push(await ruajFoto(admin.biznesId, "produkte", f));
  } catch (e) {
    await Promise.all(ruajtur.map(fshiSkedarin));
    if (!(e instanceof GabimFoto)) console.error("[foto] ngarkimi dështoi", e);
    return { gabim: e instanceof GabimFoto ? e.message : "Fotot nuk u ruajtën." };
  }
  const fillimi = Math.max(-1, ...ekzistuese.map((f) => f.renditja)) + 1;
  await db.insert(foto).values(ruajtur.map((rruga, i) => ({ biznesId: admin.biznesId, produktId, rruga, renditja: fillimi + i })));
  revalidatePath(`/admin/produktet/${produktId}`);
  revalidatePath("/", "layout");
  return { ok: `${ruajtur.length} foto u shtuan.` };
}

export async function fshiFoton(fotoId: string): Promise<Rezultat> {
  const admin = await kerkoPronarin();
  const f = await fotoEBiznesit(admin.biznesId, fotoId);
  if (!f) return { gabim: "Fotoja nuk u gjet." };
  await db.delete(foto).where(eq(foto.id, f.id));
  await fshiSkedarin(f.rruga);
  revalidatePath(`/admin/produktet/${f.produktId}`);
  revalidatePath("/", "layout");
  return { ok: "Fotoja u fshi." };
}

export async function beKryesore(fotoId: string): Promise<Rezultat> {
  const admin = await kerkoPronarin();
  const f = await fotoEBiznesit(admin.biznesId, fotoId);
  if (!f) return { gabim: "Fotoja nuk u gjet." };
  const te_gjitha = await db.select({ id: foto.id }).from(foto).where(eq(foto.produktId, f.produktId)).orderBy(foto.renditja);
  const renditja = [f.id, ...te_gjitha.map((x) => x.id).filter((id) => id !== f.id)];
  await db.transaction(async (tx) => {
    for (const [i, id] of renditja.entries()) await tx.update(foto).set({ renditja: i }).where(eq(foto.id, id));
  });
  revalidatePath(`/admin/produktet/${f.produktId}`);
  revalidatePath("/", "layout");
  return { ok: "U bë foto kryesore." };
}
