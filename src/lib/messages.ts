import { formatoDaten, formatoKohen } from "./dates";
import { formatoCmimin, type Monedha } from "./format";
import type { Statusi } from "./status";

// Prefilled WhatsApp texts the owner sends from his OWN phone ("Njofto klientin").
// Free, no API — the customer sees the message from the business's own number.

export function mesazhiPerKlientin(
  r: {
    kodi: string;
    statusi: Statusi;
    dataEventit: string;
    kapari: number;
    mbahetDeri: Date | null;
    nentotali: number;
    tarifaTransportit: number;
    arsyejaRefuzimit: string | null;
    tokenPublik: string;
  },
  emriKlientit: string,
  b: { emri: string; kerkonKapar: boolean; monedha: Monedha; adresaPunishtes: string | null; qyteti: string },
  appUrl: string,
): string {
  const pershendetje = `Përshëndetje ${emriKlientit.split(" ")[0]}!`;
  const data = formatoDaten(r.dataEventit, false);
  const link = `${appUrl}/r/${r.tokenPublik}`;
  const adresa = b.adresaPunishtes ? `${b.adresaPunishtes}, ${b.qyteti}` : b.qyteti;

  switch (r.statusi) {
    case "NE_PRITJE_TE_APROVIMIT":
      return `${pershendetje} Morëm rezervimin tuaj ${r.kodi} për ${data}. Ju konfirmojmë së shpejti. ${link}`;
    case "NE_PRITJE_TE_KAPARIT":
      return `${pershendetje} Rezervimi ${r.kodi} për ${data} është gati. Totali: ${formatoCmimin(r.nentotali + r.tarifaTransportit, b.monedha)}. Për ta konfirmuar, ju lutem kaloni në punishte (${adresa}) dhe paguani kaparin prej ${formatoCmimin(r.kapari, b.monedha)}${r.mbahetDeri ? ` deri më ${formatoKohen(r.mbahetDeri)}` : ""}. ${link}`;
    case "KONFIRMUAR":
      return b.kerkonKapar
        ? `${pershendetje} Rezervimi ${r.kodi} për ${data} është i konfirmuar. Faleminderit! ${link}`
        : `${pershendetje} Rezervimi ${r.kodi} për ${data} është i konfirmuar. Totali: ${formatoCmimin(r.nentotali + r.tarifaTransportit, b.monedha)}, paguhet në kesh në marrje. Faleminderit! ${link}`;
    case "REFUZUAR":
      return `${pershendetje} Na vjen keq, rezervimi ${r.kodi} për ${data} nuk mund të pranohet${r.arsyejaRefuzimit ? `: ${r.arsyejaRefuzimit}` : "."} Na shkruani nëse doni ta shohim për një datë tjetër.`;
    case "SKADUAR":
      return `${pershendetje} Afati për kaparin e rezervimit ${r.kodi} skadoi dhe data u lirua. Nëse jeni ende të interesuar, na shkruani.`;
    default:
      return `${pershendetje} Lidhur me rezervimin ${r.kodi} për ${data}: ${link}`;
  }
}
