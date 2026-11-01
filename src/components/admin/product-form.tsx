"use client";

import { useState } from "react";
import { Dergo, FormaVeprimi, type Rezultat } from "./action-form";

export type OpsionForme = {
  id?: string;
  lloji: "NGJYRE" | "TEKST" | "NUMER" | "ZGJEDHJE";
  emri: string;
  iDetyrueshem: boolean;
  gjatesiaMax: number | null;
  cmimiShtese: number;
  lejonNgjyreTjeter: boolean;
  vlerat: {
    id?: string;
    paletaId: string | null;
    emri: string;
    hex: string | null;
    cmimiShtese: number;
    diteShtese: number;
    fotoId: string | null;
  }[];
};

export type ProduktForme = {
  emri: string;
  pershkrimi: string | null;
  kategoriId: string | null;
  temat: string[];
  modet: string[];
  gjeresiCm: number | null;
  lartesiCm: number | null;
  thellesiCm: number | null;
  materiali: string | null;
  cmimiQira: number | null;
  cmimiPorosi: number | null;
  cmimiShitje: number | null;
  garanciaDemtimit: number;
  sasiaNeStok: number;
  diteMontimi: number;
  diteCmontimi: number;
  diteProdhimi: number | null;
  shenimetKerkojneAprovim: boolean;
  statusi: string;
};

type Ngjyre = { id: string; emri: string; hex: string; cmimiShtese: number };

const BOSH: ProduktForme = {
  emri: "",
  pershkrimi: null,
  kategoriId: null,
  temat: [],
  modet: ["RENTAL"],
  gjeresiCm: null,
  lartesiCm: null,
  thellesiCm: null,
  materiali: null,
  cmimiQira: null,
  cmimiPorosi: null,
  cmimiShitje: null,
  garanciaDemtimit: 0,
  sasiaNeStok: 1,
  diteMontimi: 1,
  diteCmontimi: 1,
  diteProdhimi: null,
  shenimetKerkojneAprovim: false,
  statusi: "AKTIV",
};

