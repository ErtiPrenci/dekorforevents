import { asc, eq, sql } from "drizzle-orm";
import Link from "next/link";
import { db } from "@/db";
import { foto, produkt } from "@/db/schema";
import { FotoOseVend } from "@/components/ui";
import { kerkoPronarin } from "@/lib/auth";
import { formatoCmimin } from "@/lib/format";
import { urlFoto } from "@/lib/storage";
import { merrBiznesinMeId } from "@/lib/tenant";

export const metadata = { title: "Produktet" };

const STATUSI = {
  AKTIV: ["Aktiv", "bg-ok-soft text-ok"],
  NE_MIREMBAJTJE: ["Në mirëmbajtje", "bg-warn-soft text-warn"],
  SHITUR: ["Shitur", "bg-line text-ink-soft"],
  I_TERHEQUR: ["I fshehur", "bg-line text-muted"],
} as const;

export default async function Produktet() {
  const admin = await kerkoPronarin();
  const b = await merrBiznesinMeId(admin.biznesId);
  const lista = await db
    .select({
      id: produkt.id,
      emri: produkt.emri,
      statusi: produkt.statusi,
      cmimiQira: produkt.cmimiQira,
      sasiaNeStok: produkt.sasiaNeStok,
      foto: sql<string | null>`(select ${foto.rruga} from ${foto} where ${foto.produktId} = ${produkt.id} order by ${foto.renditja} limit 1)`,
    })
    .from(produkt)
    .where(eq(produkt.biznesId, admin.biznesId))
    .orderBy(asc(produkt.renditja), asc(produkt.emri));

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-semibold">Produktet</h1>
        <Link href="/admin/produktet/i-ri" className="btn-primary">
          + Produkt i ri
        </Link>
      </div>
      {lista.length ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {lista.map((p) => (
            <Link key={p.id} href={`/admin/produktet/${p.id}`} className="card overflow-hidden transition hover:border-brand">
              <FotoOseVend src={p.foto ? urlFoto(p.foto) : null} alt={p.emri} className="aspect-square w-full" />
              <div className="space-y-1 p-3">
                <p className="truncate font-semibold">{p.emri}</p>
                <p className="text-sm text-ink-soft">
                  {p.cmimiQira != null ? formatoCmimin(p.cmimiQira, b.monedha) : "—"}
                  {p.sasiaNeStok > 1 && ` · ${p.sasiaNeStok} copë`}
                </p>
                <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-semibold ${STATUSI[p.statusi][1]}`}>
                  {STATUSI[p.statusi][0]}
                </span>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="card p-10 text-center">
          <p className="font-display text-2xl font-semibold">Ende asnjë produkt</p>
          <p className="mt-2 text-ink-soft">Shtoni dekorin e parë me foto, përmasa dhe çmim.</p>
          <Link href="/admin/produktet/i-ri" className="btn-primary mt-5">
            Shto produktin e parë
          </Link>
        </div>
      )}
    </div>
  );
}
