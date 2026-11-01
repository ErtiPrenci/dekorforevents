"use server";

import { and, eq, max } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { biznes, bllokimDate, njoftim, paletaNgjyrave, perdorues, produkt } from "@/db/schema";
import type { Rezultat } from "@/components/admin/action-form";
import { hashFjalekalimin, kerkoAdminin, kerkoPronarin, verifikoFjalekalimin } from "@/lib/auth";
import { eshteDateValide } from "@/lib/dates";
import { dergoPush } from "@/lib/notify/push";
import { dergoTemplateWhatsApp, whatsappEshteKonfiguruar } from "@/lib/notify/whatsapp";
import { normalizoTelefonin } from "@/lib/phone";
import { fshiFoto, GabimFoto, ruajFoto } from "@/lib/storage";

const tekst = (fd: FormData, k: string, max = 200) => String(fd.get(k) ?? "").trim().slice(0, max) || null;
const numer = (fd: FormData, k: string) => Number(String(fd.get(k) ?? "").replace(/[^\d]/g, "") || 0);
const eshteHex = (s: string | null): s is string => !!s && /^#[0-9a-fA-F]{6}$/.test(s);

function rifresko() {
  revalidatePath("/admin", "layout");
  revalidatePath("/", "layout");
}

export async function ruajBiznesin(_: Rezultat, fd: FormData): Promise<Rezultat> {
  const admin = await kerkoPronarin();
  const emri = tekst(fd, "emri", 80);
  if (!emri) return { gabim: "Shkruani emrin e biznesit." };

  const whatsappRaw = tekst(fd, "whatsappPronarit", 40);
  const whatsappPronarit = whatsappRaw ? normalizoTelefonin(whatsappRaw) : null;
  if (whatsappRaw && !whatsappPronarit) return { gabim: "Numri i WhatsApp nuk është numër celulari shqiptar (p.sh. 069 123 4567)." };
  const telefoniRaw = tekst(fd, "telefoni", 40);
  const telefoni = telefoniRaw ? normalizoTelefonin(telefoniRaw) : null;
  if (telefoniRaw && !telefoni) return { gabim: "Numri i telefonit nuk është i saktë." };

  const maps = tekst(fd, "googleMapsUrl", 500);
  if (maps && !/^https:\/\//.test(maps)) return { gabim: "Lidhja e Google Maps duhet të fillojë me https://" };
  const ngjyra = tekst(fd, "ngjyraPrimare", 7);
  const instagram = tekst(fd, "instagram", 120)
    ?.replace(/^https?:\/\/(www\.)?instagram\.com\//, "")
    .replace(/[/?].*$/, "")
    .replace(/^@/, "");

  const vjeter = await db.query.biznes.findFirst({ where: eq(biznes.id, admin.biznesId) });
  let logoRruga = vjeter?.logoRruga ?? null;
  const logo = fd.get("logo");
  if (logo instanceof File && logo.size > 0) {
    try {
      logoRruga = await ruajFoto(admin.biznesId, "logo", logo, 400);
    } catch (e) {
      if (!(e instanceof GabimFoto)) console.error("[logo] ruajtja dështoi", e);
      return { gabim: e instanceof GabimFoto ? e.message : "Logoja nuk u ruajt." };
    }
    if (vjeter?.logoRruga) await fshiFoto(vjeter.logoRruga);
  }

  await db
    .update(biznes)
    .set({
      emri,
      qyteti: tekst(fd, "qyteti", 60) ?? "Tiranë",
      adresaPunishtes: tekst(fd, "adresaPunishtes", 200),
      googleMapsUrl: maps,
      orariPunes: tekst(fd, "orariPunes", 120),
      telefoni,
      whatsappPronarit,
      instagram: instagram || null,
      email: tekst(fd, "email", 120),
      nipt: tekst(fd, "nipt", 20)?.toUpperCase() ?? null,
      ngjyraPrimare: eshteHex(ngjyra) ? ngjyra : (vjeter?.ngjyraPrimare ?? "#b07cd8"),
      logoRruga,
    })
    .where(eq(biznes.id, admin.biznesId));
  rifresko();
  return { ok: "Të dhënat u ruajtën." };
}

export async function ruajRregullat(_: Rezultat, fd: FormData): Promise<Rezultat> {
  const admin = await kerkoPronarin();
  const kapariPerqindje = numer(fd, "kapariPerqindje");
  const oretMbajtjes = numer(fd, "oretMbajtjes");
  const monedha = String(fd.get("monedha"));
  if (kapariPerqindje < 0 || kapariPerqindje > 100) return { gabim: "Përqindja e kaparit duhet të jetë 0–100." };
  if (oretMbajtjes < 1 || oretMbajtjes > 168) return { gabim: "Orët e mbajtjes duhet të jenë 1–168." };
  if (monedha !== "LEK" && monedha !== "EUR") return { gabim: "Monedhë e pavlefshme." };
  await db
    .update(biznes)
    .set({
      kerkonKapar: fd.get("kerkonKapar") === "on",
      kapariPerqindje,
      kapariMinimum: numer(fd, "kapariMinimum"),
      oretMbajtjes,
      monedha,
    })
    .where(eq(biznes.id, admin.biznesId));
  rifresko();
  return { ok: "U ruajt. Vlen për rezervimet e reja." };
}

export async function shtoNgjyre(_: Rezultat, fd: FormData): Promise<Rezultat> {
  const admin = await kerkoPronarin();
  const emri = tekst(fd, "emri", 40);
  const hex = tekst(fd, "hex", 7);
  if (!emri || !eshteHex(hex)) return { gabim: "Shkruani emrin dhe zgjidhni ngjyrën." };
  const [{ m }] = await db.select({ m: max(paletaNgjyrave.renditja) }).from(paletaNgjyrave).where(eq(paletaNgjyrave.biznesId, admin.biznesId));
  await db.insert(paletaNgjyrave).values({ biznesId: admin.biznesId, emri, hex, cmimiShtese: numer(fd, "cmimiShtese"), renditja: (m ?? -1) + 1 });
  revalidatePath("/admin/cilesimet");
  return { ok: `"${emri}" u shtua.` };
}

export async function ndryshoNgjyren(id: string, _: Rezultat, fd: FormData): Promise<Rezultat> {
  const admin = await kerkoPronarin();
  const emri = tekst(fd, "emri", 40);
  const hex = tekst(fd, "hex", 7);
  if (!emri || !eshteHex(hex)) return { gabim: "Emri dhe ngjyra janë të detyrueshme." };
  await db
    .update(paletaNgjyrave)
    .set({ emri, hex, cmimiShtese: numer(fd, "cmimiShtese") })
    .where(and(eq(paletaNgjyrave.id, id), eq(paletaNgjyrave.biznesId, admin.biznesId)));
  revalidatePath("/admin/cilesimet");
  return { ok: "U ruajt. Produktet ekzistuese ruajnë emrin që kishin." };
}

export async function fshiNgjyren(id: string): Promise<Rezultat> {
  const admin = await kerkoPronarin();
  await db.delete(paletaNgjyrave).where(and(eq(paletaNgjyrave.id, id), eq(paletaNgjyrave.biznesId, admin.biznesId)));
  revalidatePath("/admin/cilesimet");
  return { ok: "U fshi." };
}

export async function shtoBllokim(_: Rezultat, fd: FormData): Promise<Rezultat> {
  const admin = await kerkoPronarin();
  const nga = String(fd.get("nga") ?? "");
  const deri = String(fd.get("deri") ?? "") || nga;
  if (!eshteDateValide(nga) || !eshteDateValide(deri) || deri < nga) return { gabim: "Zgjidhni datat (deri ≥ nga)." };
  let produktId = tekst(fd, "produktId", 40);
  if (produktId) {
    const [p] = await db.select({ id: produkt.id }).from(produkt).where(and(eq(produkt.id, produktId), eq(produkt.biznesId, admin.biznesId)));
    if (!p) produktId = null;
  }
  await db.insert(bllokimDate).values({ biznesId: admin.biznesId, nga, deri, produktId, arsyeja: tekst(fd, "arsyeja", 120) });
  revalidatePath("/admin/cilesimet");
  revalidatePath("/admin/kalendari");
  return { ok: "Datat u bllokuan. Rezervimet ekzistuese nuk preken." };
}

export async function fshiBllokim(id: string): Promise<Rezultat> {
  const admin = await kerkoPronarin();
  await db.delete(bllokimDate).where(and(eq(bllokimDate.id, id), eq(bllokimDate.biznesId, admin.biznesId)));
  revalidatePath("/admin/cilesimet");
  revalidatePath("/admin/kalendari");
  return { ok: "U hoq." };
}

export async function ruajKushtet(_: Rezultat, fd: FormData): Promise<Rezultat> {
  const admin = await kerkoPronarin();
  const rikthe = fd.get("rikthe") === "1";
  await db
    .update(biznes)
    .set({ kushtet: rikthe ? null : tekst(fd, "kushtet", 20_000) })
    .where(eq(biznes.id, admin.biznesId));
  rifresko();
  return { ok: rikthe ? "U rikthye teksti standard." : "Kushtet u ruajtën." };
}

export async function testoNjoftimet(): Promise<Rezultat> {
  const admin = await kerkoPronarin();
  const b = await db.query.biznes.findFirst({ where: eq(biznes.id, admin.biznesId) });
  const push = await dergoPush(admin.biznesId, {
    titulli: "🔔 Njoftim prove",
    teksti: "Njoftimet funksionojnë në këtë pajisje.",
    url: "/admin",
  });
  await db.insert(njoftim).values({
    biznesId: admin.biznesId,
    kanali: "PUSH",
    marresi: `${push.marres} pajisje`,
    shablloni: "prove",
    statusi: push.statusi,
    gabimi: push.gabimi,
  });
  const pjeset = [push.statusi === "DERGUAR" ? `Push: u dërgua në ${push.marres} pajisje.` : `Push: ${push.gabimi}.`];

  if (whatsappEshteKonfiguruar() && b?.whatsappPronarit) {
    // hello_world exists in every new WhatsApp Business account.
    const wa = await dergoTemplateWhatsApp(b.whatsappPronarit, "hello_world", [], "en_US");
    await db.insert(njoftim).values({
      biznesId: admin.biznesId,
      kanali: "WHATSAPP",
      marresi: b.whatsappPronarit,
      shablloni: "hello_world",
      statusi: wa.statusi,
      gabimi: wa.gabimi,
    });
    pjeset.push(wa.statusi === "DERGUAR" ? "WhatsApp: u dërgua." : `WhatsApp: ${wa.gabimi}`);
  } else {
    pjeset.push(b?.whatsappPronarit ? "WhatsApp: platforma ende nuk është lidhur me Meta." : "WhatsApp: shtoni numrin tuaj më sipër.");
  }
  revalidatePath("/admin/cilesimet");
  return push.statusi === "DERGUAR" ? { ok: pjeset.join(" ") } : { gabim: pjeset.join(" ") };
}

export async function ndryshoFjalekalimin(_: Rezultat, fd: FormData): Promise<Rezultat> {
  const admin = await kerkoAdminin();
  const aktual = String(fd.get("aktual") ?? "");
  const iRi = String(fd.get("iRi") ?? "");
  if (iRi.length < 10) return { gabim: "Fjalëkalimi i ri duhet të ketë të paktën 10 shenja." };
  if (iRi !== String(fd.get("perseri") ?? "")) return { gabim: "Fjalëkalimet e reja nuk përputhen." };
  const p = await db.query.perdorues.findFirst({ where: eq(perdorues.id, admin.perdoruesId) });
  if (!p || !(await verifikoFjalekalimin(aktual, p.fjalekalimiHash))) return { gabim: "Fjalëkalimi aktual është i gabuar." };
  await db.update(perdorues).set({ fjalekalimiHash: await hashFjalekalimin(iRi) }).where(eq(perdorues.id, p.id));
  return { ok: "Fjalëkalimi u ndryshua." };
}