export function FormaEProduktit({
  veprimi,
  produkt,
  opsionetFillestare = [],
  kategorite,
  temat,
  paleta,
  fotot = [],
  monedha,
}: {
  veprimi: (prev: Rezultat, fd: FormData) => Promise<Rezultat>;
  produkt?: ProduktForme;
  opsionetFillestare?: OpsionForme[];
  kategorite: { id: string; emri: string }[];
  temat: { id: string; emri: string }[];
  paleta: Ngjyre[];
  fotot?: { id: string; url: string }[];
  monedha: string;
}) {
  const p = produkt ?? BOSH;
  const iRi = !produkt;
  const [modet, setModet] = useState<string[]>(p.modet);
  const [opsionet, setOpsionet] = useState<OpsionForme[]>(opsionetFillestare);
  const njesia = monedha === "EUR" ? "€" : "L";

  const shtoOpsion = (lloji: OpsionForme["lloji"]) =>
    setOpsionet((o) => [
      ...o,
      {
        lloji,
        emri: { NGJYRE: "Ngjyra", TEKST: "Emri mbi dekor", NUMER: "Mosha", ZGJEDHJE: "Madhësia" }[lloji],
        iDetyrueshem: lloji === "NGJYRE",
        gjatesiaMax: lloji === "TEKST" ? 12 : null,
        cmimiShtese: 0,
        lejonNgjyreTjeter: false,
        vlerat: [],
      },
    ]);
  const ndrysho = (i: number, n: Partial<OpsionForme>) => setOpsionet((o) => o.map((x, j) => (j === i ? { ...x, ...n } : x)));

  return (
    <FormaVeprimi veprimi={veprimi} className="space-y-6">
      <input type="hidden" name="opsionet" value={JSON.stringify(opsionet)} />

      <section className="card space-y-4 p-5">
        <h2 className="text-lg font-semibold">Të dhënat</h2>
        <label className="block">
          <span className="label">Emri *</span>
          <input name="emri" className="input" required maxLength={120} defaultValue={p.emri} placeholder="p.sh. Arkadë me valë" />
        </label>
        <label className="block">
          <span className="label">Përshkrimi</span>
          <textarea name="pershkrimi" className="input min-h-24" maxLength={3000} defaultValue={p.pershkrimi ?? ""} />
        </label>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="label">Kategoria</span>
            <select name="kategoriId" className="input" defaultValue={p.kategoriId ?? ""}>
              <option value="">—</option>
              {kategorite.map((k) => (
                <option key={k.id} value={k.id}>
                  {k.emri}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="label">Statusi</span>
            <select name="statusi" className="input" defaultValue={p.statusi}>
              <option value="AKTIV">Aktiv — duket në dyqan</option>
              <option value="NE_MIREMBAJTJE">Në mirëmbajtje — nuk rezervohet</option>
              <option value="SHITUR">Shitur</option>
              <option value="I_TERHEQUR">I tërhequr — i fshehur</option>
            </select>
          </label>
        </div>
        <fieldset>
          <legend className="label">Temat</legend>
          <div className="flex flex-wrap gap-2">
            {temat.map((t) => (
              <label key={t.id} className="chip cursor-pointer has-[:checked]:border-ink has-[:checked]:bg-ink has-[:checked]:text-white">
                <input type="checkbox" name="temat" value={t.id} defaultChecked={p.temat.includes(t.id)} className="sr-only" />
                {t.emri}
              </label>
            ))}
          </div>
        </fieldset>
        {iRi && (
          <label className="block">
            <span className="label">Fotot</span>
            <input
              type="file"
              name="fotot"
              accept="image/*"
              multiple
              className="block w-full text-sm file:mr-3 file:rounded-full file:border-0 file:bg-brand-soft file:px-4 file:py-2 file:text-sm file:font-semibold file:text-brand-strong"
            />
            <span className="mt-1 block text-xs text-muted">E para bëhet foto kryesore. Mund të shtoni më shumë më vonë.</span>
          </label>
        )}
      </section>

      <section className="card space-y-4 p-5">
        <h2 className="text-lg font-semibold">Si ofrohet dhe çmimet</h2>
        <div className="grid gap-3 sm:grid-cols-3">
          {(
            [
              ["RENTAL", "Me qira", "cmimiQira", p.cmimiQira, "për një event"],
              ["CUSTOM", "Me porosi (i ri)", "cmimiPorosi", p.cmimiPorosi, "çmimi nga"],
              ["SALE", "Në shitje", "cmimiShitje", p.cmimiShitje, "çmimi"],
            ] as const
          ).map(([m, emri, fusha, vlera, ndihme]) => (
            <div key={m} className={`rounded-xl border p-3 ${modet.includes(m) ? "border-ink" : "border-line"}`}>
              <label className="flex items-center gap-2 text-sm font-semibold">
                <input
                  type="checkbox"
                  name="modet"
                  value={m}
                  checked={modet.includes(m)}
                  onChange={(e) => setModet((s) => (e.target.checked ? [...s, m] : s.filter((x) => x !== m)))}
                />
                {emri}
              </label>
              {modet.includes(m) && (
                <label className="mt-2 block">
                  <span className="text-xs text-muted">
                    {ndihme} ({njesia})
                  </span>
                  <input name={fusha} inputMode="numeric" className="input" defaultValue={vlera ?? ""} required={m === "RENTAL"} />
                </label>
              )}
            </div>
          ))}
        </div>
        {modet.includes("RENTAL") && (
          <div className="grid gap-4 sm:grid-cols-4">
            <Numer name="sasiaNeStok" emri="Sa copë keni" vlera={p.sasiaNeStok} />
            <Numer name="diteMontimi" emri="Ditë para eventit" vlera={p.diteMontimi} ndihme="transport, montim" />
            <Numer name="diteCmontimi" emri="Ditë pas eventit" vlera={p.diteCmontimi} ndihme="çmontim, pastrim" />
            <Numer name="garanciaDemtimit" emri={`Garancia (${njesia})`} vlera={p.garanciaDemtimit} ndihme="kthehet te klienti" />
          </div>
        )}
        {modet.includes("CUSTOM") && <Numer name="diteProdhimi" emri="Ditë për ta prodhuar" vlera={p.diteProdhimi} />}
      </section>

      <section className="card space-y-4 p-5">
        <h2 className="text-lg font-semibold">Përmasat dhe materiali</h2>
        <div className="grid grid-cols-3 gap-3">
          <Numer name="gjeresiCm" emri="Gjerësia (cm)" vlera={p.gjeresiCm} />
          <Numer name="lartesiCm" emri="Lartësia (cm)" vlera={p.lartesiCm} />
          <Numer name="thellesiCm" emri="Thellësia (cm)" vlera={p.thellesiCm} />
        </div>
        <label className="block">
          <span className="label">Materiali</span>
          <input name="materiali" className="input" maxLength={120} defaultValue={p.materiali ?? ""} placeholder="p.sh. Dru MDF, i lyer" />
        </label>
      </section>

      <section className="card space-y-4 p-5">
        <div>
          <h2 className="text-lg font-semibold">Personalizimi</h2>
          <p className="text-sm text-ink-soft">Çfarë mund të zgjedhë klienti: ngjyrën, një tekst (emër), një numër (moshë) ose variante.</p>
        </div>
        {opsionet.map((o, i) => (
          <RedaktoOpsionin
            key={o.id ?? `ri-${i}`}
            o={o}
            paleta={paleta}
            fotot={fotot}
            njesia={njesia}
            onChange={(n) => ndrysho(i, n)}
            onHiq={() => setOpsionet((s) => s.filter((_, j) => j !== i))}
          />
        ))}
        <div className="flex flex-wrap gap-2">
          <button type="button" className="btn-ghost btn-sm" onClick={() => shtoOpsion("NGJYRE")}>
            + Ngjyrë
          </button>
          <button type="button" className="btn-ghost btn-sm" onClick={() => shtoOpsion("TEKST")}>
            + Tekst
          </button>
          <button type="button" className="btn-ghost btn-sm" onClick={() => shtoOpsion("NUMER")}>
            + Numër
          </button>
          <button type="button" className="btn-ghost btn-sm" onClick={() => shtoOpsion("ZGJEDHJE")}>
            + Variante
          </button>
        </div>
        <label className="flex items-start gap-2 text-sm">
          <input type="checkbox" name="shenimetKerkojneAprovim" defaultChecked={p.shenimetKerkojneAprovim} className="mt-1" />
          <span>Shënimet e klientit kërkojnë aprovimin tim</span>
        </label>
      </section>

      <div className="sticky bottom-20 z-10 flex justify-end lg:bottom-4">
        <Dergo className="btn-primary px-8 shadow-lg">{iRi ? "Krijo produktin" : "Ruaj ndryshimet"}</Dergo>
      </div>
    </FormaVeprimi>
  );
}

function Numer({ name, emri, vlera, ndihme }: { name: string; emri: string; vlera: number | null; ndihme?: string }) {
  return (
    <label className="block">
      <span className="label">{emri}</span>
      <input name={name} inputMode="numeric" className="input" defaultValue={vlera ?? ""} />
      {ndihme && <span className="mt-1 block text-xs text-muted">{ndihme}</span>}
    </label>
  );
}

function RedaktoOpsionin({
  o,
  paleta,
  fotot,
  njesia,
  onChange,
  onHiq,
}: {
  o: OpsionForme;
  paleta: Ngjyre[];
  fotot: { id: string; url: string }[];
  njesia: string;
  onChange: (n: Partial<OpsionForme>) => void;
  onHiq: () => void;
}) {
  const emriLlojit = { NGJYRE: "Ngjyrë", TEKST: "Tekst", NUMER: "Numër", ZGJEDHJE: "Variante" }[o.lloji];
  const vleraPerPaleten = (id: string) => o.vlerat.find((v) => v.paletaId === id);
  const ndryshoVleren = (i: number, n: Partial<OpsionForme["vlerat"][number]>) =>
    onChange({ vlerat: o.vlerat.map((v, j) => (j === i ? { ...v, ...n } : v)) });

  return (
    <div className="space-y-3 rounded-xl border border-line bg-cream/60 p-4">
      <div className="flex flex-wrap items-end gap-3">
        <span className="rounded-full bg-ink px-2.5 py-1 text-xs font-semibold text-white">{emriLlojit}</span>
        <label className="block min-w-40 flex-1">
          <span className="label">Emri që sheh klienti</span>
          <input className="input" value={o.emri} maxLength={60} onChange={(e) => onChange({ emri: e.target.value })} />
        </label>
        <label className="flex items-center gap-2 pb-2.5 text-sm">
          <input type="checkbox" checked={o.iDetyrueshem} onChange={(e) => onChange({ iDetyrueshem: e.target.checked })} />I detyrueshëm
        </label>
        <button type="button" onClick={onHiq} className="pb-2.5 text-sm text-bad underline">
          Hiq
        </button>
      </div>

      {o.lloji === "NGJYRE" && (
        <>
          {paleta.length === 0 && <p className="text-sm text-warn">Shtoni ngjyra te Cilësimet → Paleta e ngjyrave.</p>}
          <div className="space-y-2">
            {paleta.map((ng) => {
              const v = vleraPerPaleten(ng.id);
              const i = v ? o.vlerat.indexOf(v) : -1;
              return (
                <div key={ng.id} className={`flex flex-wrap items-center gap-3 rounded-lg p-2 ${v ? "bg-paper" : ""}`}>
                  <label className="flex min-w-40 items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={!!v}
                      onChange={(e) =>
                        onChange({
                          vlerat: e.target.checked
                            ? [...o.vlerat, { paletaId: ng.id, emri: ng.emri, hex: ng.hex, cmimiShtese: ng.cmimiShtese, diteShtese: 0, fotoId: null }]
                            : o.vlerat.filter((x) => x.paletaId !== ng.id),
                        })
                      }
                    />
                    <span className="h-5 w-5 rounded-full border border-black/10" style={{ background: ng.hex }} />
                    {ng.emri}
                  </label>
                  {v && (
                    <>
                      <label className="flex items-center gap-1 text-xs text-muted">
                        +{njesia}
                        <input
                          className="input !w-24 !py-1 text-sm"
                          inputMode="numeric"
                          value={v.cmimiShtese || ""}
                          onChange={(e) => ndryshoVleren(i, { cmimiShtese: Number(e.target.value.replace(/\D/g, "")) || 0 })}
                        />
                      </label>
                      <label className="flex items-center gap-1 text-xs text-muted">
                        +ditë
                        <input
                          className="input !w-16 !py-1 text-sm"
                          inputMode="numeric"
                          title="Ditë shtesë për lyerje — dekori bllokohet më herët"
                          value={v.diteShtese || ""}
                          onChange={(e) => ndryshoVleren(i, { diteShtese: Math.min(30, Number(e.target.value.replace(/\D/g, "")) || 0) })}
                        />
                      </label>
                      {fotot.length > 0 && (
                        <select
                          className="input !w-auto !py-1 text-sm"
                          value={v.fotoId ?? ""}
                          onChange={(e) => ndryshoVleren(i, { fotoId: e.target.value || null })}
                        >
                          <option value="">Pa foto të veçantë</option>
                          {fotot.map((f, n) => (
                            <option key={f.id} value={f.id}>
                              Foto {n + 1}
                            </option>
                          ))}
                        </select>
                      )}
                    </>
                  )}
                </div>
              );
            })}
          </div>
          <label className="flex items-start gap-2 text-sm">
            <input type="checkbox" checked={o.lejonNgjyreTjeter} onChange={(e) => onChange({ lejonNgjyreTjeter: e.target.checked })} className="mt-1" />
            <span>Lejo &quot;Ngjyrë tjetër&quot; (kërkon aprovim)</span>
          </label>
        </>
      )}

      {o.lloji === "ZGJEDHJE" && (
        <div className="space-y-2">
          {o.vlerat.map((v, i) => (
            <div key={v.id ?? i} className="flex flex-wrap items-center gap-2">
              <input className="input !w-48 !py-1.5 text-sm" placeholder="p.sh. E madhe" value={v.emri} onChange={(e) => ndryshoVleren(i, { emri: e.target.value })} />
              <label className="flex items-center gap-1 text-xs text-muted">
                +{njesia}
                <input
                  className="input !w-24 !py-1 text-sm"
                  inputMode="numeric"
                  value={v.cmimiShtese || ""}
                  onChange={(e) => ndryshoVleren(i, { cmimiShtese: Number(e.target.value.replace(/\D/g, "")) || 0 })}
                />
              </label>
              <button type="button" className="text-xs text-bad underline" onClick={() => onChange({ vlerat: o.vlerat.filter((_, j) => j !== i) })}>
                Hiq
              </button>
            </div>
          ))}
          <button
            type="button"
            className="btn-ghost btn-sm"
            onClick={() => onChange({ vlerat: [...o.vlerat, { paletaId: null, emri: "", hex: null, cmimiShtese: 0, diteShtese: 0, fotoId: null }] })}
          >
            + Variant
          </button>
        </div>
      )}

      {(o.lloji === "TEKST" || o.lloji === "NUMER") && (
        <div className="flex flex-wrap gap-3">
          {o.lloji === "TEKST" && (
            <label className="block">
              <span className="label">Maksimumi i shkronjave</span>
              <input
                className="input !w-28"
                inputMode="numeric"
                value={o.gjatesiaMax ?? ""}
                onChange={(e) => onChange({ gjatesiaMax: Math.min(60, Number(e.target.value.replace(/\D/g, "")) || 0) || null })}
              />
            </label>
          )}
          <label className="block">
            <span className="label">Çmim shtesë ({njesia})</span>
            <input
              className="input !w-32"
              inputMode="numeric"
              value={o.cmimiShtese || ""}
              onChange={(e) => onChange({ cmimiShtese: Number(e.target.value.replace(/\D/g, "")) || 0 })}
            />
          </label>
        </div>
      )}
    </div>
  );
}
