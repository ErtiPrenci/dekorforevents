"use server";

import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { perdorues } from "@/db/schema";
import {
  eshteIKufizuar,
  krijoSesion,
  mbyllSesionin,
  pastroDeshtimet,
  regjistroDeshtim,
  verifikoFjalekalimin,
} from "@/lib/auth";

export async function hyr(_: { gabim?: string }, fd: FormData): Promise<{ gabim?: string }> {
  const email = String(fd.get("email") ?? "").trim().toLowerCase();
  const fjalekalimi = String(fd.get("fjalekalimi") ?? "");
  const ip = (await headers()).get("x-forwarded-for")?.split(",")[0]?.trim() ?? "lokal";
  const celesi = `${email}|${ip}`;
  if (eshteIKufizuar(celesi)) return { gabim: "Shumë përpjekje të gabuara. Provoni pas 15 minutash." };

  const p = email ? await db.query.perdorues.findFirst({ where: eq(perdorues.email, email) }) : undefined;
  if (!p || !(await verifikoFjalekalimin(fjalekalimi, p.fjalekalimiHash))) {
    regjistroDeshtim(celesi);
    return { gabim: "Email ose fjalëkalim i gabuar." };
  }
  pastroDeshtimet(celesi);
  await krijoSesion(p.id, p.biznesId);
  redirect("/admin");
}

export async function dil() {
  await mbyllSesionin();
  redirect("/admin/hyr");
}
