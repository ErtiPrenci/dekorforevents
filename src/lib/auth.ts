import bcrypt from "bcryptjs";
import { createHash, randomBytes } from "node:crypto";
import { and, eq, gt } from "drizzle-orm";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { db } from "@/db";
import { perdorues, sesion } from "@/db/schema";

const COOKIE = "sesioni";
const KOHEZGJATJA_DITE = 30;

export async function hashFjalekalimin(fjalekalimi: string) {
  return bcrypt.hash(fjalekalimi, 12);
}

export async function verifikoFjalekalimin(fjalekalimi: string, hash: string) {
  return bcrypt.compare(fjalekalimi, hash);
}

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export async function krijoSesion(perdoruesId: string, biznesId: string) {
  const token = randomBytes(32).toString("base64url");
  const skadonMe = new Date(Date.now() + KOHEZGJATJA_DITE * 86_400_000);
  await db.insert(sesion).values({ id: hashToken(token), perdoruesId, biznesId, skadonMe });
  (await cookies()).set(COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: skadonMe,
  });
}

export async function mbyllSesionin() {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (token) await db.delete(sesion).where(eq(sesion.id, hashToken(token)));
  jar.delete(COOKIE);
}

export type Admin = { perdoruesId: string; biznesId: string; emri: string; email: string; roli: "PRONAR" | "STAF" };

export const merrAdminin = cache(async (): Promise<Admin | null> => {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return null;
  const [rresht] = await db
    .select({
      perdoruesId: perdorues.id,
      biznesId: sesion.biznesId,
      emri: perdorues.emri,
      email: perdorues.email,
      roli: perdorues.roli,
    })
    .from(sesion)
    .innerJoin(perdorues, eq(perdorues.id, sesion.perdoruesId))
    .where(and(eq(sesion.id, hashToken(token)), gt(sesion.skadonMe, new Date())));
  return rresht ?? null;
});

export async function kerkoAdminin(): Promise<Admin> {
  const admin = await merrAdminin();
  if (!admin) redirect("/admin/hyr");
  return admin;
}

export async function kerkoPronarin(): Promise<Admin> {
  const admin = await kerkoAdminin();
  if (admin.roli !== "PRONAR") redirect("/admin");
  return admin;
}

// Simple in-memory login throttle: 5 failures per email+IP per 15 minutes.
const deshtimet = new Map<string, { numri: number; deri: number }>();

export function eshteIKufizuar(celesi: string): boolean {
  const d = deshtimet.get(celesi);
  return !!d && d.deri > Date.now() && d.numri >= 5;
}

export function regjistroDeshtim(celesi: string) {
  const d = deshtimet.get(celesi);
  if (!d || d.deri < Date.now()) deshtimet.set(celesi, { numri: 1, deri: Date.now() + 15 * 60_000 });
  else d.numri++;
}

export function pastroDeshtimet(celesi: string) {
  deshtimet.delete(celesi);
}
