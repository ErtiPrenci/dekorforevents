import Link from "next/link";
import { notFound } from "next/navigation";
import { ProduktiKlient } from "@/components/shop/product-booking";
import { merrProduktin } from "@/lib/catalog";
import { eshteDateValide, sot } from "@/lib/dates";
import { formatoCmimin, formatoPermasat } from "@/lib/format";
import { lidhjeWhatsApp } from "@/lib/phone";
import { opsionetPerKlient } from "@/lib/reservations";
import { urlFoto } from "@/lib/storage";
import { merrBiznesinPublik } from "@/lib/tenant";

type Props = { params: Promise<{ slug: string }>; searchParams: Promise<{ data?: string }> };

export async function generateMetadata({ params }: Props) {
  const b = await merrBiznesinPublik();
  const p = await merrProduktin(b.id, (await params).slug);
  if (!p) return {};
  return {
    title: `${p.emri} — ${b.emri}`,
    description: p.pershkrimi ?? undefined,
    openGraph: p.fotot[0] ? { images: [urlFoto(p.fotot[0].rruga)] } : undefined,
  };
}

export default async function FaqjaEProduktit({ params, searchParams }: Props) {
  const b = await merrBiznesinPublik();
  const p = await merrProduktin(b.id, (await params).slug);
  if (!p) notFound();
  const { data } = await searchParams;
  const dita = sot();

  const mundTeRezervohet = p.statusi === "AKTIV" && p.modet.includes("RENTAL") && p.cmimiQira != null;
  const permasat = formatoPermasat(p);
  const kontakti = b.whatsappPronarit ?? b.telefoni;
  const detajet = [
    permasat && ["Përmasat (G × L × T)", permasat],
    p.materiali && ["Materiali", p.materiali],
    p.sasiaNeStok > 1 && ["Në dispozicion", `${p.sasiaNeStok} copë`],
    p.garanciaDemtimit > 0 && ["Garanci (kthehet)", formatoCmimin(p.garanciaDemtimit, b.monedha)],
  ].filter((x): x is [string, string] => !!x);

  const info = (
    <div className="space-y-4">
      <nav className="text-sm text-muted">
        <Link href="/katalogu" className="hover:text-ink">
          Katalogu
        </Link>
        {p.kategori && (
          <>
            {" / "}
            <Link href={`/katalogu?kategoria=${p.kategori.slug}`} className="hover:text-ink">
              {p.kategori.emri}
            </Link>
          </>
        )}
      </nav>
      <h1 className="text-3xl font-semibold leading-tight sm:text-4xl">{p.emri}</h1>
      {p.cmimiQira != null && (
        <p className="text-lg">
          <span className="font-display text-2xl font-semibold">{formatoCmimin(p.cmimiQira, b.monedha)}</span>
          <span className="text-ink-soft"> me qira për një event</span>
        </p>
      )}
      {p.statusi !== "AKTIV" && (
        <p className="rounded-xl bg-warn-soft p-3 text-sm text-warn">
          {p.statusi === "NE_MIREMBAJTJE" ? "Ky dekor është përkohësisht në mirëmbajtje." : "Ky dekor nuk është më në dispozicion."}
        </p>
      )}
      {p.pershkrimi && <p className="whitespace-pre-line text-ink-soft">{p.pershkrimi}</p>}

      {detajet.length > 0 && (
        <dl className="grid grid-cols-2 gap-3 text-sm">
          {detajet.map(([emri, vlera]) => (
            <div key={emri} className="card p-3">
              <dt className="text-muted">{emri}</dt>
              <dd className="font-semibold">{vlera}</dd>
            </div>
          ))}
        </dl>
      )}

      {p.temat.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {p.temat.map(({ tema }) => (
            <Link key={tema.id} href={`/katalogu?tema=${tema.slug}`} className="chip !py-1 !text-xs">
              {tema.emri}
            </Link>
          ))}
        </div>
      )}

      {p.modet.includes("CUSTOM") && p.cmimiPorosi != null && (
        <div className="rounded-2xl border border-dashed border-brand bg-brand-soft/50 p-4 text-sm">
          <p className="font-semibold">Dëshironi ta keni tuajin?</p>
          <p className="mt-1 text-ink-soft">
            Punohet i ri sipas ngjyrës suaj, nga {formatoCmimin(p.cmimiPorosi, b.monedha)}
            {p.diteProdhimi ? `, gati për rreth ${p.diteProdhimi} ditë` : ""}.
          </p>
          {kontakti && (
            <a
              href={lidhjeWhatsApp(kontakti, `Përshëndetje! Dua të porosis "${p.emri}" të ri.`)}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-ghost btn-sm mt-3"
            >
              Pyesni në WhatsApp
            </a>
          )}
        </div>
      )}
    </div>
  );

  return (
    <div className="mx-auto max-w-6xl px-4 pt-6 sm:pt-10">
      <ProduktiKlient
        produkt={{
          id: p.id,
          slug: p.slug,
          emri: p.emri,
          cmimiQira: p.cmimiQira,
          sasiaNeStok: p.sasiaNeStok,
          shenimetKerkojneAprovim: p.shenimetKerkojneAprovim,
          mundTeRezervohet,
        }}
        fotot={p.fotot.map((f) => ({ id: f.id, url: urlFoto(f.rruga) }))}
        opsionet={opsionetPerKlient(p)}
        monedha={b.monedha}
        sot={dita}
        dataNgaKerkimi={data && eshteDateValide(data) && data > dita ? data : undefined}
        info={info}
      />
    </div>
  );
}
