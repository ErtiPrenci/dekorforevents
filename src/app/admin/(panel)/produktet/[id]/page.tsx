import { and, eq } from "drizzle-orm";
import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/db";
import { produkt } from "@/db/schema";
import { Dergo, FormaVeprimi } from "@/components/admin/action-form";
import { FormaEProduktit } from "@/components/admin/product-form";
import { Sukses } from "@/components/ui";
import { kerkoPronarin } from "@/lib/auth";
import { urlFoto } from "@/lib/storage";
import { merrBiznesinMeId } from "@/lib/tenant";
import { beKryesore, fshiFoton, ngarkoFotot, ruajProduktin } from "../actions";
import { teDhenatEFormes } from "../form-data";

export const metadata = { title: "Produkti" };

type Props = { params: Promise<{ id: string }>; searchParams: Promise<{ ruajtur?: string }> };

export default async function RedaktoProduktin({ params, searchParams }: Props) {
  const admin = await kerkoPronarin();
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const p = await db.query.produkt.findFirst({
    where: and(eq(produkt.id, id), eq(produkt.biznesId, admin.biznesId)),
    with: {
      fotot: { orderBy: (f, { asc }) => [asc(f.renditja)] },
      temat: true,
      opsionet: { orderBy: (o, { asc }) => [asc(o.renditja)], with: { vlerat: { orderBy: (v, { asc }) => [asc(v.renditja)] } } },
    },
  });
  if (!p) notFound();
  const [b, d] = await Promise.all([merrBiznesinMeId(admin.biznesId), teDhenatEFormes(admin.biznesId)]);
  const { ruajtur } = await searchParams;
  const fotot = p.fotot.map((f) => ({ id: f.id, url: urlFoto(f.rruga) }));

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <div className="flex items-center justify-between gap-3">
        <Link href="/admin/produktet" className="text-sm text-ink-soft hover:text-ink">
          ← Produktet
        </Link>
        <a href={`/produkti/${p.slug}`} target="_blank" className="text-sm font-medium underline">
          Shiko në dyqan ↗
        </a>
      </div>
      <h1 className="text-3xl font-semibold">{p.emri}</h1>
      {ruajtur && <Sukses>Produkti u krijua. Shtoni foto ose personalizim më poshtë.</Sukses>}

      <section className="card space-y-4 p-5">
        <h2 className="text-lg font-semibold">Fotot</h2>
        {fotot.length > 0 && (
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
            {fotot.map((f, i) => (
              <div key={f.id} className="space-y-1.5">
                <div className={`relative aspect-[4/5] overflow-hidden rounded-xl ${i === 0 ? "ring-2 ring-ink" : ""}`}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={f.url} alt={`Foto ${i + 1}`} className="h-full w-full object-cover" />
                  <span className="absolute left-1.5 top-1.5 rounded-full bg-paper/90 px-2 text-xs font-semibold">
                    {i === 0 ? "Kryesore" : `Foto ${i + 1}`}
                  </span>
                </div>
                <div className="flex justify-between text-xs">
                  {i > 0 ? (
                    <FormaVeprimi veprimi={beKryesore.bind(null, f.id)}>
                      <button className="underline">Bëje kryesore</button>
                    </FormaVeprimi>
                  ) : (
                    <span />
                  )}
                  <FormaVeprimi veprimi={fshiFoton.bind(null, f.id)} konfirmim="Ta fshij këtë foto?">
                    <button className="text-bad underline">Fshi</button>
                  </FormaVeprimi>
                </div>
              </div>
            ))}
          </div>
        )}
        <FormaVeprimi veprimi={ngarkoFotot.bind(null, p.id)} className="flex flex-wrap items-center gap-3" pastroPasSuksesit>
          <input
            type="file"
            name="fotot"
            accept="image/*"
            multiple
            required
            className="block flex-1 text-sm file:mr-3 file:rounded-full file:border-0 file:bg-brand-soft file:px-4 file:py-2 file:text-sm file:font-semibold file:text-brand-strong"
          />
          <Dergo className="btn-ghost btn-sm">Ngarko</Dergo>
        </FormaVeprimi>
      </section>

      <FormaEProduktit
        veprimi={ruajProduktin.bind(null, p.id)}
        produkt={{ ...p, temat: p.temat.map((t) => t.temaId) }}
        opsionetFillestare={p.opsionet.map((o) => ({
          id: o.id,
          lloji: o.lloji,
          emri: o.emri,
          iDetyrueshem: o.iDetyrueshem,
          gjatesiaMax: o.gjatesiaMax,
          cmimiShtese: o.cmimiShtese,
          lejonNgjyreTjeter: o.lejonNgjyreTjeter,
          vlerat: o.vlerat.map((v) => ({
            id: v.id,
            paletaId: v.paletaId,
            emri: v.emri,
            hex: v.hex,
            cmimiShtese: v.cmimiShtese,
            diteShtese: v.diteShtese,
            fotoId: v.fotoId,
          })),
        }))}
        {...d}
        fotot={fotot}
        monedha={b.monedha}
      />
    </div>
  );
}
