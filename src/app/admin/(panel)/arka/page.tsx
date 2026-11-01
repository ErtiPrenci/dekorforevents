import Link from "next/link";
import { kerkoPronarin } from "@/lib/auth";
import { EMRAT_E_PAGESAVE, pagesatEMuajit } from "@/lib/cash";
import { emriMuajit, formatoKohen, sot } from "@/lib/dates";
import { formatoCmimin } from "@/lib/format";
import { merrBiznesinMeId } from "@/lib/tenant";

export const metadata = { title: "Arka" };

export default async function Arka({ searchParams }: { searchParams: Promise<{ muaji?: string }> }) {
  const admin = await kerkoPronarin();
  const { muaji: m } = await searchParams;
  const muaji = m && /^\d{4}-(0[1-9]|1[0-2])$/.test(m) ? m : sot().slice(0, 7);
  const [y, mm] = muaji.split("-").map(Number);
  const levize = (d: number) => new Date(Date.UTC(y, mm - 1 + d, 1)).toISOString().slice(0, 7);
  const [b, { rreshtat, totalet, teArdhurat }] = await Promise.all([merrBiznesinMeId(admin.biznesId), pagesatEMuajit(admin.biznesId, muaji)]);
  const f = (n: number) => formatoCmimin(n, b.monedha);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl font-semibold">
          Arka · <span className="capitalize">{emriMuajit(mm)}</span> {y}
        </h1>
        <div className="flex flex-wrap gap-2">
          <Link href={`/admin/arka?muaji=${levize(-1)}`} className="btn-ghost btn-sm">
            ‹ Para
          </Link>
          <Link href={`/admin/arka?muaji=${levize(1)}`} className="btn-ghost btn-sm">
            Pas ›
          </Link>
          <a href={`/admin/arka/eksport?muaji=${muaji}`} className="btn-ghost btn-sm">
            Shkarko CSV
          </a>
        </div>
      </div>

      <div className={`grid grid-cols-2 gap-3 ${b.kerkonKapar ? "sm:grid-cols-4" : ""}`}>
        <Kuti emri="Të ardhura" vlera={f(teArdhurat)} theks />
        {b.kerkonKapar && <Kuti emri="Kapare" vlera={f(totalet.kapare)} />}
        {b.kerkonKapar && <Kuti emri="Pagesa" vlera={f(totalet.mbetje)} />}
        <Kuti emri="Garanci në dorë" vlera={f(totalet.garanciMarre - totalet.garanciKthyer)} />
      </div>
      <p className="text-xs text-muted">
        Garancitë nuk llogariten si të ardhura.
      </p>

      {rreshtat.length ? (
        <div className="card divide-y divide-line overflow-hidden">
          {rreshtat.map((r) => (
            <Link key={r.id} href={`/admin/rezervimet/${r.rezervimId}`} className="flex items-center gap-3 px-4 py-3 text-sm hover:bg-cream">
              <div className="min-w-0 flex-1">
                <p className="font-medium">
                  {EMRAT_E_PAGESAVE[r.lloji]} · <span className="font-mono">{r.kodi}</span>
                </p>
                <p className="truncate text-xs text-muted">
                  {r.klienti} · {formatoKohen(r.krijuarMe)}
                  {r.regjistruarNga && ` · ${r.regjistruarNga}`}
                  {r.shenim && ` · ${r.shenim}`}
                </p>
              </div>
              <p className={`shrink-0 font-semibold ${r.lloji === "KTHIM_GARANCIE" ? "text-bad" : ""}`}>
                {r.lloji === "KTHIM_GARANCIE" ? "−" : ""}
                {f(r.shuma)}
              </p>
            </Link>
          ))}
        </div>
      ) : (
        <p className="card p-8 text-center text-ink-soft">Asnjë pagesë e regjistruar këtë muaj.</p>
      )}
    </div>
  );
}

function Kuti({ emri, vlera, theks }: { emri: string; vlera: string; theks?: boolean }) {
  return (
    <div className={`card p-4 ${theks ? "border-ink" : ""}`}>
      <p className="font-display text-2xl font-semibold">{vlera}</p>
      <p className="text-sm text-ink-soft">{emri}</p>
    </div>
  );
}
