import Link from "next/link";
import { RreshtRezervimi } from "@/components/admin/reservation-row";
import { GRUPET, listoRezervimet } from "@/lib/admin-queries";
import { kerkoAdminin } from "@/lib/auth";
import { merrBiznesinMeId } from "@/lib/tenant";

export const metadata = { title: "Rezervimet" };

type Params = { grupi?: string; q?: string };

export default async function Rezervimet({ searchParams }: { searchParams: Promise<Params> }) {
  const admin = await kerkoAdminin();
  const { grupi = "aktive", q } = await searchParams;
  const [lista, b] = await Promise.all([listoRezervimet(admin.biznesId, grupi, q), merrBiznesinMeId(admin.biznesId)]);

  return (
    <div className="space-y-5">
      <h1 className="text-3xl font-semibold">Rezervimet</h1>
      <form className="flex gap-2">
        <input type="hidden" name="grupi" value={grupi} />
        <input name="q" defaultValue={q} className="input" placeholder="Kërko kod, emër ose telefon…" />
        <button className="btn-ghost">Kërko</button>
      </form>
      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
        {Object.entries(GRUPET)
          .filter(([k]) => b.kerkonKapar || k !== "kapar")
          .map(([k, g]) => (
          <Link
            key={k}
            href={`/admin/rezervimet?grupi=${k}${q ? `&q=${encodeURIComponent(q)}` : ""}`}
            className={`${k === grupi ? "chip-active" : "chip"} shrink-0`}
          >
            {g.emri}
          </Link>
        ))}
      </div>
      {lista.length ? (
        <div className="card divide-y divide-line overflow-hidden">
          {lista.map((r) => (
            <RreshtRezervimi key={r.id} r={r} />
          ))}
        </div>
      ) : (
        <p className="card p-8 text-center text-ink-soft">Asnjë rezervim këtu.</p>
      )}
    </div>
  );
}
