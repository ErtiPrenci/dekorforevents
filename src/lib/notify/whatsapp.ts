// WhatsApp Business Cloud API — one platform-owned sender number messages each
// business owner with pre-approved utility templates (docs/PLAN.md §9,
// template texts in docs/whatsapp-templates.md).

export type RezultatDergimi = { statusi: "DERGUAR" | "DESHTOI" | "ANASHKALUAR"; gabimi?: string };

export function whatsappEshteKonfiguruar() {
  return !!(process.env.WHATSAPP_TOKEN && process.env.WHATSAPP_PHONE_NUMBER_ID);
}

// Template parameters may not contain newlines, tabs or 4+ consecutive spaces.
function pastro(vlera: string): string {
  const v = vlera.replace(/[\r\n\t]+/g, " ").replace(/ {4,}/g, "   ").trim();
  return v || "—";
}

export async function dergoTemplateWhatsApp(
  marresi: string,
  shablloni: string,
  parametrat: string[],
  gjuha = process.env.WHATSAPP_TEMPLATE_LANG ?? "sq",
): Promise<RezultatDergimi> {
  if (!whatsappEshteKonfiguruar()) {
    console.info(`[whatsapp:skip] ${shablloni} → ${marresi}`, parametrat);
    return { statusi: "ANASHKALUAR", gabimi: "WhatsApp nuk është konfiguruar" };
  }
  const version = process.env.WHATSAPP_API_VERSION ?? "v21.0";
  try {
    const res = await fetch(`https://graph.facebook.com/${version}/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to: marresi.replace(/\D/g, ""),
        type: "template",
        template: {
          name: shablloni,
          language: { code: gjuha },
          components: parametrat.length
            ? [{ type: "body", parameters: parametrat.map((p) => ({ type: "text", text: pastro(p) })) }]
            : [],
        },
      }),
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) return { statusi: "DESHTOI", gabimi: `${res.status} ${(await res.text()).slice(0, 500)}` };
    return { statusi: "DERGUAR" };
  } catch (e) {
    return { statusi: "DESHTOI", gabimi: e instanceof Error ? e.message : String(e) };
  }
}
