import { notFound } from "next/navigation";
import { FotoOseVend } from "@/components/ui";
import { kerkoAdminin } from "@/lib/auth";
import { formatoDaten } from "@/lib/dates";
import { shfaqTelefonin } from "@/lib/phone";
import { merrRezervimin } from "@/lib/reservations";
import { urlFoto } from "@/lib/storage";
import { merrBiznesinMeId } from "@/lib/tenant";
import { ButoniPrint } from "./print-button";

export const metadata = { title: "Fletë pune", robots: { index: false } };

// One printable sheet per item: what to build/paint, for whom, by when (docs/PLAN.md §4b).
export default async function FletePune({ params }: { params: Promise<{ id: string }> }) {
  const admin = await kerkoAdminin();
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const [r, b] = await Promise.all([merrRezervimin(admin.biznesId, id), merrBiznesinMeId(admin.biznesId)]);
  if (!r) notFound();

  return (
    <div className="mx-auto max-w-3xl space-y-6 bg-white p-6 print:p-0">
      <div className="no-print flex justify-between">
        <a href={`/admin/rezervimet/${r.id}`} className="text-sm text-ink-soft">
          ← Kthehu
        </a>
        <ButoniPrint />
      </div>

      {r.rreshtat.map((x, i) => {
        const foto = x.produkt.fotot[0];
        const ngjyrat = x.zgjedhjet.filter((z) => z.lloji === "NGJYRE");
        const tjerat = x.zgjedhjet.filter((z) => z.lloji !== "NGJYRE");
        return (
          <article key={x.id} className={`rounded-2xl border-2 border-ink p-6 ${i > 0 ? "break-before-page" : ""}`}>
            <header className="flex items-start justify-between gap-4 border-b-2 border-ink pb-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-muted">{b.emri} · Fletë pune</p>
                <h1 className="mt-1 text-3xl font-semibold">
                  {x.sasia > 1 && `${x.sasia}× `}
                  {x.emriProduktit}
                </h1>
              </div>
              <div className="text-right">
                <p className="font-mono text-xl font-bold">{r.kodi}</p>
                <p className="text-sm">
                  {i + 1} / {r.rreshtat.length}
                </p>
              </div>
            </header>

            <div className="mt-5 grid gap-6 sm:grid-cols-[200px_1fr]">
              <FotoOseVend src={foto ? urlFoto(foto.rruga) : null} alt={x.emriProduktit} className="aspect-[4/5] w-full rounded-xl" />
              <div className="space-y-5">
                <dl className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <dt className="text-muted">Data e eventit</dt>
                    <dd className="text-lg font-semibold">{formatoDaten(r.dataEventit)}</dd>
                  </div>
                  <div>
                    <dt className="text-muted">Gati deri më</dt>
                    <dd className="text-lg font-semibold">{formatoDaten(x.dritarjaNga)}</dd>
                  </div>
                  <div>
                    <dt className="text-muted">Klienti</dt>
                    <dd className="font-semibold">
                      {r.klient.emri} · {shfaqTelefonin(r.klient.telefoni)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-muted">Dorëzimi</dt>
                    <dd className="font-semibold">{r.menyraDorezimit === "DERGESE" ? r.adresaDorezimit : "Merret në punishte"}</dd>
                  </div>
                </dl>

                {ngjyrat.map((z, j) => (
                  <div key={j} className="flex items-center gap-4">
                    <span
                      className="h-20 w-20 shrink-0 rounded-2xl border-2 border-ink"
                      style={{ background: z.hex ?? "repeating-linear-gradient(45deg,#fff,#fff 6px,#eee 6px,#eee 12px)" }}
                    />
                    <div>
                      <p className="text-sm text-muted">{z.opsioni}</p>
                      <p className="text-2xl font-semibold">{z.vlera}</p>
                      {z.hex && <p className="font-mono text-sm">{z.hex.toUpperCase()}</p>}
                      {z.eshteNgjyreTjeter && <p className="text-sm font-semibold">Ngjyrë e veçantë — sipas përshkrimit</p>}
                    </div>
                  </div>
                ))}

                {tjerat.map((z, j) => (
                  <div key={j}>
                    <p className="text-sm text-muted">{z.opsioni}</p>
                    <p className="font-mono text-4xl font-bold tracking-wide">{z.vlera}</p>
                  </div>
                ))}
              </div>
            </div>

            {x.shenimi && (
              <div className="mt-5 rounded-xl border border-ink/30 p-4">
                <p className="text-sm font-semibold">Shënimi i klientit</p>
                <p className="mt-1 whitespace-pre-line">{x.shenimi}</p>
              </div>
            )}
            {x.fotot.length > 0 && (
              <div className="mt-4 grid grid-cols-3 gap-3">
                {x.fotot.map((f) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img key={f.id} src={urlFoto(f.rruga)} alt="Foto frymëzimi" className="aspect-square w-full rounded-xl object-cover" />
                ))}
              </div>
            )}
            {r.shenimeKlienti && i === 0 && (
              <p className="mt-4 text-sm">
                <strong>Për gjithë eventin:</strong> {r.shenimeKlienti}
              </p>
            )}
          </article>
        );
      })}
    </div>
  );
}
