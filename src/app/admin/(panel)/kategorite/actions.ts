"use server";

import { and, asc, eq, max, ne } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { kategori } from "@/db/schema";
import type { Rezultat } from "@/components/admin/action-form";
import { kerkoPronarin } from "@/lib/auth";
import { slugify } from "@/lib/format";

function rifresko() {
  revalidatePath("/admin/kategorite");
  revalidatePath("/admin/produktet", "layout");
  revalidatePath("/", "layout");
}

async function slugUnik(biznesId: string, emri: string, pervec?: string) {
  const baza = slugify(emri) || "kategori";
  for (let i = 1; ; i++) {
    const slug = i === 1 ? baza : `${baza}-${i}`;
    const [ekziston] = await db
      .select({ id: kategori.id })
      .from(kategori)
      .where(and(eq(kategori.biznesId, biznesId), eq(kategori.slug, slug), pervec ? ne(kategori.id, pervec) : undefined));
    if (!ekziston) return slug;
  }
}

function emriNga(fd: FormData) {
  return String(fd.get("emri") ?? "").trim().slice(0, 40);
}

export async function shtoKategori(_: Rezultat, fd: FormData): Promise<Rezultat> {
  const admin = await kerkoPronarin();
  const emri = emriNga(fd);
  if (!emri) return { gabim: "Shkruani emrin e kategorisë." };
  const [{ m }] = await db.select({ m: max(kategori.renditja) }).from(kategori).where(eq(kategori.biznesId, admin.biznesId));
  await db.insert(kategori).values({
    biznesId: admin.biznesId,
    emri,
    slug: await slugUnik(admin.biznesId, emri),
    renditja: (m ?? -1) + 1,
  });
  rifresko();
  return { ok: `"${emri}" u shtua.` };
}

export async function riemertoKategori(id: string, _: Rezultat, fd: FormData): Promise<Rezultat> {
  const admin = await kerkoPronarin();
  const emri = emriNga(fd);
  if (!emri) return { gabim: "Emri nuk mund të jetë bosh." };
  await db
    .update(kategori)
    .set({ emri, slug: await slugUnik(admin.biznesId, emri, id) })
    .where(and(eq(kategori.id, id), eq(kategori.biznesId, admin.biznesId)));
  rifresko();
  return { ok: "U ruajt." };
}

/** Swaps the category with its neighbour above (-1) or below (+1). */
export async function levizKategori(id: string, drejtimi: -1 | 1): Promise<Rezultat> {
  const admin = await kerkoPronarin();
  const lista = await db
    .select({ id: kategori.id })
    .from(kategori)
    .where(eq(kategori.biznesId, admin.biznesId))
    .orderBy(asc(kategori.renditja), asc(kategori.emri));
  const i = lista.findIndex((k) => k.id === id);
  const j = i + drejtimi;
  if (i < 0 || j < 0 || j >= lista.length) return {};
  [lista[i], lista[j]] = [lista[j], lista[i]];
  await db.transaction(async (tx) => {
    for (const [renditja, k] of lista.entries()) await tx.update(kategori).set({ renditja }).where(eq(kategori.id, k.id));
  });
  rifresko();
  return {};
}

export async function fshiKategori(id: string): Promise<Rezultat> {
  const admin = await kerkoPronarin();
  // Products in this category stay, just without a category (FK: on delete set null).
  await db.delete(kategori).where(and(eq(kategori.id, id), eq(kategori.biznesId, admin.biznesId)));
  rifresko();
  return { ok: "U fshi." };
}
