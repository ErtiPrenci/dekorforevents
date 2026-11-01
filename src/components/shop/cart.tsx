"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ZgjedhjeHyrese } from "@/lib/options";

// A reservation is a cart for ONE event: one date, any number of items
// (docs/PLAN.md §7). The cart lives in the browser until it is submitted;
// the server re-validates everything.

export type ArtikullShporte = {
  celes: string;
  produktId: string;
  slug: string;
  emri: string;
  foto: string | null;
  sasia: number;
  maxSasia: number;
  zgjedhjet: ZgjedhjeHyrese[];
  pershkrimi: string;
  shenimi: string;
  cmimiNjesi: number;
  diteShtese: number;
  kerkonAprovim: boolean;
};

export type Shporta = { dataEventit: string | null; artikujt: ArtikullShporte[] };

type Ctx = {
  shporta: Shporta;
  gati: boolean;
  vendosDaten: (data: string | null) => void;
  shto: (a: Omit<ArtikullShporte, "celes">) => void;
  ndrysho: (celes: string, ndryshime: Partial<ArtikullShporte>) => void;
  hiq: (celes: string) => void;
  pastro: () => void;
};

const ShportaCtx = createContext<Ctx | null>(null);
const BOSH: Shporta = { dataEventit: null, artikujt: [] };

export function ShportaProvider({ celesi, children }: { celesi: string; children: React.ReactNode }) {
  const storageKey = `shporta:${celesi}`;
  const [shporta, setShporta] = useState<Shporta>(BOSH);
  const [gati, setGati] = useState(false);

  useEffect(() => {
    try {
      const ruajtur = localStorage.getItem(storageKey);
      if (ruajtur) setShporta({ ...BOSH, ...JSON.parse(ruajtur) });
    } catch {}
    setGati(true);
  }, [storageKey]);

  const ruaj = useCallback(
    (fn: (s: Shporta) => Shporta) =>
      setShporta((s) => {
        const e_re = fn(s);
        try {
          localStorage.setItem(storageKey, JSON.stringify(e_re));
        } catch {}
        return e_re;
      }),
    [storageKey],
  );

  const vlera = useMemo<Ctx>(
    () => ({
      shporta,
      gati,
      vendosDaten: (dataEventit) => ruaj((s) => ({ ...s, dataEventit })),
      shto: (a) => ruaj((s) => ({ ...s, artikujt: [...s.artikujt, { ...a, celes: crypto.randomUUID() }] })),
      ndrysho: (celes, n) =>
        ruaj((s) => ({ ...s, artikujt: s.artikujt.map((a) => (a.celes === celes ? { ...a, ...n } : a)) })),
      hiq: (celes) => ruaj((s) => ({ ...s, artikujt: s.artikujt.filter((a) => a.celes !== celes) })),
      pastro: () => ruaj(() => BOSH),
    }),
    [shporta, gati, ruaj],
  );

  return <ShportaCtx.Provider value={vlera}>{children}</ShportaCtx.Provider>;
}

export function useShporta() {
  const c = useContext(ShportaCtx);
  if (!c) throw new Error("useShporta must be used inside ShportaProvider");
  return c;
}

export function ButoniShportes() {
  const { shporta, gati } = useShporta();
  const n = shporta.artikujt.reduce((s, a) => s + a.sasia, 0);
  return (
    <a href="/shporta" className="btn-primary btn-sm relative">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
        <rect x="3" y="5" width="18" height="16" rx="2" />
        <path d="M3 10h18M8 3v4M16 3v4" />
      </svg>
      Rezervimi
      {gati && n > 0 && (
        <span className="grid h-5 min-w-5 place-items-center rounded-full bg-brand px-1 text-[11px] font-bold text-ink">
          {n}
        </span>
      )}
    </a>
  );
}

/** Clears the cart once a reservation was created (rendered on the confirmation page). */
export function PastroShportenPasRezervimit() {
  const { pastro, gati } = useShporta();
  useEffect(() => {
    if (gati) pastro();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gati]);
  return null;
}
