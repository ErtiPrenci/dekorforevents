"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { after } from "next/server";
import { z } from "zod";
import { njoftoRezervimTeRi } from "@/lib/notify";
import { GabimRezervimi, krijoRezervim } from "@/lib/reservations";
import { fshiFoto, GabimFoto, ruajFoto } from "@/lib/storage";
import { merrBiznesinPublik } from "@/lib/tenant";

const Zgjedhje = z.object({
  opsionId: z.string().max(64),
  vleraId: z.string().max(64).optional(),
  tekst: z.string().max(200).optional(),
  ngjyreTjeter: z.string().max(200).optional(),
});

const Payload = z.object({
  dataEventit: z.string(),
  llojiEventit: z.string().max(80).optional(),
  emri: z.string().max(120),
  telefoni: z.string().max(40),
  menyraDorezimit: z.enum(["MARRJE", "DERGESE"]),
  adresaDorezimit: z.string().max(400).optional(),
  shenimeKlienti: z.string().max(1500).optional(),
  artikujt: z
    .array(
      z.object({
        celes: z.string().max(64),
        produktId: z.uuid(),
        sasia: z.int().min(1).max(100),
        zgjedhjet: z.array(Zgjedhje).max(20),
        shenimi: z.string().max(1000).optional(),
      }),
    )
    .min(1)
    .max(30),
});

export type GjendjaEFormes = { gabim?: string };

const MAX_FOTO_PER_ARTIKULL = 3;

// Bots and floods only — real customers are never limited (docs/PLAN.md §7).
const kerkesat = new Map<string, number[]>();
function eshteFlood(ip: string) {
  const tani = Date.now();
  const lista = (kerkesat.get(ip) ?? []).filter((t) => tani - t < 3_600_000);
  lista.push(tani);
  kerkesat.set(ip, lista);
  return lista.length > 15;
}

export async function dergoRezervimin(_: GjendjaEFormes, formData: FormData): Promise<GjendjaEFormes> {
  if (formData.get("website")) return { gabim: "Diçka shkoi keq. Provoni përsëri." };
  if (formData.get("pranoj") !== "on") return { gabim: "Duhet të pranoni kushtet e rezervimit." };

  const ip = (await headers()).get("x-forwarded-for")?.split(",")[0]?.trim() ?? "lokal";
  if (eshteFlood(ip)) return { gabim: "Shumë kërkesa nga kjo lidhje. Provoni pas pak ose na shkruani në WhatsApp." };

  let payload: z.infer<typeof Payload>;
  try {
    payload = Payload.parse(JSON.parse(String(formData.get("payload") ?? "")));
  } catch {
    return { gabim: "Të dhënat e rezervimit nuk janë të plota. Rifreskoni faqen dhe provoni përsëri." };
  }

  const b = await merrBiznesinPublik();
  const fotoTeRuajtura: string[] = [];
  let rezultati: Awaited<ReturnType<typeof krijoRezervim>>;
  try {
    const artikujt = [];
    for (const a of payload.artikujt) {
      const skedaret = formData
        .getAll(`foto-${a.celes}`)
        .filter((f): f is File => f instanceof File && f.size > 0)
        .slice(0, MAX_FOTO_PER_ARTIKULL);
      const fotot: string[] = [];
      for (const f of skedaret) {
        const celesi = await ruajFoto(b.id, "frymezim", f, 1400);
        fotoTeRuajtura.push(celesi);
        fotot.push(celesi);
      }
      artikujt.push({ ...a, fotot });
    }
    // Delivery is switched off for now — the customer always picks up at the workshop.
    rezultati = await krijoRezervim(b, { ...payload, menyraDorezimit: "MARRJE", adresaDorezimit: undefined, artikujt });
  } catch (e) {
    await Promise.all(fotoTeRuajtura.map(fshiFoto));
    if (e instanceof GabimRezervimi || e instanceof GabimFoto) return { gabim: e.message };
    console.error("[rezervim] dështoi", e);
    return { gabim: "Rezervimi nuk u ruajt. Provoni përsëri ose na shkruani në WhatsApp." };
  }

  after(() => njoftoRezervimTeRi(b.id, rezultati.id));
  redirect(`/r/${rezultati.tokenPublik}?e-re=1`);
}
