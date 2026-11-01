"use server";

import { and, eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { klient, rezervim } from "@/db/schema";
import { normalizoTelefonin } from "@/lib/phone";
import { merrBiznesinPublik } from "@/lib/tenant";

export async function gjejRezervimin(_: { gabim?: string }, fd: FormData): Promise<{ gabim?: string }> {
  const kodi = String(fd.get("kodi") ?? "").trim().toUpperCase();
  const telefoni = normalizoTelefonin(String(fd.get("telefoni") ?? ""));
  const pergjigje = { gabim: "Nuk gjetëm asnjë rezervim me këtë kod dhe numër telefoni." };
  if (!kodi || !telefoni) return pergjigje;

  const b = await merrBiznesinPublik();
  const [r] = await db
    .select({ token: rezervim.tokenPublik })
    .from(rezervim)
    .innerJoin(klient, eq(klient.id, rezervim.klientId))
    .where(and(eq(rezervim.biznesId, b.id), eq(rezervim.kodi, kodi), eq(klient.telefoni, telefoni)));
  if (!r) return pergjigje;
  redirect(`/r/${r.token}`);
}
