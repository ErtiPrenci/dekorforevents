"use client";

import { useEffect, useState } from "react";
import { DITET_SHKURT, emriMuajit, rrjetaEMuajit } from "@/lib/dates";
import type { Gjendja } from "@/lib/availability";

const STILI: Record<Gjendja, string> = {
  I_LIRE: "bg-ok-soft text-ok hover:ring-2 hover:ring-ok/40 font-semibold",
  I_ZENE: "bg-bad-soft/60 text-bad/60 line-through",
  I_BLLOKUAR: "bg-line/60 text-muted line-through",
  I_KALUAR: "text-muted/50",
  JO_AKTIV: "text-muted/50",
};

export function KalendariDisponueshmerise({
  produktId,
  zgjedhur,
  onZgjidh,
  sot,
}: {
  produktId: string;
  zgjedhur: string | null;
  onZgjidh: (data: string) => void;
  sot: string;
}) {
  const fillimi = (zgjedhur ?? sot).slice(0, 7);
  const [muaji, setMuaji] = useState(fillimi);
  const [gjendjet, setGjendjet] = useState<Record<string, Gjendja> | null>(null);
  const [gabim, setGabim] = useState(false);

  useEffect(() => {
    let anuluar = false;
    setGjendjet(null);
    setGabim(false);
    fetch(`/api/kalendari?produkt=${produktId}&muaji=${muaji}`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d) => !anuluar && setGjendjet(d))
      .catch(() => !anuluar && setGabim(true));
    return () => {
      anuluar = true;
    };
  }, [produktId, muaji]);

  const [y, m] = muaji.split("-").map(Number);
  const levize = (d: number) => {
    const t = new Date(Date.UTC(y, m - 1 + d, 1));
    setMuaji(t.toISOString().slice(0, 7));
  };
  const mundPrapa = muaji > sot.slice(0, 7);

  return (
    <div className="card p-4">
      <div className="mb-3 flex items-center justify-between">
        <button type="button" onClick={() => levize(-1)} disabled={!mundPrapa} className="btn-ghost btn-sm !px-2.5" aria-label="Muaji i kaluar">
          ‹
        </button>
        <p className="font-display text-lg font-semibold capitalize">
          {emriMuajit(m)} {y}
        </p>
        <button type="button" onClick={() => levize(1)} className="btn-ghost btn-sm !px-2.5" aria-label="Muaji tjetër">
          ›
        </button>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center text-xs font-medium text-muted">
        {DITET_SHKURT.map((d) => (
          <span key={d} className="py-1">
            {d}
          </span>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1" aria-busy={!gjendjet}>
        {rrjetaEMuajit(y, m).map((dita, i) => {
          if (!dita) return <span key={i} />;
          const g = gjendjet?.[dita];
          const eZgjedhur = dita === zgjedhur;
          return (
            <button
              key={dita}
              type="button"
              disabled={g !== "I_LIRE"}
              onClick={() => onZgjidh(dita)}
              aria-pressed={eZgjedhur}
              aria-label={`${dita}${!g ? "" : g === "I_LIRE" ? " — e lirë" : " — e zënë"}`}
              className={`aspect-square rounded-lg text-sm transition disabled:cursor-not-allowed ${
                g ? STILI[g] : "animate-pulse bg-line/40 text-transparent"
              } ${eZgjedhur ? "!bg-ink !text-white ring-2 ring-ink ring-offset-2" : ""}`}
            >
              {Number(dita.slice(8))}
            </button>
          );
        })}
      </div>
      {gabim && <p className="mt-2 text-xs text-bad">Kalendari nuk u ngarkua. Rifreskoni faqen.</p>}
      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-ink-soft">
        <span className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded bg-ok-soft ring-1 ring-ok/30" /> E lirë
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded bg-bad-soft" /> E zënë
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded bg-line" /> Punishtja e mbyllur
        </span>
      </div>
    </div>
  );
}
