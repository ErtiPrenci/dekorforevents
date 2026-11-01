import Link from "next/link";
import { StatusBadge } from "@/components/ui";
import type { RezervimNeListe } from "@/lib/admin-queries";
import { formatoDaten, koheEMbetur } from "@/lib/dates";
import { shfaqTelefonin } from "@/lib/phone";

export function RreshtRezervimi({ r }: { r: RezervimNeListe }) {
  const artikujt = r.rreshtat.map((x) => (x.sasia > 1 ? `${x.sasia}× ${x.emriProduktit}` : x.emriProduktit)).join(", ");
  return (
    <Link
      href={`/admin/rezervimet/${r.id}`}
      className="flex flex-col gap-1 px-4 py-3 transition hover:bg-cream sm:flex-row sm:items-center sm:gap-4"
    >
      <div className="w-36 shrink-0">
        <p className="font-mono text-sm font-semibold">{r.kodi}</p>
        <p className="text-xs text-muted">{formatoDaten(r.dataEventit, false)}</p>
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium">
          {r.klient.emri} <span className="font-normal text-muted">· {shfaqTelefonin(r.klient.telefoni)}</span>
        </p>
        <p className="truncate text-sm text-ink-soft">{artikujt}</p>
      </div>
      <div className="flex shrink-0 items-center gap-2 sm:flex-col sm:items-end">
        <StatusBadge statusi={r.statusi} />
        {r.statusi === "NE_PRITJE_TE_KAPARIT" && r.mbahetDeri && (
          <span className="text-xs font-medium text-warn">{koheEMbetur(r.mbahetDeri)}</span>
        )}
        {r.statusi === "NE_PRITJE_TE_APROVIMIT" && r.rreshtat.some((x) => x.kerkonAprovim) && (
          <span className="text-xs font-medium text-info">⚠️ kërkesë e veçantë</span>
        )}
      </div>
    </Link>
  );
}
