import Link from "next/link";
import { KerkimMeDate } from "@/components/shop/date-search";
import { KarteProdukti } from "@/components/shop/product-card";
import { filtratEPerdorur, listoProduktet } from "@/lib/catalog";
import { shtoDite, sot } from "@/lib/dates";
import { formatoCmimin } from "@/lib/format";
import { merrBiznesinPublik } from "@/lib/tenant";

export async function generateMetadata() {
  const b = await merrBiznesinPublik();
  return { title: `${b.emri} — dekore me qira për evente` };
}

export default async function Ballina() {
  const b = await merrBiznesinPublik();
  const [produktet, { kategorite }] = await Promise.all([listoProduktet(b.id), filtratEPerdorur(b.id)]);

  const hapat: [string, string][] = [
    ["Zgjidhni datën dhe dekorin", "Kalendari tregon menjëherë çfarë është e lirë. Zgjidhni ngjyrën ose shtoni emrin."],
    b.kerkonKapar
      ? ["Dërgoni rezervimin", `Data mbahet për ju ${b.oretMbajtjes} orë dhe merrni një kod rezervimi.`]
      : ["Dërgoni rezervimin", "Data mbahet për ju dhe merrni një kod për ta ndjekur rezervimin."],
    b.kerkonKapar
      ? [
          "Paguani kaparin në punishte",
          `Kapari (${b.kapariPerqindje}%, min. ${formatoCmimin(b.kapariMinimum, b.monedha)}) e konfirmon datën. Pjesa tjetër në dorëzim.`,
        ]
      : ["Ne e konfirmojmë", "Ju kontaktojmë për konfirmim. Pagesa bëhet në kesh kur merrni dekorin."],
  ];

  return (
    <>
      <section className="relative overflow-hidden">
        <div aria-hidden className="absolute -right-24 -top-24 h-80 w-80 rounded-full bg-brand/25 blur-3xl" />
        <div aria-hidden className="absolute -left-20 top-40 h-64 w-64 rounded-full bg-brand-soft blur-2xl" />
        <div className="relative mx-auto max-w-6xl px-4 pb-14 pt-12 sm:pt-20">
          <p className="eyebrow">{b.qyteti} · Punuar me dorë</p>
          <h1 className="mt-3 max-w-2xl text-4xl font-semibold leading-[1.05] sm:text-6xl">
            Dekore që e bëjnë festën <span className="italic text-brand-strong">të paharrueshme.</span>
          </h1>
          <p className="mt-4 max-w-xl text-lg text-ink-soft">Zgjidhni datën e eventit dhe shikoni menjëherë çfarë është e lirë.</p>
          <div className="mt-8 max-w-2xl">
            <KerkimMeDate min={shtoDite(sot(), 1)} />
          </div>
          {kategorite.length > 0 && (
            <div className="mt-6 flex flex-wrap gap-2">
              {kategorite.map((k) => (
                <Link key={k.slug} href={`/katalogu?kategoria=${k.slug}`} className="chip">
                  {k.emri}
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4">
        <div className="mb-5 flex items-end justify-between">
          <h2 className="text-2xl font-semibold sm:text-3xl">Dekoret tona</h2>
          <Link href="/katalogu" className="text-sm font-semibold underline underline-offset-4">
            Të gjitha
          </Link>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-4">
          {produktet.slice(0, 8).map((p) => (
            <KarteProdukti key={p.id} p={p} monedha={b.monedha} />
          ))}
        </div>
      </section>

      <section className="mx-auto mt-16 max-w-6xl px-4">
        <h2 className="text-2xl font-semibold sm:text-3xl">Si funksionon</h2>
        <ol className="mt-6 grid gap-4 sm:grid-cols-3">
          {hapat.map(([titulli, teksti], i) => (
            <li key={titulli} className="card p-5">
              <span className="grid h-9 w-9 place-items-center rounded-full bg-brand-soft font-display text-lg font-semibold text-brand-strong">
                {i + 1}
              </span>
              <h3 className="mt-3 text-lg font-semibold">{titulli}</h3>
              <p className="mt-1 text-sm text-ink-soft">{teksti}</p>
            </li>
          ))}
        </ol>
      </section>
    </>
  );
}
