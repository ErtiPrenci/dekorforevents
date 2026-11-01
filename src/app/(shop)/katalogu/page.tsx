import Link from "next/link";
import { KerkimMeDate } from "@/components/shop/date-search";
import { KarteProdukti } from "@/components/shop/product-card";
import { produktetELira } from "@/lib/availability";
import { filtratEPerdorur, listoProduktet } from "@/lib/catalog";
import { eshteDateValide, formatoDaten, shtoDite, sot } from "@/lib/dates";
import { merrBiznesinPublik } from "@/lib/tenant";

export const metadata = { title: "Katalogu" };

type Params = { data?: string; kategoria?: string; tema?: string };

function lidhje(baza: Params, ndryshim: Params) {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries({ ...baza, ...ndryshim })) if (v) p.set(k, v);
  const s = p.toString();
  return s ? `/katalogu?${s}` : "/katalogu";
}

export default async function Katalogu({ searchParams }: { searchParams: Promise<Params> }) {
  const sp = await searchParams;
  const b = await merrBiznesinPublik();
  const data = sp.data && eshteDateValide(sp.data) && sp.data > sot() ? sp.data : undefined;
  const [produktet, filtrat] = await Promise.all([
    listoProduktet(b.id, { kategoria: sp.kategoria, tema: sp.tema }),
    filtratEPerdorur(b.id),
  ]);
  const teLira = data ? await produktetELira(b.id, produktet, data) : null;
  const renditur = teLira ? [...produktet].sort((a, c) => Number(teLira.has(c.id)) - Number(teLira.has(a.id))) : produktet;
  const baza: Params = { data, kategoria: sp.kategoria, tema: sp.tema };

  return (
    <div className="mx-auto max-w-6xl px-4 pt-8">
      <h1 className="text-3xl font-semibold sm:text-4xl">Katalogu</h1>
      <div className="mt-5 max-w-2xl">
        <KerkimMeDate dataFillestare={data} min={shtoDite(sot(), 1)} />
      </div>

      {data && teLira && (
        <p className="mt-4 text-sm text-ink-soft">
          <strong className="text-ink">{teLira.size}</strong> nga {produktet.length} dekore janë të lira për{" "}
          <strong className="text-ink">{formatoDaten(data)}</strong> ·{" "}
          <Link href={lidhje(baza, { data: undefined })} className="underline">
            hiq datën
          </Link>
        </p>
      )}

      <div className="mt-6 space-y-3">
        <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:flex-wrap">
          <Link href={lidhje(baza, { kategoria: undefined })} className={`${sp.kategoria ? "chip" : "chip-active"} shrink-0`}>
            Të gjitha
          </Link>
          {filtrat.kategorite.map((k) => (
            <Link
              key={k.slug}
              href={lidhje(baza, { kategoria: k.slug })}
              className={`${sp.kategoria === k.slug ? "chip-active" : "chip"} shrink-0`}
            >
              {k.emri}
            </Link>
          ))}
        </div>
        {filtrat.temat.length > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-medium text-muted">Tema:</span>
            {filtrat.temat.map((t) => (
              <Link
                key={t.slug}
                href={lidhje(baza, { tema: sp.tema === t.slug ? undefined : t.slug })}
                className={sp.tema === t.slug ? "chip-active !py-1 !text-xs" : "chip !py-1 !text-xs"}
              >
                {t.emri}
              </Link>
            ))}
          </div>
        )}
      </div>

      {renditur.length ? (
        <div className="mt-6 grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-4">
          {renditur.map((p) => (
            <KarteProdukti key={p.id} p={p} monedha={b.monedha} data={data} iLire={teLira?.has(p.id)} />
          ))}
        </div>
      ) : (
        <p className="card mt-6 p-8 text-center text-ink-soft">Asnjë dekor nuk përputhet me këto filtra.</p>
      )}
    </div>
  );
}
