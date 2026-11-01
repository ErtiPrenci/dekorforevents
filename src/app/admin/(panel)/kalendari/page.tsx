import { and, eq, gte, lte } from "drizzle-orm";
import Link from "next/link";
import { db } from "@/db";
import { bllokimDate } from "@/db/schema";
import { rezervimetEMuajit } from "@/lib/admin-queries";
import { kerkoAdminin } from "@/lib/auth";
import { DITET_SHKURT, emriMuajit, rrjetaEMuajit, sot } from "@/lib/dates";
import type { Statusi } from "@/lib/status";

export const metadata = { title: "Kalendari" };

const NGJYRA: Record<Statusi, string> = {
  NE_PRITJE_TE_APROVIMIT: "bg-info-soft text-info",
  NE_PRITJE_TE_KAPARIT: "bg-warn-soft text-warn",
  KONFIRMUAR: "bg-ok-soft text-ok",
  DOREZUAR: "bg-brand-soft text-brand-strong",
  PERFUNDUAR: "bg-line text-ink-soft",
  ANULUAR: "bg-line text-muted",
  REFUZUAR: "bg-line text-muted",
  SKADUAR: "bg-line text-muted",
  MOSPARAQITJE: "bg-line text-muted",
};

export default async function Kalendari({ searchParams }: { searchParams: Promise<{ muaji?: string }> }) {
  const admin = await kerkoAdminin();
  const dita = sot();
  const { muaji: m } = await searchParams;
  const muaji = m && /^\d{4}-(0[1-9]|1[0-2])$/.test(m) ? m : dita.slice(0, 7);
  const [y, mm] = muaji.split("-").map(Number);
  const qelizat = rrjetaEMuajit(y, mm);
  const nga = `${muaji}-01`;
  const deri = new Date(Date.UTC(y, mm, 0)).toISOString().slice(0, 10);
  const levize = (d: number) => new Date(Date.UTC(y, mm - 1 + d, 1)).toISOString().slice(0, 7);

  const [rezervimet, bllokimet] = await Promise.all([
    rezervimetEMuajit(admin.biznesId, nga, deri),
    db
      .select()
      .from(bllokimDate)
      .where(and(eq(bllokimDate.biznesId, admin.biznesId), lte(bllokimDate.nga, deri), gte(bllokimDate.deri, nga))),
  ]);
  const sipasDites = new Map<string, typeof rezervimet>();
  for (const r of rezervimet) sipasDites.set(r.dataEventit, [...(sipasDites.get(r.dataEventit) ?? []), r]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl font-semibold capitalize">
          {emriMuajit(mm)} {y}
        </h1>
        <div className="flex gap-2">
          <Link href={`/admin/kalendari?muaji=${levize(-1)}`} className="btn-ghost btn-sm">
            ‹ Para
          </Link>
          <Link href="/admin/kalendari" className="btn-ghost btn-sm">
            Sot
          </Link>
          <Link href={`/admin/kalendari?muaji=${levize(1)}`} className="btn-ghost btn-sm">
            Pas ›
          </Link>
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="grid grid-cols-7 border-b border-line bg-cream text-center text-xs font-semibold text-muted">
          {DITET_SHKURT.map((d) => (
            <div key={d} className="py-2">
              {d}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {qelizat.map((d, i) => {
            const bllokuar = d && bllokimet.some((b) => b.nga <= d && d <= b.deri && b.produktId === null);
            const lista = (d && sipasDites.get(d)) || [];
            return (
              <div
                key={i}
                className={`min-h-20 border-b border-r border-line p-1 sm:min-h-28 sm:p-1.5 ${!d ? "bg-cream/50" : ""} ${bllokuar ? "bg-line/40" : ""}`}
              >
                {d && (
                  <>
                    <p className={`text-xs font-semibold ${d === dita ? "inline-grid h-6 w-6 place-items-center rounded-full bg-ink text-white" : "text-ink-soft"}`}>
                      {Number(d.slice(8))}
                    </p>
                    {bllokuar && <p className="text-[10px] text-muted">Mbyllur</p>}
                    <div className="mt-1 space-y-1">
                      {lista.map((r) => (
                        <Link
                          key={r.id}
                          href={`/admin/rezervimet/${r.id}`}
                          className={`block truncate rounded-md px-1.5 py-0.5 text-[11px] font-medium ${NGJYRA[r.statusi]}`}
                          title={`${r.kodi} · ${r.klient.emri} · ${r.rreshtat.map((x) => x.emriProduktit).join(", ")}`}
                        >
                          <span className="hidden sm:inline">{r.klient.emri.split(" ")[0]} · </span>
                          {r.rreshtat[0]?.emriProduktit}
                          {r.rreshtat.length > 1 && ` +${r.rreshtat.length - 1}`}
                        </Link>
                      ))}
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="flex flex-wrap gap-3 text-xs text-ink-soft">
        {(["NE_PRITJE_TE_APROVIMIT", "NE_PRITJE_TE_KAPARIT", "KONFIRMUAR", "DOREZUAR", "PERFUNDUAR"] as Statusi[]).map((s) => (
          <span key={s} className={`rounded-md px-2 py-0.5 ${NGJYRA[s]}`}>
            {{ NE_PRITJE_TE_APROVIMIT: "Për aprovim", NE_PRITJE_TE_KAPARIT: "Kapar në pritje", KONFIRMUAR: "Konfirmuar", DOREZUAR: "Jashtë", PERFUNDUAR: "Përfunduar" }[s as string]}
          </span>
        ))}
      </div>
    </div>
  );
}
