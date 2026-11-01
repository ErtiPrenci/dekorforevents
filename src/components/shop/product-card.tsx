import Link from "next/link";
import { FotoOseVend } from "@/components/ui";
import type { ProduktKarte } from "@/lib/catalog";
import { formatoCmimin, formatoPermasat, type Monedha } from "@/lib/format";
import { urlFoto } from "@/lib/storage";

export function KarteProdukti({
  p,
  monedha,
  data,
  iLire,
}: {
  p: ProduktKarte;
  monedha: Monedha;
  data?: string;
  iLire?: boolean;
}) {
  const permasat = formatoPermasat(p);
  const iZene = data != null && !iLire;
  return (
    <Link
      href={`/produkti/${p.slug}${data ? `?data=${data}` : ""}`}
      className={`group card overflow-hidden transition hover:-translate-y-0.5 hover:shadow-lg hover:shadow-ink/5 ${iZene ? "opacity-60" : ""}`}
    >
      <div className="relative aspect-[4/5] overflow-hidden bg-brand-soft">
        <FotoOseVend
          src={p.foto ? urlFoto(p.foto) : null}
          alt={p.emri}
          className="h-full w-full transition duration-500 group-hover:scale-[1.03]"
        />
        {data != null && (
          <span
            className={`absolute left-3 top-3 rounded-full px-2.5 py-1 text-xs font-semibold ${
              iLire ? "bg-ok-soft text-ok" : "bg-paper/90 text-ink-soft"
            }`}
          >
            {iLire ? "I lirë" : "I zënë"}
          </span>
        )}
        {p.statusi === "NE_MIREMBAJTJE" && (
          <span className="absolute left-3 top-3 rounded-full bg-paper/90 px-2.5 py-1 text-xs font-semibold text-ink-soft">
            Në mirëmbajtje
          </span>
        )}
      </div>
      <div className="space-y-1 p-4">
        {p.kategoria && <p className="eyebrow">{p.kategoria}</p>}
        <h3 className="text-lg font-semibold leading-tight">{p.emri}</h3>
        <p className="pt-1 text-sm">
          {p.cmimiQira != null ? (
            <>
              <span className="font-semibold">{formatoCmimin(p.cmimiQira, monedha)}</span>
              <span className="text-muted"> / event</span>
            </>
          ) : (
            <span className="text-muted">Me porosi</span>
          )}
        </p>
        {permasat && <p className="text-xs text-muted">{permasat}</p>}
        {(p.kaNgjyra || p.sasiaNeStok > 1) && (
          <p className="text-xs text-muted">
            {[p.kaNgjyra && "Zgjidhni ngjyrën", p.sasiaNeStok > 1 && `${p.sasiaNeStok} copë`].filter(Boolean).join(" · ")}
          </p>
        )}
      </div>
    </Link>
  );
}
