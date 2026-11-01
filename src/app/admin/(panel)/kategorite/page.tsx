import { asc, count, eq } from "drizzle-orm";
import Link from "next/link";
import { db } from "@/db";
import { kategori, produkt } from "@/db/schema";
import { Dergo, FormaVeprimi } from "@/components/admin/action-form";
import { kerkoPronarin } from "@/lib/auth";
import { fshiKategori, levizKategori, riemertoKategori, shtoKategori } from "./actions";

export const metadata = { title: "Kategoritë" };

export default async function Kategorite() {
  const admin = await kerkoPronarin();
  const lista = await db
    .select({ id: kategori.id, emri: kategori.emri, slug: kategori.slug, produkte: count(produkt.id) })
    .from(kategori)
    .leftJoin(produkt, eq(produkt.kategoriId, kategori.id))
    .where(eq(kategori.biznesId, admin.biznesId))
    .groupBy(kategori.id)
    .orderBy(asc(kategori.renditja), asc(kategori.emri));

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-3xl font-semibold">Kategoritë</h1>
        <Link href="/admin/produktet" className="text-sm text-ink-soft hover:text-ink">
          ← Produktet
        </Link>
      </div>
      <p className="text-sm text-ink-soft">
        Kategoritë shfaqen në dyqan si filtra dhe në ballinë. Renditja këtu është renditja që shohin klientët.
      </p>

      <section className="card p-5">
        <h2 className="mb-3 text-lg font-semibold">Kategori e re</h2>
        <FormaVeprimi veprimi={shtoKategori} className="flex flex-wrap gap-2" pastroPasSuksesit>
          <input name="emri" className="input flex-1" placeholder="p.sh. Balona, Tavolina ëmbëlsirash…" maxLength={40} required />
          <Dergo>+ Shto</Dergo>
        </FormaVeprimi>
      </section>

      {lista.length ? (
        <ul className="card divide-y divide-line">
          {lista.map((k, i) => (
            <li key={k.id} className="flex flex-wrap items-center gap-2 p-3">
              <div className="flex flex-col">
                <FormaVeprimi veprimi={levizKategori.bind(null, k.id, -1)}>
                  <button className="px-2 text-sm text-ink-soft hover:text-ink disabled:opacity-30" disabled={i === 0} aria-label="Lart">
                    ▲
                  </button>
                </FormaVeprimi>
                <FormaVeprimi veprimi={levizKategori.bind(null, k.id, 1)}>
                  <button
                    className="px-2 text-sm text-ink-soft hover:text-ink disabled:opacity-30"
                    disabled={i === lista.length - 1}
                    aria-label="Poshtë"
                  >
                    ▼
                  </button>
                </FormaVeprimi>
              </div>
              <FormaVeprimi veprimi={riemertoKategori.bind(null, k.id)} className="flex min-w-48 flex-1 gap-2">
                <input name="emri" defaultValue={k.emri} className="input !py-2" maxLength={40} required />
                <Dergo className="btn-ghost btn-sm">Ruaj</Dergo>
              </FormaVeprimi>
              <Link href={`/katalogu?kategoria=${k.slug}`} target="_blank" className="text-xs text-muted hover:text-ink">
                {k.produkte} produkt{k.produkte === 1 ? "" : "e"}
              </Link>
              <FormaVeprimi
                veprimi={fshiKategori.bind(null, k.id)}
                konfirmim={
                  k.produkte
                    ? `Ta fshij "${k.emri}"? ${k.produkte} produkte do të mbeten pa kategori (nuk fshihen).`
                    : `Ta fshij "${k.emri}"?`
                }
              >
                <button className="text-sm text-bad underline">Fshi</button>
              </FormaVeprimi>
            </li>
          ))}
        </ul>
      ) : (
        <p className="card p-8 text-center text-ink-soft">Ende asnjë kategori. Shtoni të parën më sipër.</p>
      )}
    </div>
  );
}
