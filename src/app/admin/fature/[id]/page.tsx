import { notFound } from "next/navigation";
import { ButoniPrint } from "@/app/admin/flete-pune/[id]/print-button";
import { kerkoAdminin } from "@/lib/auth";
import { EMRAT_E_PAGESAVE } from "@/lib/cash";
import { formatoDaten, formatoKohen, sot } from "@/lib/dates";
import { formatoCmimin } from "@/lib/format";
import { permbledhjaEZgjedhjeve } from "@/lib/options";
import { shfaqTelefonin } from "@/lib/phone";
import { bilanci, merrRezervimin } from "@/lib/reservations";
import { urlFoto } from "@/lib/storage";
import { merrBiznesinMeId } from "@/lib/tenant";

export const metadata = { title: "Faturë", robots: { index: false } };

type Props = { params: Promise<{ id: string }>; searchParams: Promise<{ pagese?: string }> };

// Printable receipt for the customer: the whole reservation, or one cash
// payment ("Mandat pagese") when ?pagese=<id> is given.
export default async function Fature({ params, searchParams }: Props) {
  const admin = await kerkoAdminin();
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const [r, b] = await Promise.all([merrRezervimin(admin.biznesId, id), merrBiznesinMeId(admin.biznesId)]);
  if (!r) notFound();

  const { pagese: pageseId } = await searchParams;
  const pagesat = r.pagesat.filter((p) => p.lloji === "KAPAR" || p.lloji === "MBETJE");
  const njePagese = pageseId ? r.pagesat.find((p) => p.id === pageseId) : undefined;
  if (pageseId && !njePagese) notFound();

  const bil = bilanci(r, r.pagesat);
  const m = (n: number) => formatoCmimin(n, b.monedha);
  const numri = njePagese ? `${r.kodi}/${pagesat.indexOf(njePagese) + 1 || r.pagesat.indexOf(njePagese) + 1}` : r.kodi;
  const data = njePagese ? formatoKohen(njePagese.krijuarMe) : formatoDaten(sot(), false);

  return (
    <div className="mx-auto max-w-2xl bg-white p-6 print:max-w-none print:p-0">
      <div className="no-print mb-6 flex justify-between">
        <a href={`/admin/rezervimet/${r.id}`} className="text-sm text-ink-soft">
          ← Kthehu
        </a>
        <ButoniPrint />
      </div>

      <article className="space-y-6 text-sm">
        <header className="flex items-start justify-between gap-6 border-b-2 border-ink pb-4">
          <div className="flex items-start gap-3">
            {b.logoRruga && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={urlFoto(b.logoRruga)} alt="" className="h-14 w-14 rounded-full object-cover" />
            )}
            <div>
              <p className="font-display text-xl font-semibold">{b.emri}</p>
              {(b.adresaPunishtes || b.qyteti) && <p>{[b.adresaPunishtes, b.qyteti].filter(Boolean).join(", ")}</p>}
              {(b.telefoni || b.whatsappPronarit) && <p>Tel: {shfaqTelefonin((b.telefoni ?? b.whatsappPronarit)!)}</p>}
              {b.nipt && <p>NIPT: {b.nipt}</p>}
            </div>
          </div>
          <div className="text-right">
            <p className="font-display text-2xl font-semibold">{njePagese ? "Mandat pagese" : "Faturë"}</p>
            <p className="font-mono font-semibold">Nr. {numri}</p>
            <p>{data}</p>
          </div>
        </header>

        <section className="grid grid-cols-2 gap-4">
          <div>
            <p className="eyebrow">Klienti</p>
            <p className="font-semibold">{r.klient.emri}</p>
            <p>{shfaqTelefonin(r.klient.telefoni)}</p>
          </div>
          <div>
            <p className="eyebrow">Eventi</p>
            <p className="font-semibold">{formatoDaten(r.dataEventit)}</p>
            {r.llojiEventit && <p>{r.llojiEventit}</p>}
            <p>{r.menyraDorezimit === "DERGESE" ? `Dërgesë: ${r.adresaDorezimit}` : "Marrje në punishte"}</p>
          </div>
        </section>

        {njePagese ? (
          <section className="rounded-xl border-2 border-ink p-5 text-center">
            <p className="text-ink-soft">
              {EMRAT_E_PAGESAVE[njePagese.lloji]} në kesh për rezervimin {r.kodi}
            </p>
            <p className="mt-1 font-display text-4xl font-semibold">{m(njePagese.shuma)}</p>
            {njePagese.shenim && <p className="mt-1 text-ink-soft">{njePagese.shenim}</p>}
          </section>
        ) : (
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-ink text-left">
                <th className="py-2 font-semibold">Përshkrimi</th>
                <th className="py-2 text-right font-semibold">Sasia</th>
                <th className="py-2 text-right font-semibold">Çmimi</th>
                <th className="py-2 text-right font-semibold">Vlera</th>
              </tr>
            </thead>
            <tbody>
              {r.rreshtat.map((x) => (
                <tr key={x.id} className="border-b border-line align-top">
                  <td className="py-2">
                    <p className="font-medium">{x.emriProduktit}</p>
                    {x.zgjedhjet.length > 0 && <p className="text-xs text-ink-soft">{permbledhjaEZgjedhjeve(x.zgjedhjet)}</p>}
                  </td>
                  <td className="py-2 text-right">{x.sasia}</td>
                  <td className="py-2 text-right">{m(x.cmimiNjesi)}</td>
                  <td className="py-2 text-right">{m(x.cmimiNjesi * x.sasia)}</td>
                </tr>
              ))}
              {r.tarifaTransportit > 0 && (
                <tr className="border-b border-line">
                  <td className="py-2" colSpan={3}>
                    Transporti
                  </td>
                  <td className="py-2 text-right">{m(r.tarifaTransportit)}</td>
                </tr>
              )}
            </tbody>
          </table>
        )}

        <section className="ml-auto w-full max-w-xs space-y-1">
          <p className="flex justify-between text-base font-semibold">
            <span>Totali</span>
            {m(bil.totali)}
          </p>
          {pagesat.map((p) => (
            <p key={p.id} className={`flex justify-between ${p.id === njePagese?.id ? "font-semibold" : "text-ink-soft"}`}>
              <span>
                {EMRAT_E_PAGESAVE[p.lloji]} · {formatoKohen(p.krijuarMe)}
              </span>
              −{m(p.shuma)}
            </p>
          ))}
          <p className="flex justify-between border-t border-ink pt-1 text-base font-semibold">
            <span>{bil.mbetja > 0 ? "Mbetet për t'u paguar" : "E paguar plotësisht"}</span>
            {m(bil.mbetja)}
          </p>
          {bil.garanciaMbajtur > 0 && (
            <p className="flex justify-between text-ink-soft">
              <span>Garanci e mbajtur (kthehet)</span>
              {m(bil.garanciaMbajtur)}
            </p>
          )}
        </section>

        <section className="grid grid-cols-2 gap-10 pt-10">
          <div className="border-t border-ink pt-1 text-center text-ink-soft">Dorëzoi ({b.emri})</div>
          <div className="border-t border-ink pt-1 text-center text-ink-soft">Mori ({r.klient.emri})</div>
        </section>

        <p className="pt-4 text-center text-xs text-muted">Faleminderit! · Dokument i brendshëm, nuk zëvendëson kuponin fiskal.</p>
      </article>
    </div>
  );
}
