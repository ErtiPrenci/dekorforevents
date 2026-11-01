import Link from "next/link";
import { notFound } from "next/navigation";
import { PastroShportenPasRezervimit } from "@/components/shop/cart";
import { Ngjyra, StatusBadge } from "@/components/ui";
import { formatoDaten, formatoKohen, koheEMbetur } from "@/lib/dates";
import { formatoCmimin } from "@/lib/format";
import { lidhjeWhatsApp } from "@/lib/phone";
import { merrRezerviminMeToken } from "@/lib/reservations";
import type { Statusi } from "@/lib/status";
import { merrBiznesinPublik } from "@/lib/tenant";

export const metadata = { title: "Rezervimi juaj", robots: { index: false } };
export const dynamic = "force-dynamic";

type Props = { params: Promise<{ token: string }>; searchParams: Promise<{ "e-re"?: string }> };

const MBYLLUR: Partial<Record<Statusi, string>> = {
  SKADUAR: "Afati skadoi dhe data u lirua.",
  REFUZUAR: "Rezervimi nuk u pranua.",
  ANULUAR: "Rezervimi u anulua.",
  MOSPARAQITJE: "Rezervimi u mbyll.",
  DOREZUAR: "Dekori u dorëzua. Gëzuar festën! 🎈",
  PERFUNDUAR: "Faleminderit!",
};

export default async function StatusiIRezervimit({ params, searchParams }: Props) {
  const b = await merrBiznesinPublik();
  const r = await merrRezerviminMeToken((await params).token);
  if (!r || r.biznesId !== b.id) notFound();
  const eRe = (await searchParams)["e-re"] === "1";

  const kontakti = b.whatsappPronarit ?? b.telefoni;
  const skaduarNeFakt = r.statusi === "NE_PRITJE_TE_KAPARIT" && r.mbahetDeri && r.mbahetDeri <= new Date();
  const statusi = skaduarNeFakt ? "SKADUAR" : r.statusi;
  const m = (n: number) => formatoCmimin(n, b.monedha);

  return (
    <div className="mx-auto max-w-xl px-4 pt-8">
      {eRe && <PastroShportenPasRezervimit />}

      <StatusBadge statusi={statusi} />
      <h1 className="mt-2 font-display text-4xl font-semibold tracking-tight">{r.kodi}</h1>
      <p className="mt-1 text-lg text-ink-soft">{formatoDaten(r.dataEventit)}</p>

      <section className="card mt-6 space-y-3 p-5">
        {statusi === "NE_PRITJE_TE_KAPARIT" && (
          <>
            <p className="text-lg font-semibold">
              Paguani kaparin <span className="font-display text-2xl">{m(r.kapari)}</span> në punishte.
            </p>
            <p className="text-sm text-ink-soft">
              Deri më <strong>{formatoKohen(r.mbahetDeri!)}</strong> ({koheEMbetur(r.mbahetDeri!)}). Pas kësaj data lirohet.
            </p>
            <p className="text-sm">
              📍 {[b.adresaPunishtes, b.qyteti].filter(Boolean).join(", ")}
              {b.orariPunes && <span className="text-ink-soft"> · {b.orariPunes}</span>}
            </p>
            {b.googleMapsUrl && (
              <a href={b.googleMapsUrl} target="_blank" rel="noopener noreferrer" className="btn-ghost btn-sm">
                Google Maps
              </a>
            )}
          </>
        )}
        {statusi === "NE_PRITJE_TE_APROVIMIT" && (
          <>
            <p className="text-lg font-semibold">✅ Rezervimi u dërgua.</p>
            <p className="text-sm text-ink-soft">
              {b.kerkonKapar
                ? "Punishtja ju konfirmon çmimin dhe kaparin së shpejti."
                : "Data mbahet për ju. Punishtja ju kontakton për konfirmim."}
            </p>
          </>
        )}
        {statusi === "KONFIRMUAR" && (
          <>
            <p className="text-lg font-semibold">🎉 Rezervimi është i konfirmuar.</p>
            {!b.kerkonKapar && <p className="text-sm text-ink-soft">Pagesa bëhet në kesh kur merrni dekorin.</p>}
          </>
        )}
        {MBYLLUR[statusi] && (
          <>
            <p className="text-lg font-semibold">{MBYLLUR[statusi]}</p>
            {statusi === "REFUZUAR" && r.arsyejaRefuzimit && <p className="text-ink-soft">{r.arsyejaRefuzimit}</p>}
          </>
        )}
      </section>

      <h2 className="mb-3 mt-6 text-xl font-semibold">Dekoret</h2>
      <ul className="card divide-y divide-line">
        {r.rreshtat.map((x) => (
          <li key={x.id} className="space-y-1 p-4">
            <div className="flex justify-between gap-3">
              <span className="font-semibold">
                {x.sasia > 1 && `${x.sasia}× `}
                {x.emriProduktit}
              </span>
              <span className="shrink-0">{m(x.cmimiNjesi * x.sasia)}</span>
            </div>
            {x.zgjedhjet.map((z, i) => (
              <p key={i} className="flex flex-wrap items-center gap-x-2 text-sm text-ink-soft">
                {z.hex && <Ngjyra hex={z.hex} madhesia={14} />}
                {z.opsioni}: <span className="text-ink">{z.vlera}</span>
              </p>
            ))}
            {x.shenimi && <p className="text-sm text-ink-soft">Shënim: {x.shenimi}</p>}
            {x.fotot.length > 0 && <p className="text-xs text-muted">{x.fotot.length} foto frymëzimi u dërguan</p>}
          </li>
        ))}
        <li className="space-y-1 p-4 text-sm">
          {r.tarifaTransportit > 0 && (
            <p className="flex justify-between">
              <span className="text-ink-soft">Transporti</span>
              {m(r.tarifaTransportit)}
            </p>
          )}
          <p className="flex justify-between text-base font-semibold">
            <span>Totali</span>
            {m(r.nentotali + r.tarifaTransportit)}
          </p>
          <p className="pt-1 text-ink-soft">
            {r.menyraDorezimit === "DERGESE" ? `Dërgesë në: ${r.adresaDorezimit}` : "Merret në punishte"}
          </p>
        </li>
      </ul>

      <div className="mt-6 flex flex-wrap gap-2">
        {kontakti && (
          <a
            href={lidhjeWhatsApp(kontakti, `Përshëndetje! Rezervimi ${r.kodi}.`)}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-ghost"
          >
            Shkruani në WhatsApp
          </a>
        )}
        <Link href="/kushtet" className="btn-ghost">
          Kushtet e rezervimit
        </Link>
        {MBYLLUR[statusi] && statusi !== "DOREZUAR" && statusi !== "PERFUNDUAR" && (
          <Link href="/katalogu" className="btn-primary">
            Zgjidhni një datë tjetër
          </Link>
        )}
      </div>
      <p className="mt-4 text-xs text-muted">
        Ruajeni këtë faqe. Mund ta gjeni sërish te “Ndiq rezervimin” me kodin <strong>{r.kodi}</strong> dhe numrin tuaj të telefonit.
      </p>
    </div>
  );
}
