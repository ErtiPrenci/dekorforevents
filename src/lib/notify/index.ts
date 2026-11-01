import { and, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { njoftim, rezervim, rezervimRresht } from "@/db/schema";
import { formatoDaten, formatoKohen, sot } from "../dates";
import { formatoCmimin } from "../format";
import { permbledhjaEZgjedhjeve } from "../options";
import { shfaqTelefonin } from "../phone";
import { merrBiznesinMeId } from "../tenant";
import { dergoPush, type PushPayload } from "./push";
import { dergoTemplateWhatsApp, type RezultatDergimi } from "./whatsapp";

// docs/PLAN.md §9: WhatsApp to the owner, web push as the free backup.
// Every attempt is logged in `njoftim`. Notifications never break the flow
// that triggered them.

const appUrl = () => (process.env.APP_URL ?? "http://localhost:3000").replace(/\/$/, "");

async function regjistro(biznesId: string, kanali: "WHATSAPP" | "PUSH", marresi: string, shablloni: string, r: RezultatDergimi) {
  await db.insert(njoftim).values({ biznesId, kanali, marresi, shablloni, statusi: r.statusi, gabimi: r.gabimi });
}

async function dergoTePronari(
  biznesId: string,
  shablloni: string,
  parametrat: string[],
  push: PushPayload,
) {
  try {
    const b = await merrBiznesinMeId(biznesId);
    const [wa, p] = await Promise.all([
      b.whatsappPronarit
        ? dergoTemplateWhatsApp(b.whatsappPronarit, shablloni, parametrat)
        : Promise.resolve<RezultatDergimi>({ statusi: "ANASHKALUAR", gabimi: "Numri i WhatsApp mungon te Cilësimet" }),
      dergoPush(biznesId, push),
    ]);
    await regjistro(biznesId, "WHATSAPP", b.whatsappPronarit ?? "—", shablloni, wa);
    await regjistro(biznesId, "PUSH", `${p.marres} pajisje`, shablloni, p);
  } catch (e) {
    console.error(`[njoftim] ${shablloni} dështoi`, e);
  }
}

export async function njoftoRezervimTeRi(biznesId: string, rezervimId: string) {
  const r = await db.query.rezervim.findFirst({
    where: and(eq(rezervim.id, rezervimId), eq(rezervim.biznesId, biznesId)),
    with: { klient: true, rreshtat: true },
  });
  if (!r) return;
  const b = await merrBiznesinMeId(biznesId);
  const produktet = r.rreshtat.map((x) => (x.sasia > 1 ? `${x.sasia}× ${x.emriProduktit}` : x.emriProduktit)).join(", ");
  const zgjedhjet = r.rreshtat.map((x) => permbledhjaEZgjedhjeve(x.zgjedhjet)).filter(Boolean).join(" | ");
  const kerkonAprovim = r.rreshtat.some((x) => x.kerkonAprovim);
  const kapari = !b.kerkonKapar
    ? `pa kapar · totali ${formatoCmimin(r.nentotali, b.monedha)}`
    : r.statusi === "NE_PRITJE_TE_APROVIMIT"
      ? "caktohet pas aprovimit"
      : `${formatoCmimin(r.kapari, b.monedha)} — afati ${formatoKohen(r.mbahetDeri!)}`;
  const link = `${appUrl()}/admin/rezervimet/${r.id}`;

  await dergoTePronari(
    biznesId,
    "rezervim_i_ri",
    [
      r.kodi,
      produktet,
      formatoDaten(r.dataEventit),
      zgjedhjet || "Pa zgjedhje të veçanta",
      kerkonAprovim ? "⚠️ Ka kërkesa të veçanta" : "Pa kërkesa të veçanta",
      `${r.klient.emri} · ${shfaqTelefonin(r.klient.telefoni)}`,
      kapari,
      link,
    ],
    {
      titulli: `${kerkonAprovim ? "⚠️ " : "🔔 "}Rezervim i ri — ${r.kodi}`,
      teksti: `${produktet} · ${formatoDaten(r.dataEventit, false)} · ${r.klient.emri}`,
      url: `/admin/rezervimet/${r.id}`,
    },
  );
}

/** Holds expiring within 6 hours, notified once each. */
export async function njoftoAfatetQeSkadojne() {
  const teAfert = await db
    .update(rezervim)
    .set({ kujtuarSkadimi: true })
    .where(
      and(
        eq(rezervim.statusi, "NE_PRITJE_TE_KAPARIT"),
        eq(rezervim.kujtuarSkadimi, false),
        sql`${rezervim.mbahetDeri} > now()`,
        sql`${rezervim.mbahetDeri} <= now() + interval '6 hours'`,
      ),
    )
    .returning({ id: rezervim.id });

  for (const { id } of teAfert) {
    const r = await db.query.rezervim.findFirst({ where: eq(rezervim.id, id), with: { klient: true } });
    if (!r) continue;
    const b = await merrBiznesinMeId(r.biznesId);
    await dergoTePronari(
      r.biznesId,
      "afati_po_skadon",
      [
        r.kodi,
        r.klient.emri,
        formatoCmimin(r.kapari, b.monedha),
        formatoKohen(r.mbahetDeri!),
        `${appUrl()}/admin/rezervimet/${r.id}`,
      ],
      {
        titulli: `⏰ Afati po skadon — ${r.kodi}`,
        teksti: `${r.klient.emri} nuk ka paguar ende kaparin. Afati: ${formatoKohen(r.mbahetDeri!)}`,
        url: `/admin/rezervimet/${r.id}`,
      },
    );
  }
  return teAfert.length;
}

export async function permbledhjaDitore(biznesId: string) {
  const dita = sot();
  const [n] = await db
    .select({
      dorezime: sql<number>`count(distinct ${rezervim.id}) filter (where ${rezervim.statusi} = 'KONFIRMUAR' and ${rezervimRresht.dritarjaNga} = ${dita})::int`,
      kthime: sql<number>`count(distinct ${rezervim.id}) filter (where ${rezervim.statusi} = 'DOREZUAR' and ${rezervimRresht.dritarjaDeri} = ${dita})::int`,
      kapare: sql<number>`count(distinct ${rezervim.id}) filter (where ${rezervim.statusi} = 'NE_PRITJE_TE_KAPARIT')::int`,
      aprovime: sql<number>`count(distinct ${rezervim.id}) filter (where ${rezervim.statusi} = 'NE_PRITJE_TE_APROVIMIT')::int`,
    })
    .from(rezervim)
    .innerJoin(rezervimRresht, eq(rezervimRresht.rezervimId, rezervim.id))
    .where(eq(rezervim.biznesId, biznesId));

  if (!n.dorezime && !n.kthime && !n.kapare && !n.aprovime) return false;
  await dergoTePronari(
    biznesId,
    "permbledhje_ditore",
    [formatoDaten(dita), String(n.dorezime), String(n.kthime), String(n.kapare), String(n.aprovime), `${appUrl()}/admin`],
    {
      titulli: "☀️ Përmbledhja e sotme",
      teksti: `Dorëzime: ${n.dorezime} · Kthime: ${n.kthime} · Kapare në pritje: ${n.kapare} · Për aprovim: ${n.aprovime}`,
      url: "/admin",
    },
  );
  return true;
}
