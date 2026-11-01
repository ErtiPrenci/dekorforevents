import Link from "next/link";
import { RreshtRezervimi } from "@/components/admin/reservation-row";
import { permbledhjaEPanelit, type RezervimNeListe } from "@/lib/admin-queries";
import { kerkoAdminin } from "@/lib/auth";
import { formatoDaten, sot } from "@/lib/dates";
import { merrBiznesinMeId } from "@/lib/tenant";

export const metadata = { title: "Paneli" };

export default async function Paneli() {
  const admin = await kerkoAdminin();
  const [b, p] = await Promise.all([merrBiznesinMeId(admin.biznesId), permbledhjaEPanelit(admin.biznesId)]);

  const hapat = [
    { bere: !!b.whatsappPronarit, teksti: "Shtoni numrin e WhatsApp për njoftimet", href: "/admin/cilesimet#biznesi" },
    { bere: !!b.adresaPunishtes, teksti: "Shtoni adresën dhe orarin e punishtes", href: "/admin/cilesimet#biznesi" },
    { bere: p.nrProdukte > 0, teksti: "Shtoni produktin e parë", href: "/admin/produktet/i-ri" },
    { bere: p.nrPush > 0, teksti: "Aktivizoni njoftimet në këtë telefon", href: "/admin/cilesimet#njoftimet" },
  ];
  const mbeten = hapat.filter((h) => !h.bere);

  return (
    <div className="space-y-6">
      <div>
        <p className="eyebrow">{formatoDaten(sot())}</p>
        <h1 className="mt-1 text-3xl font-semibold">Mirë se erdhe, {admin.emri}</h1>
      </div>

      {admin.roli === "PRONAR" && mbeten.length > 0 && (
        <section className="card border-brand/40 bg-brand-soft/40 p-5">
          <h2 className="text-lg font-semibold">Përgatitja e dyqanit</h2>
          <ul className="mt-3 space-y-2 text-sm">
            {hapat.map((h) => (
              <li key={h.teksti} className="flex items-center gap-2">
                <span className={`grid h-5 w-5 place-items-center rounded-full text-xs ${h.bere ? "bg-ok text-white" : "border border-line bg-paper"}`}>
                  {h.bere ? "✓" : ""}
                </span>
                {h.bere ? (
                  <span className="text-muted line-through">{h.teksti}</span>
                ) : (
                  <Link href={h.href} className="font-medium underline underline-offset-2">
                    {h.teksti}
                  </Link>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className={`grid grid-cols-2 gap-3 ${b.kerkonKapar ? "sm:grid-cols-4" : "sm:grid-cols-3"}`}>
        <Numer emri="Për konfirmim" n={p.aprovime.length} ton="text-info" href="/admin/rezervimet?grupi=aprovim" />
        {b.kerkonKapar && <Numer emri="Kapar në pritje" n={p.kapare.length} ton="text-warn" href="/admin/rezervimet?grupi=kapar" />}
        <Numer emri="Dorëzime (3 ditë)" n={p.dorezime.length} ton="text-ok" href="/admin/rezervimet?grupi=konfirmuar" />
        <Numer emri="Evente këtë javë" n={p.javaKjo} ton="text-ink" href="/admin/kalendari" />
      </div>

      <Seksion titulli="Presin konfirmimin tënd" bosh="Asnjë rezervim i ri." lista={p.aprovime} />
      {b.kerkonKapar && <Seksion titulli="Kapare në pritje" bosh="Asnjë kapar në pritje." lista={p.kapare} />}
      <Seksion titulli="Dorëzime në 3 ditët e ardhshme" bosh="Asnjë dorëzim i afërt." lista={p.dorezime} />
      <Seksion titulli="Dekore jashtë punishtes" bosh="Të gjitha dekoret janë në punishte." lista={p.jashte} />
    </div>
  );
}

function Numer({ emri, n, href, ton }: { emri: string; n: number; href: string; ton: string }) {
  return (
    <Link href={href} className="card p-4 transition hover:border-brand">
      <p className={`font-display text-3xl font-semibold ${n ? ton : "text-muted"}`}>{n}</p>
      <p className="text-sm text-ink-soft">{emri}</p>
    </Link>
  );
}

function Seksion({ titulli, bosh, lista }: { titulli: string; bosh: string; lista: RezervimNeListe[] }) {
  return (
    <section>
      <h2 className="mb-2 text-lg font-semibold">{titulli}</h2>
      {lista.length ? (
        <div className="card divide-y divide-line overflow-hidden">
          {lista.map((r) => (
            <RreshtRezervimi key={r.id} r={r} />
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted">{bosh}</p>
      )}
    </section>
  );
}
