import Link from "next/link";
import { notFound } from "next/navigation";
import { Dergo, FormaVeprimi } from "@/components/admin/action-form";
import { FotoOseVend, Ngjyra, StatusBadge } from "@/components/ui";
import { kerkoAdminin } from "@/lib/auth";
import { formatoDaten, formatoKohen, koheEMbetur } from "@/lib/dates";
import { formatoCmimin } from "@/lib/format";
import { mesazhiPerKlientin } from "@/lib/messages";
import { lidhjeWhatsApp, shfaqTelefonin } from "@/lib/phone";
import { bilanci, EMRAT_E_STATUSEVE, flamujtEKlientit, merrRezervimin } from "@/lib/reservations";
import { urlFoto } from "@/lib/storage";
import { merrBiznesinMeId } from "@/lib/tenant";
import * as v from "./actions";

export const metadata = { title: "Rezervimi" };

const LLOJET_E_PAGESES = {
  KAPAR: "Kapar",
  MBETJE: "Pagesë",
  GARANCI: "Garanci e marrë",
  KTHIM_GARANCIE: "Garanci e kthyer",
} as const;

export default async function DetajetERezervimit({ params }: { params: Promise<{ id: string }> }) {
  const admin = await kerkoAdminin();
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const [r, b] = await Promise.all([merrRezervimin(admin.biznesId, id), merrBiznesinMeId(admin.biznesId)]);
  if (!r) notFound();
  const flamujt = await flamujtEKlientit(admin.biznesId, r.klientId, r.id);
  const bil = bilanci(r, r.pagesat);
  const m = (n: number) => formatoCmimin(n, b.monedha);
  const appUrl = (process.env.APP_URL ?? "http://localhost:3000").replace(/\/$/, "");
  const mesazhi = mesazhiPerKlientin(r, r.klient.emri, b, appUrl);
  const s = r.statusi;

  return (
    <div className="space-y-6">
      <Link href="/admin/rezervimet" className="text-sm text-ink-soft hover:text-ink">
        ← Rezervimet
      </Link>

      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="font-mono text-2xl font-semibold">{r.kodi}</h1>
            <StatusBadge statusi={s} />
          </div>
          <p className="mt-1 text-lg">{formatoDaten(r.dataEventit)}</p>
          {r.llojiEventit && <p className="text-sm text-ink-soft">{r.llojiEventit}</p>}
          {s === "NE_PRITJE_TE_KAPARIT" && r.mbahetDeri && (
            <p className="mt-1 text-sm font-medium text-warn">
              Kapari deri më {formatoKohen(r.mbahetDeri)} · {koheEMbetur(r.mbahetDeri)}
            </p>
          )}
        </div>
        <div className="no-print flex flex-wrap gap-2">
          <a href={lidhjeWhatsApp(r.klient.telefoni, mesazhi)} target="_blank" rel="noopener noreferrer" className="btn-brand btn-sm">
            Njofto klientin
          </a>
          <Link href={`/admin/fature/${r.id}`} target="_blank" className="btn-ghost btn-sm">
            Faturë
          </Link>
          <Link href={`/admin/flete-pune/${r.id}`} target="_blank" className="btn-ghost btn-sm">
            Fletë pune
          </Link>
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
        <div className="space-y-6">
          <Veprimet key={r.statusi} r={r} kerkonKapar={b.kerkonKapar} kapari={r.kapari} garancia={r.garancia} m={m} />

          <section>
            <h2 className="mb-2 text-lg font-semibold">Dekoret</h2>
            <ul className="card divide-y divide-line">
              {r.rreshtat.map((x) => {
                const foto = x.produkt.fotot[0];
                return (
                  <li key={x.id} className="flex gap-4 p-4">
                    <FotoOseVend
                      src={foto ? urlFoto(foto.rruga) : null}
                      alt={x.emriProduktit}
                      className="h-20 w-16 shrink-0 rounded-lg"
                    />
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex justify-between gap-2">
                        <p className="font-semibold">
                          {x.sasia > 1 && `${x.sasia}× `}
                          {x.emriProduktit}
                        </p>
                        <p className="shrink-0 font-semibold">{m(x.cmimiNjesi * x.sasia)}</p>
                      </div>
                      {x.zgjedhjet.map((z, i) => (
                        <p key={i} className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-sm">
                          <Ngjyra hex={z.hex} madhesia={16} />
                          <span className="shrink-0 text-ink-soft">{z.opsioni}:</span>
                          <strong>{z.vlera}</strong>
                          {z.eshteNgjyreTjeter && <span className="rounded-full bg-info-soft px-2 text-xs text-info">ngjyrë tjetër</span>}
                          {z.diteShtese > 0 && <span className="text-xs text-muted">+{z.diteShtese} ditë</span>}
                        </p>
                      ))}
                      {x.shenimi && <p className="rounded-lg bg-cream p-2 text-sm">📝 {x.shenimi}</p>}
                      {x.fotot.length > 0 && (
                        <div className="flex gap-2 pt-1">
                          {x.fotot.map((f) => (
                            <a key={f.id} href={urlFoto(f.rruga)} target="_blank" className="block h-16 w-16 overflow-hidden rounded-lg">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img src={urlFoto(f.rruga)} alt="Foto frymëzimi" className="h-full w-full object-cover" />
                            </a>
                          ))}
                        </div>
                      )}
                      <p className="text-xs text-muted">
                        Bllokuar: {formatoDaten(x.dritarjaNga, false)} – {formatoDaten(x.dritarjaDeri, false)}
                      </p>
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>

          {r.shenimeKlienti && (
            <section className="card p-4">
              <p className="eyebrow">Shënimi i klientit</p>
              <p className="mt-1 whitespace-pre-line">{r.shenimeKlienti}</p>
            </section>
          )}

          <section>
            <h2 className="mb-2 text-lg font-semibold">Historiku</h2>
            <ol className="space-y-2 border-l-2 border-line pl-4 text-sm">
              {r.historiku.map((h) => (
                <li key={h.id}>
                  <p className="font-medium">{EMRAT_E_STATUSEVE[h.neStatusi]}</p>
                  <p className="text-xs text-muted">
                    {formatoKohen(h.krijuarMe)}
                    {h.shenim && ` · ${h.shenim}`}
                  </p>
                </li>
              ))}
            </ol>
          </section>
        </div>

        <aside className="space-y-4">
          <section className="card space-y-2 p-4">
            <p className="eyebrow">Klienti</p>
            <p className="text-lg font-semibold">{r.klient.emri}</p>
            <p>{shfaqTelefonin(r.klient.telefoni)}</p>
            <div className="flex gap-2 pt-1">
              <a href={`tel:${r.klient.telefoni}`} className="btn-ghost btn-sm">
                Telefono
              </a>
              <a href={lidhjeWhatsApp(r.klient.telefoni)} target="_blank" rel="noopener noreferrer" className="btn-ghost btn-sm">
                WhatsApp
              </a>
            </div>
            {(flamujt.paPaguar > 0 || flamujt.skaduar > 0 || flamujt.mosparaqitje > 0 || r.klient.numriMosparaqitjeve > 0) && (
              <div className="mt-2 space-y-1 rounded-xl bg-warn-soft p-3 text-sm text-warn">
                {flamujt.paPaguar > 0 && <p>⚠️ {flamujt.paPaguar} rezervim(e) të tjera të pakonfirmuara</p>}
                {flamujt.skaduar > 0 && <p>⚠️ {flamujt.skaduar} rezervim(e) të mëparshme i skaduan</p>}
                {flamujt.mosparaqitje > 0 && <p>⚠️ Nuk erdhi {flamujt.mosparaqitje} herë — telefonojeni para se ta konfirmoni.</p>}
              </div>
            )}
          </section>

          <section className="card space-y-1 p-4 text-sm">
            <p className="eyebrow mb-1">Dorëzimi</p>
            <p className="font-medium">{r.menyraDorezimit === "DERGESE" ? "Dërgesë dhe montim" : "E merr në punishte"}</p>
            {r.adresaDorezimit && <p className="text-ink-soft">{r.adresaDorezimit}</p>}
            {r.llojiEventit && <p className="text-ink-soft">Eventi: {r.llojiEventit}</p>}
          </section>

          <section className="card space-y-1.5 p-4 text-sm">
            <p className="eyebrow mb-1">Pagesat</p>
            <Rresht emri="Dekoret" vlera={m(r.nentotali)} />
            <Rresht emri="Transporti" vlera={m(r.tarifaTransportit)} />
            <Rresht emri="Totali" vlera={m(bil.totali)} theks />
            {r.kapari > 0 && <Rresht emri="Kapari" vlera={m(r.kapari)} />}
            <Rresht emri="Paguar deri tani" vlera={m(bil.paguar)} />
            <Rresht emri="Mbetja" vlera={m(bil.mbetja)} theks />
            {(r.garancia > 0 || bil.garanciaMbajtur > 0) && (
              <Rresht emri="Garancia e mbajtur" vlera={`${m(bil.garanciaMbajtur)} / ${m(r.garancia)}`} />
            )}
            {r.pagesat.length > 0 && (
              <ul className="mt-2 space-y-1 border-t border-line pt-2 text-xs text-ink-soft">
                {r.pagesat.map((p) => (
                  <li key={p.id} className="flex justify-between">
                    <span>
                      {LLOJET_E_PAGESES[p.lloji]} · {formatoKohen(p.krijuarMe)}
                    </span>
                    <span className="flex items-center gap-2">
                      {p.lloji === "KTHIM_GARANCIE" ? "−" : ""}
                      {m(p.shuma)}
                      {(p.lloji === "KAPAR" || p.lloji === "MBETJE") && (
                        <Link href={`/admin/fature/${r.id}?pagese=${p.id}`} target="_blank" className="font-medium text-ink underline">
                          Printo
                        </Link>
                      )}
                    </span>
                  </li>
                ))}
              </ul>
            )}
            {["KONFIRMUAR", "DOREZUAR", "PERFUNDUAR", "MOSPARAQITJE"].includes(s) && (
              <FormaVeprimi veprimi={v.pagese.bind(null, r.id)} className="mt-3 space-y-2 border-t border-line pt-3" pastroPasSuksesit>
                <div className="flex gap-2">
                  <select name="lloji" className="input !py-2" defaultValue="MBETJE">
                    <option value="MBETJE">Pagesë</option>
                    <option value="GARANCI">Garanci e marrë</option>
                    <option value="KTHIM_GARANCIE">Garanci e kthyer</option>
                  </select>
                  <input name="shuma" inputMode="numeric" className="input !py-2" placeholder="Shuma" required defaultValue={bil.mbetja || ""} />
                </div>
                <Dergo className="btn-ghost btn-sm w-full">Regjistro pagesën në kesh</Dergo>
              </FormaVeprimi>
            )}
          </section>

          <section className="card p-4">
            <p className="eyebrow mb-2">Shënime të brendshme</p>
            <FormaVeprimi veprimi={v.detajet.bind(null, r.id)} className="space-y-2">
              <textarea name="shenime" className="input min-h-20 text-sm" defaultValue={r.shenimeBrendshme ?? ""}  />
              <input type="hidden" name="transporti" value={r.tarifaTransportit} />
              <Dergo className="btn-ghost btn-sm">Ruaj</Dergo>
            </FormaVeprimi>
          </section>
        </aside>
      </div>
    </div>
  );
}

function Rresht({ emri, vlera, theks }: { emri: string; vlera: string; theks?: boolean }) {
  return (
    <p className={`flex justify-between ${theks ? "font-semibold" : ""}`}>
      <span className={theks ? "" : "text-ink-soft"}>{emri}</span>
      <span>{vlera}</span>
    </p>
  );
}

type R = NonNullable<Awaited<ReturnType<typeof merrRezervimin>>>;

function Veprimet({
  r,
  kerkonKapar,
  kapari,
  garancia,
  m,
}: {
  r: R;
  kerkonKapar: boolean;
  kapari: number;
  garancia: number;
  m: (n: number) => string;
}) {
  const s = r.statusi;
  const id = r.id;

  if (s === "NE_PRITJE_TE_APROVIMIT") {
    return (
      <section className="card space-y-4 border-info/40 p-5">
        <div>
          <h2 className="text-lg font-semibold">{kerkonKapar ? "Cakto çmimin dhe aprovo" : "Konfirmo rezervimin"}</h2>
          <p className="text-sm text-ink-soft">
            {kerkonAprovim(r)
              ? "Kontrollo ngjyrat dhe shënimet, ndrysho çmimin nëse duhet, pastaj konfirmo."
              : "Kontrollo datën dhe klientin (mund ta telefonosh), pastaj konfirmo."}
          </p>
        </div>
        <FormaVeprimi veprimi={v.aprovo.bind(null, id)} className="space-y-3">
          {r.rreshtat.map((x) => (
            <label key={x.id} className="flex items-center justify-between gap-3 text-sm">
              <span>
                {x.sasia > 1 && `${x.sasia}× `}
                {x.emriProduktit}
                {x.kerkonAprovim && <span className="ml-1 text-info">⚠️</span>}
              </span>
              <input name={`cmimi-${x.id}`} inputMode="numeric" className="input !w-32 text-right" defaultValue={x.cmimiNjesi} />
            </label>
          ))}
          {r.menyraDorezimit === "DERGESE" && (
            <label className="flex items-center justify-between gap-3 text-sm">
              <span>Transporti</span>
              <input name="transporti" inputMode="numeric" className="input !w-32 text-right" defaultValue={r.tarifaTransportit || ""} />
            </label>
          )}
          <Dergo className="btn-primary w-full">{kerkonKapar ? "Aprovo" : "Konfirmo ✓"}</Dergo>
        </FormaVeprimi>
        <Refuzo id={id} />
      </section>
    );
  }

  if (s === "NE_PRITJE_TE_KAPARIT" || s === "SKADUAR") {
    return (
      <section className={`card space-y-4 p-5 ${s === "SKADUAR" ? "" : "border-warn/40"}`}>
        <h2 className="text-lg font-semibold">{s === "SKADUAR" ? "Afati skadoi" : `Kapari: ${m(kapari)}`}</h2>
        <FormaVeprimi veprimi={v.kapariUPagua.bind(null, id)} className="flex flex-wrap items-end gap-2">
          <label className="block flex-1">
            <span className="label">Shuma</span>
            <input name="shuma" inputMode="numeric" className="input" defaultValue={kapari} required />
          </label>
          <Dergo className="btn-primary">U pagua ✓</Dergo>
        </FormaVeprimi>
        <div className="flex flex-wrap gap-2 border-t border-line pt-4">
          <FormaVeprimi veprimi={v.zgjat.bind(null, id)} className="flex gap-2">
            <select name="ore" className="input !w-auto !py-1.5 text-sm" defaultValue="24">
              <option value="12">+12 orë</option>
              <option value="24">+24 orë</option>
              <option value="48">+48 orë</option>
              <option value="72">+3 ditë</option>
            </select>
            <Dergo className="btn-ghost btn-sm">Zgjat afatin</Dergo>
          </FormaVeprimi>
        </div>
        {s === "NE_PRITJE_TE_KAPARIT" && <Refuzo id={id} />}
      </section>
    );
  }

  if (s === "KONFIRMUAR") {
    return (
      <section className="card space-y-4 border-ok/40 p-5">
        <div>
          <h2 className="text-lg font-semibold">Gati për dorëzim</h2>
          <p className="text-sm text-ink-soft">Kur klienti merr dekorin, regjistro garancinë (nëse ka) dhe shëno dorëzimin.</p>
        </div>
        <FormaVeprimi veprimi={v.dorezuar.bind(null, id)} className="flex flex-wrap items-end gap-2">
          {garancia > 0 && (
            <label className="block flex-1">
              <span className="label">Garancia e marrë në kesh</span>
              <input name="garancia" inputMode="numeric" className="input" defaultValue={garancia} />
            </label>
          )}
          <Dergo className="btn-primary">Shëno si të dorëzuar</Dergo>
        </FormaVeprimi>
        <div className="flex flex-wrap gap-2 border-t border-line pt-4">
          <FormaVeprimi veprimi={v.mosparaqitje.bind(null, id)} konfirmim="Klienti nuk erdhi? Kapari mbahet dhe klienti shënohet.">
            <Dergo className="btn-ghost btn-sm">Klienti nuk erdhi</Dergo>
          </FormaVeprimi>
          <FormaVeprimi veprimi={v.anulo.bind(null, id)} konfirmim="Ta anuloj këtë rezervim? Data lirohet.">
            <input type="hidden" name="shenim" value="Anuluar nga punishtja" />
            <Dergo className="btn-danger btn-sm">Anulo</Dergo>
          </FormaVeprimi>
        </div>
      </section>
    );
  }

  if (s === "DOREZUAR") {
    return (
      <section className="card space-y-3 border-brand/40 p-5">
        <h2 className="text-lg font-semibold">Dekori është jashtë punishtes</h2>
        <p className="text-sm text-ink-soft">Kur kthehet dhe kontrollohet, shënoje këtu. Mos harro kthimin e garancisë te Pagesat.</p>
        <FormaVeprimi veprimi={v.kthyer.bind(null, id)}>
          <Dergo className="btn-primary">Dekori u kthye</Dergo>
        </FormaVeprimi>
      </section>
    );
  }

  return null;
}

function kerkonAprovim(r: R) {
  return r.rreshtat.some((x) => x.kerkonAprovim);
}

function Refuzo({ id }: { id: string }) {
  return (
    <details className="border-t border-line pt-3 text-sm">
      <summary className="cursor-pointer text-ink-soft">Refuzo rezervimin</summary>
      <FormaVeprimi veprimi={v.refuzo.bind(null, id)} konfirmim="Ta refuzoj rezervimin? Data lirohet." className="mt-3 space-y-2">
        <input name="arsyeja" className="input" placeholder="Arsyeja (klienti e sheh)" maxLength={200} />
        <Dergo className="btn-danger btn-sm">Refuzo</Dergo>
      </FormaVeprimi>
    </details>
  );
}
