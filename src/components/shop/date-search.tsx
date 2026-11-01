"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useShporta } from "./cart";

/** Date-first browsing: pick the event date, see only what is free (docs/PLAN.md §12). */
export function KerkimMeDate({ dataFillestare, min, kompakt = false }: { dataFillestare?: string; min: string; kompakt?: boolean }) {
  const router = useRouter();
  const { shporta, vendosDaten } = useShporta();
  const [data, setData] = useState(dataFillestare ?? "");
  const vlera = data || shporta.dataEventit || "";

  return (
    <form
      className={`flex w-full flex-col gap-2 sm:flex-row ${kompakt ? "" : "rounded-2xl bg-paper p-2 shadow-xl shadow-ink/5 ring-1 ring-line"}`}
      onSubmit={(e) => {
        e.preventDefault();
        if (!vlera) return;
        if (!shporta.artikujt.length) vendosDaten(vlera);
        router.push(`/katalogu?data=${vlera}`);
      }}
    >
      <label className="flex flex-1 items-center gap-3 rounded-xl px-3 py-2 ring-1 ring-transparent focus-within:ring-brand sm:ring-0">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="shrink-0 text-muted" aria-hidden>
          <rect x="3" y="5" width="18" height="16" rx="2" />
          <path d="M3 10h18M8 3v4M16 3v4" />
        </svg>
        <span className="flex flex-1 flex-col">
          <span className="text-xs font-medium text-muted">Data e eventit</span>
          <input
            type="date"
            required
            min={min}
            value={vlera}
            onChange={(e) => setData(e.target.value)}
            className="bg-transparent text-[15px] font-medium outline-none"
          />
        </span>
      </label>
      <button type="submit" className="btn-primary sm:px-7">
        Shiko çfarë është e lirë
      </button>
    </form>
  );
}
