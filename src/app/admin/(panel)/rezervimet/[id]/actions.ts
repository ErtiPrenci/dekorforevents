"use server";

import { revalidatePath } from "next/cache";
import type { Rezultat } from "@/components/admin/action-form";
import { kerkoAdminin } from "@/lib/auth";
import {
  anuloRezervimin,
  aprovoRezervimin,
  GabimRezervimi,
  refuzoRezervimin,
  regjistroKaparin,
  regjistroPagesen,
  ruajDetajetBrendshme,
  shenoDorezimin,
  shenoKthimin,
  shenoMosparaqitjen,
  zgjatAfatin,
} from "@/lib/reservations";

const numer = (fd: FormData, k: string) => Number(String(fd.get(k) ?? "").replace(/[^\d]/g, "") || 0);

async function ekzekuto(id: string, fn: (admin: Awaited<ReturnType<typeof kerkoAdminin>>) => Promise<unknown>, ok: string): Promise<Rezultat> {
  const admin = await kerkoAdminin();
  try {
    await fn(admin);
  } catch (e) {
    if (e instanceof GabimRezervimi) return { gabim: e.message };
    console.error("[admin] veprimi dështoi", e);
    return { gabim: "Diçka shkoi keq. Provoni përsëri." };
  }
  revalidatePath(`/admin/rezervimet/${id}`);
  revalidatePath("/admin");
  return { ok };
}

export async function aprovo(id: string, _: Rezultat, fd: FormData) {
  const cmimet: Record<string, number> = {};
  for (const [k, v] of fd.entries()) {
    if (k.startsWith("cmimi-")) cmimet[k.slice(6)] = Number(String(v).replace(/[^\d]/g, ""));
  }
  return ekzekuto(id, (a) => aprovoRezervimin(a, id, cmimet, numer(fd, "transporti")), "U ruajt.");
}

export async function refuzo(id: string, _: Rezultat, fd: FormData) {
  return ekzekuto(id, (a) => refuzoRezervimin(a, id, String(fd.get("arsyeja") ?? "")), "Rezervimi u refuzua.");
}

export async function kapariUPagua(id: string, _: Rezultat, fd: FormData) {
  return ekzekuto(id, (a) => regjistroKaparin(a, id, numer(fd, "shuma")), "Kapari u regjistrua. Rezervimi është i konfirmuar.");
}

export async function zgjat(id: string, _: Rezultat, fd: FormData) {
  const ore = Math.min(168, Math.max(1, numer(fd, "ore") || 24));
  return ekzekuto(id, (a) => zgjatAfatin(a, id, ore), `Afati u zgjat me ${ore} orë.`);
}

export async function dorezuar(id: string, _: Rezultat, fd: FormData) {
  return ekzekuto(id, (a) => shenoDorezimin(a, id, numer(fd, "garancia")), "U shënua si i dorëzuar.");
}

export async function kthyer(id: string) {
  return ekzekuto(id, (a) => shenoKthimin(a, id), "Dekori u kthye. Rezervimi u përfundua.");
}

export async function anulo(id: string, _: Rezultat, fd: FormData) {
  return ekzekuto(id, (a) => anuloRezervimin(a, id, String(fd.get("shenim") ?? "")), "Rezervimi u anulua.");
}

export async function mosparaqitje(id: string) {
  return ekzekuto(id, (a) => shenoMosparaqitjen(a, id), "U shënua që klienti nuk erdhi.");
}

export async function pagese(id: string, _: Rezultat, fd: FormData) {
  const lloji = String(fd.get("lloji"));
  if (lloji !== "MBETJE" && lloji !== "GARANCI" && lloji !== "KTHIM_GARANCIE") return { gabim: "Lloj i panjohur pagese." };
  return ekzekuto(id, (a) => regjistroPagesen(a, id, lloji, numer(fd, "shuma"), String(fd.get("shenim") ?? "")), "Pagesa u regjistrua.");
}

export async function detajet(id: string, _: Rezultat, fd: FormData) {
  return ekzekuto(
    id,
    (a) => ruajDetajetBrendshme(a, id, { shenimeBrendshme: String(fd.get("shenime") ?? ""), tarifaTransportit: numer(fd, "transporti") }),
    "U ruajt.",
  );
}
