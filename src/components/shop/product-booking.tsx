"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Ngjyra } from "@/components/ui";
import { formatoDaten } from "@/lib/dates";
import { formatoCmimin, type Monedha } from "@/lib/format";
import {
  GJATESIA_MAX_SHENIM,
  GJATESIA_MAX_TEKST,
  llogaritOpsionet,
  permbledhjaEZgjedhjeve,
  type OpsionPerKlient,
  type ZgjedhjeHyrese,
} from "@/lib/options";
import { KalendariDisponueshmerise } from "./availability-calendar";
import { useShporta } from "./cart";

export type FotoKlient = { id: string; url: string };

type Props = {
  produkt: {
    id: string;
    slug: string;
    emri: string;
    cmimiQira: number | null;
    sasiaNeStok: number;
    shenimetKerkojneAprovim: boolean;
    mundTeRezervohet: boolean;
  };
  fotot: FotoKlient[];
  opsionet: OpsionPerKlient[];
  monedha: Monedha;
  sot: string;
  dataNgaKerkimi?: string;
  info: React.ReactNode;
};

export function ProduktiKlient({ produkt, fotot, opsionet, monedha, sot, dataNgaKerkimi, info }: Props) {
  const { shporta, shto, vendosDaten, gati } = useShporta();
  const [fotoAktive, setFotoAktive] = useState(fotot[0]?.id ?? null);
  const [data, setData] = useState<string | null>(dataNgaKerkimi ?? null);
  const [zgjedhjet, setZgjedhjet] = useState<Record<string, ZgjedhjeHyrese>>({});
  const [shenimi, setShenimi] = useState("");
  const [sasia, setSasia] = useState(1);
  const [provuar, setProvuar] = useState(false);
  const [shtuar, setShtuar] = useState(false);

  // The cart's date wins once the customer has started a reservation.
  const dataEfektive = data ?? (gati ? shporta.dataEventit : null);
  const dataNdryshonNgaShporta =
    gati && shporta.artikujt.length > 0 && shporta.dataEventit && dataEfektive && dataEfektive !== shporta.dataEventit;

  const rezultati = useMemo(
    () =>
      llogaritOpsionet(
        produkt.cmimiQira ?? 0,
        opsionet,
        Object.values(zgjedhjet),
        produkt.shenimetKerkojneAprovim,
        shenimi.trim().length > 0,
      ),
    [produkt, opsionet, zgjedhjet, shenimi],
  );

  const vendos = (opsionId: string, z: Partial<ZgjedhjeHyrese>) => {
    setShtuar(false);
    setZgjedhjet((s) => ({ ...s, [opsionId]: { opsionId, ...z } }));
  };

  const fotoKryesore = fotot.find((f) => f.id === fotoAktive) ?? fotot[0];

  function shtoNeShporte() {
    setProvuar(true);
    if (!dataEfektive || rezultati.gabimet.length || dataNdryshonNgaShporta) return;
    if (!shporta.artikujt.length || shporta.dataEventit !== dataEfektive) vendosDaten(dataEfektive);
    shto({
      produktId: produkt.id,
      slug: produkt.slug,
      emri: produkt.emri,
      foto: fotoKryesore?.url ?? null,
      sasia,
      maxSasia: produkt.sasiaNeStok,
      zgjedhjet: Object.values(zgjedhjet),
      pershkrimi: permbledhjaEZgjedhjeve(rezultati.zgjedhjet),
      shenimi: shenimi.trim(),
      cmimiNjesi: rezultati.cmimiNjesi,
      diteShtese: rezultati.diteShtese,
      kerkonAprovim: rezultati.kerkonAprovim,
    });
    setShtuar(true);
    setZgjedhjet({});
    setShenimi("");
    setSasia(1);
    setProvuar(false);
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[1.1fr_1fr]">
      <div className="lg:sticky lg:top-24 lg:self-start">
        <div className="card aspect-[4/5] overflow-hidden bg-brand-soft">
          {fotoKryesore ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={fotoKryesore.url} alt={produkt.emri} className="h-full w-full object-cover" />
          ) : (
            <div className="grid h-full place-items-center text-brand-strong">Pa foto</div>
          )}
        </div>
        {fotot.length > 1 && (
          <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
            {fotot.map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setFotoAktive(f.id)}
                className={`h-20 w-16 shrink-0 overflow-hidden rounded-xl ring-2 transition ${
                  f.id === fotoKryesore?.id ? "ring-ink" : "ring-transparent opacity-70 hover:opacity-100"
                }`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={f.url} alt="" className="h-full w-full object-cover" />
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="space-y-6">
        {info}

        {produkt.mundTeRezervohet ? (
          <>
            <section>
              <h2 className="mb-3 text-xl font-semibold">1. Zgjidhni datën e eventit</h2>
              <KalendariDisponueshmerise
                produktId={produkt.id}
                zgjedhur={dataEfektive}
                onZgjidh={(d) => {
                  setData(d);
                  setShtuar(false);
                }}
                sot={sot}
              />
              {dataEfektive && (
                <p className="mt-2 text-sm">
                  Data: <strong>{formatoDaten(dataEfektive)}</strong>
                </p>
              )}
              {dataNdryshonNgaShporta && (
                <div className="mt-3 rounded-xl bg-warn-soft p-3 text-sm text-warn">
                  Rezervimi juaj është për <strong>{formatoDaten(shporta.dataEventit!, false)}</strong>. Një rezervim është për një
                  event.{" "}
                  <button type="button" className="font-semibold underline" onClick={() => vendosDaten(dataEfektive!)}>
                    Kaloje gjithë rezervimin në {formatoDaten(dataEfektive!, false)}
                  </button>
                </div>
              )}
              {provuar && !dataEfektive && <p className="mt-2 text-sm text-bad">Zgjidhni një datë të lirë në kalendar.</p>}
            </section>

            {opsionet.length > 0 && (
              <section className="space-y-5">
                <h2 className="text-xl font-semibold">2. Personalizojeni</h2>
                {opsionet.map((o) => (
                  <Opsioni
                    key={o.id}
                    o={o}
                    z={zgjedhjet[o.id]}
                    monedha={monedha}
                    onChange={(z) => {
                      vendos(o.id, z);
                      const v = o.vlerat.find((x) => x.id === z.vleraId);
                      if (v?.fotoId) setFotoAktive(v.fotoId);
                    }}
                  />
                ))}
              </section>
            )}

            <section className="space-y-3">
              <h2 className="text-xl font-semibold">{opsionet.length ? "3." : "2."} Shënim (opsionale)</h2>
              <textarea
                className="input min-h-24"
                maxLength={GJATESIA_MAX_SHENIM}
                placeholder="P.sh. tema e festës, ngjyrat e balonave, si e dëshironi…"
                value={shenimi}
                onChange={(e) => {
                  setShenimi(e.target.value);
                  setShtuar(false);
                }}
              />
              <p className="text-xs text-muted">Foto frymëzimi mund të shtoni në hapin e fundit.</p>
            </section>

            <section className="card space-y-4 p-5">
              {produkt.sasiaNeStok > 1 && (
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Sasia</span>
                  <div className="flex items-center gap-2">
                    <button type="button" className="btn-ghost btn-sm !px-3" onClick={() => setSasia((s) => Math.max(1, s - 1))} aria-label="Më pak">
                      −
                    </button>
                    <span className="w-8 text-center font-semibold">{sasia}</span>
                    <button
                      type="button"
                      className="btn-ghost btn-sm !px-3"
                      onClick={() => setSasia((s) => Math.min(produkt.sasiaNeStok, s + 1))}
                      aria-label="Më shumë"
                    >
                      +
                    </button>
                  </div>
                </div>
              )}
              <div className="flex items-baseline justify-between">
                <span className="text-sm text-ink-soft">Çmimi</span>
                <span className="font-display text-2xl font-semibold">
                  {formatoCmimin(rezultati.cmimiNjesi * sasia, monedha)}
                </span>
              </div>
              {rezultati.kerkonAprovim && (
                <p className="rounded-xl bg-info-soft p-3 text-sm text-info">
                  Kërkesë e veçantë — punishtja e shqyrton dhe ju konfirmon çmimin. Data mbahet për ju ndërkohë.
                </p>
              )}
              {provuar && rezultati.gabimet.length > 0 && <p className="text-sm text-bad">{rezultati.gabimet[0]}</p>}
              <button type="button" className="btn-primary w-full !py-3 text-base" onClick={shtoNeShporte}>
                Shto në rezervim
              </button>
              {shtuar && (
                <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-ok-soft p-3 text-sm text-ok">
                  <span>U shtua në rezervimin tuaj.</span>
                  <span className="flex gap-3 font-semibold">
                    <Link href={`/katalogu?data=${dataEfektive}`} className="underline">
                      Shto të tjera
                    </Link>
                    <Link href="/shporta" className="underline">
                      Vazhdo te rezervimi →
                    </Link>
                  </span>
                </div>
              )}
            </section>
          </>
        ) : null}
      </div>
    </div>
  );
}

function Opsioni({
  o,
  z,
  monedha,
  onChange,
}: {
  o: OpsionPerKlient;
  z?: ZgjedhjeHyrese;
  monedha: Monedha;
  onChange: (z: Partial<ZgjedhjeHyrese>) => void;
}) {
  const shtese = (c: number, d: number) =>
    [c > 0 && `+${formatoCmimin(c, monedha)}`, d > 0 && `+${d} ditë`].filter(Boolean).join(" · ");

  if (o.lloji === "NGJYRE" || o.lloji === "ZGJEDHJE") {
    const tjeterAktive = z?.ngjyreTjeter !== undefined;
    const zgjedhur = o.vlerat.find((v) => v.id === z?.vleraId);
    return (
      <fieldset>
        <legend className="label">
          {o.emri}
          {o.iDetyrueshem && <span className="text-bad"> *</span>}
          {zgjedhur && <span className="ml-2 font-semibold text-ink">{zgjedhur.emri}</span>}
        </legend>
        <div className="flex flex-wrap gap-2">
          {o.vlerat.map((v) => {
            const aktiv = z?.vleraId === v.id && !tjeterAktive;
            return o.lloji === "NGJYRE" ? (
              <button
                key={v.id}
                type="button"
                onClick={() => onChange({ vleraId: v.id })}
                aria-pressed={aktiv}
                title={`${v.emri}${shtese(v.cmimiShtese, v.diteShtese) ? ` (${shtese(v.cmimiShtese, v.diteShtese)})` : ""}`}
                className={`flex items-center gap-2 rounded-full border py-1.5 pl-1.5 pr-3 text-sm transition ${
                  aktiv ? "border-ink bg-ink text-white" : "border-line bg-paper hover:border-brand"
                }`}
              >
                <Ngjyra hex={v.hex} madhesia={24} />
                <span>{v.emri}</span>
                {shtese(v.cmimiShtese, v.diteShtese) && (
                  <span className={`text-xs ${aktiv ? "text-white/70" : "text-muted"}`}>{shtese(v.cmimiShtese, v.diteShtese)}</span>
                )}
              </button>
            ) : (
              <button
                key={v.id}
                type="button"
                onClick={() => onChange({ vleraId: v.id })}
                aria-pressed={aktiv}
                className={aktiv ? "chip-active" : "chip"}
              >
                {v.emri}
                {shtese(v.cmimiShtese, v.diteShtese) && <span className="text-xs opacity-70">{shtese(v.cmimiShtese, v.diteShtese)}</span>}
              </button>
            );
          })}
          {o.lloji === "NGJYRE" && o.lejonNgjyreTjeter && (
            <button
              type="button"
              onClick={() => onChange({ ngjyreTjeter: z?.ngjyreTjeter ?? "" })}
              aria-pressed={tjeterAktive}
              className={`flex items-center gap-2 rounded-full border py-1.5 pl-1.5 pr-3 text-sm transition ${
                tjeterAktive ? "border-ink bg-ink text-white" : "border-dashed border-line bg-paper hover:border-brand"
              }`}
            >
              <span
                aria-hidden
                className="inline-block h-6 w-6 rounded-full"
                style={{ background: "conic-gradient(#f6c1cf, #f5e38f, #a8e2c8, #a9cdf0, #c7a6e8, #f6c1cf)" }}
              />
              Ngjyrë tjetër
            </button>
          )}
        </div>
        {tjeterAktive && (
          <div className="mt-2">
            <input
              className="input"
              maxLength={80}
              autoFocus
              placeholder="Përshkruani ngjyrën, p.sh. blu deti me detaje ari"
              value={z?.ngjyreTjeter ?? ""}
              onChange={(e) => onChange({ ngjyreTjeter: e.target.value })}
            />
          </div>
        )}
      </fieldset>
    );
  }

  const max = o.gjatesiaMax ?? GJATESIA_MAX_TEKST;
  return (
    <label className="block">
      <span className="label">
        {o.emri}
        {o.iDetyrueshem && <span className="text-bad"> *</span>}
        {o.cmimiShtese > 0 && <span className="ml-2 text-xs text-muted">+{formatoCmimin(o.cmimiShtese, monedha)}</span>}
      </span>
      <input
        className="input"
        inputMode={o.lloji === "NUMER" ? "numeric" : undefined}
        maxLength={o.lloji === "NUMER" ? 3 : max}
        placeholder={o.lloji === "NUMER" ? "p.sh. 5" : `deri në ${max} shkronja`}
        value={z?.tekst ?? ""}
        onChange={(e) => onChange({ tekst: o.lloji === "NUMER" ? e.target.value.replace(/\D/g, "") : e.target.value })}
      />
    </label>
  );
}
