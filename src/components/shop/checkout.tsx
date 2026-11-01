"use client";

import Link from "next/link";
import { startTransition, useActionState, useEffect, useMemo, useState } from "react";
import { useFormStatus } from "react-dom";
import { dergoRezervimin, type GjendjaEFormes } from "@/app/(shop)/shporta/actions";
import type { Gjendja } from "@/lib/availability";
import { formatoDaten } from "@/lib/dates";
import { formatoCmimin, type Monedha } from "@/lib/format";
import { GJATESIA_MAX_SHENIM } from "@/lib/options";
import { llogaritKaparin } from "@/lib/pricing";
import { KUFIRI_I_KERKESES, madhesiaEFotove, zvogeloFotot } from "@/lib/shrink-photos";
import { useShporta } from "./cart";

type Rregullat = {
  kerkonKapar: boolean;
  kapariPerqindje: number;
  kapariMinimum: number;
  oretMbajtjes: number;
  monedha: Monedha;
};

const MESAZHET: Partial<Record<Gjendja, string>> = {
  I_ZENE: "Nuk është i lirë për këtë datë",
  I_BLLOKUAR: "Punishtja është e mbyllur në këto ditë",
  I_KALUAR: "Shumë afër datës — na kontaktoni",
  JO_AKTIV: "Nuk është më në dispozicion",
};

export function Arketimi({ rregullat, min, punishtja }: { rregullat: Rregullat; min: string; punishtja?: string }) {
  const { shporta, gati, vendosDaten, ndrysho, hiq } = useShporta();
  const [gjendja, veprimi] = useActionState<GjendjaEFormes, FormData>(dergoRezervimin, {});
  const [gjendjet, setGjendjet] = useState<Gjendja[] | null>(null);
  const [fotot, setFotot] = useState<Record<string, number>>({});
  const [gabimFotosh, setGabimFotosh] = useState<string | null>(null);

  const celesiKontrollit = useMemo(
    () => JSON.stringify([shporta.dataEventit, shporta.artikujt.map((a) => [a.produktId, a.sasia, a.diteShtese])]),
    [shporta],
  );

  useEffect(() => {
    if (!gati || !shporta.dataEventit || !shporta.artikujt.length) return;
    let anuluar = false;
    setGjendjet(null);
    fetch("/api/kontrollo", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        dataEventit: shporta.dataEventit,
        artikujt: shporta.artikujt.map((a) => ({ produktId: a.produktId, sasia: a.sasia, diteShtese: a.diteShtese })),
      }),
    })
      .then((r) => r.json())
      .then((d) => !anuluar && setGjendjet(d.gjendjet ?? null))
      .catch(() => {});
    return () => {
      anuluar = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gati, celesiKontrollit]);

  if (!gati) return <div className="card h-64 animate-pulse" />;

  if (!shporta.artikujt.length) {
    return (
      <div className="card p-10 text-center">
        <p className="font-display text-2xl font-semibold">Rezervimi juaj është bosh</p>
        <p className="mt-2 text-ink-soft">Zgjidhni datën e eventit dhe shtoni dekoret që ju pëlqejnë.</p>
        <Link href="/katalogu" className="btn-primary mt-6">
          Shiko katalogun
        </Link>
      </div>
    );
  }

  const nentotali = shporta.artikujt.reduce((s, a) => s + a.cmimiNjesi * a.sasia, 0);
  const kerkonAprovim = shporta.artikujt.some((a) => a.kerkonAprovim);
  const kapari = llogaritKaparin(nentotali, rregullat.kapariPerqindje, rregullat.kapariMinimum, rregullat.monedha);
  const kaTeZene = gjendjet?.some((g) => g !== "I_LIRE") ?? false;
  const payload = {
    dataEventit: shporta.dataEventit,
    artikujt: shporta.artikujt.map((a) => ({
      celes: a.celes,
      produktId: a.produktId,
      sasia: a.sasia,
      zgjedhjet: a.zgjedhjet,
      shenimi: a.shenimi || undefined,
    })),
  };

  return (
    <form
      action={async (fd) => {
        setGabimFotosh(null);
        fd.set(
          "payload",
          JSON.stringify({
            ...payload,
            ...Object.fromEntries(
              ["emri", "telefoni", "llojiEventit", "menyraDorezimit", "adresaDorezimit", "shenimeKlienti"].map((k) => [
                k,
                (fd.get(k) as string) || undefined,
              ]),
            ),
          }),
        );
        const e_vogel = await zvogeloFotot(fd);
        if (madhesiaEFotove(e_vogel) > KUFIRI_I_KERKESES) {
          setGabimFotosh("Fotot e frymëzimit janë shumë të mëdha bashkë. Hiqni disa foto dhe provoni përsëri.");
          return;
        }
        startTransition(() => veprimi(e_vogel));
      }}
      className="grid gap-8 lg:grid-cols-[1.4fr_1fr]"
    >
      <div className="space-y-6">
        <section className="card p-5">
          <label className="label" htmlFor="data">
            Data e eventit
          </label>
          <input
            id="data"
            type="date"
            className="input max-w-xs"
            min={min}
            required
            value={shporta.dataEventit ?? ""}
            onChange={(e) => vendosDaten(e.target.value || null)}
          />
          {shporta.dataEventit && <p className="mt-2 text-sm text-ink-soft">{formatoDaten(shporta.dataEventit)}</p>}
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">Dekoret</h2>
          {shporta.artikujt.map((a, i) => {
            const g = gjendjet?.[i];
            const problem = g && g !== "I_LIRE" ? MESAZHET[g] : null;
            return (
              <article key={a.celes} className={`card p-4 ${problem ? "border-bad/40" : ""}`}>
                <div className="flex gap-4">
                  <Link href={`/produkti/${a.slug}`} className="h-24 w-20 shrink-0 overflow-hidden rounded-xl bg-brand-soft">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    {a.foto && <img src={a.foto} alt="" className="h-full w-full object-cover" />}
                  </Link>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-semibold leading-tight">{a.emri}</h3>
                      <button type="button" onClick={() => hiq(a.celes)} className="text-xs text-muted underline hover:text-bad">
                        Hiq
                      </button>
                    </div>
                    {a.pershkrimi && <p className="mt-0.5 text-sm text-ink-soft">{a.pershkrimi}</p>}
                    <div className="mt-2 flex flex-wrap items-center gap-3 text-sm">
                      {a.maxSasia > 1 ? (
                        <label className="flex items-center gap-2">
                          <span className="text-muted">Sasia</span>
                          <select
                            className="input !w-auto !py-1"
                            value={a.sasia}
                            onChange={(e) => ndrysho(a.celes, { sasia: Number(e.target.value) })}
                          >
                            {Array.from({ length: a.maxSasia }, (_, n) => n + 1).map((n) => (
                              <option key={n}>{n}</option>
                            ))}
                          </select>
                        </label>
                      ) : null}
                      <span className="ml-auto font-semibold">{formatoCmimin(a.cmimiNjesi * a.sasia, rregullat.monedha)}</span>
                    </div>
                    {a.kerkonAprovim && <p className="mt-2 text-xs font-medium text-info">Kërkesë e veçantë — konfirmohet nga punishtja</p>}
                    {problem && <p className="mt-2 text-sm font-medium text-bad">{problem}</p>}
                    
                  </div>
                </div>
                <details className="mt-3 text-sm" open={!!a.shenimi}>
                  <summary className="cursor-pointer select-none text-ink-soft">Shënim dhe foto frymëzimi</summary>
                  <div className="mt-3 space-y-3">
                    <textarea
                      className="input min-h-20"
                      maxLength={GJATESIA_MAX_SHENIM}
                      placeholder="Si e dëshironi këtë dekor?"
                      value={a.shenimi}
                      onChange={(e) => ndrysho(a.celes, { shenimi: e.target.value })}
                    />
                    <label className="block">
                      <span className="label">Foto frymëzimi (deri në 3)</span>
                      <input
                        type="file"
                        name={`foto-${a.celes}`}
                        accept="image/*"
                        multiple
                        className="block w-full text-sm file:mr-3 file:rounded-full file:border-0 file:bg-brand-soft file:px-4 file:py-2 file:text-sm file:font-semibold file:text-brand-strong"
                        onChange={(e) => setFotot((f) => ({ ...f, [a.celes]: e.target.files?.length ?? 0 }))}
                      />
                      {(fotot[a.celes] ?? 0) > 3 && <span className="mt-1 block text-xs text-warn">Do të ruhen vetëm 3 fotot e para.</span>}
                    </label>
                  </div>
                </details>
              </article>
            );
          })}
          <Link href={shporta.dataEventit ? `/katalogu?data=${shporta.dataEventit}` : "/katalogu"} className="btn-ghost btn-sm">
            + Shto dekor tjetër
          </Link>
        </section>

        <section className="card space-y-4 p-5">
          <h2 className="text-xl font-semibold">Të dhënat tuaja</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="label">Emri dhe mbiemri *</span>
              <input name="emri" className="input" required minLength={2} maxLength={80} autoComplete="name" />
            </label>
            <label className="block">
              <span className="label">Telefoni (WhatsApp) *</span>
              <input
                name="telefoni"
                className="input"
                required
                inputMode="tel"
                autoComplete="tel"
                placeholder="069 123 4567"
              />
            </label>
          </div>
          <label className="block">
            <span className="label">Lloji i eventit</span>
            <input name="llojiEventit" className="input" maxLength={80} placeholder="Ditëlindje, pagëzim, fejesë…" />
          </label>
          {/* Delivery is switched off for now: every order is picked up at the workshop. */}
          <input type="hidden" name="menyraDorezimit" value="MARRJE" />
          <div className="rounded-xl bg-cream p-3 text-sm">
            <p className="font-medium">📍 Dekori merret në punishte</p>
            {punishtja && <p className="mt-0.5 text-ink-soft">{punishtja}</p>}
          </div>
          <label className="block">
            <span className="label">Shënime për gjithë eventin</span>
            <textarea name="shenimeKlienti" className="input min-h-20" maxLength={1000} placeholder="Tema, ngjyrat e festës, orari, salla…" />
          </label>
          <input type="text" name="website" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden />
        </section>
      </div>

      <aside className="lg:sticky lg:top-24 lg:self-start">
        <div className="card space-y-4 p-5">
          <h2 className="text-xl font-semibold">Përmbledhja</h2>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-ink-soft">Dekoret</dt>
              <dd className="font-semibold">{formatoCmimin(nentotali, rregullat.monedha)}</dd>
            </div>
            {rregullat.kerkonKapar ? (
              <div className="flex justify-between border-t border-line pt-2">
                <dt className="font-semibold">Kapari</dt>
                <dd className="font-display text-xl font-semibold">
                  {kerkonAprovim ? "pas aprovimit" : formatoCmimin(kapari, rregullat.monedha)}
                </dd>
              </div>
            ) : (
              <div className="flex justify-between border-t border-line pt-2">
                <dt className="font-semibold">Totali</dt>
                <dd className="font-display text-xl font-semibold">{formatoCmimin(nentotali, rregullat.monedha)}</dd>
              </div>
            )}
          </dl>
          <p className="text-sm text-ink-soft">
            {!rregullat.kerkonKapar
              ? "Punishtja ju konfirmon rezervimin. Pagesa bëhet në kesh kur merrni dekorin."
              : kerkonAprovim
                ? "Punishtja ju konfirmon çmimin dhe kaparin."
                : `Data mbahet ${rregullat.oretMbajtjes} orë. Kapari paguhet në kesh në punishte.`}
          </p>
          <label className="flex items-start gap-2 text-sm">
            <input type="checkbox" name="pranoj" required className="mt-1" />
            <span>
              Pranoj{" "}
              <Link href="/kushtet" target="_blank" className="font-semibold underline">
                kushtet e rezervimit
              </Link>
.
            </span>
          </label>
          {gabimFotosh && (
            <p role="alert" className="rounded-xl bg-bad-soft p-3 text-sm text-bad">
              {gabimFotosh}
            </p>
          )}
          {gjendja.gabim && (
            <p role="alert" className="rounded-xl bg-bad-soft p-3 text-sm text-bad">
              {gjendja.gabim}
            </p>
          )}
          <Dergo disabled={!shporta.dataEventit || kaTeZene || !gjendjet} />
          {kaTeZene && <p className="text-xs text-bad">Hiqni dekoret që nuk janë të lira, ose zgjidhni një datë tjetër.</p>}
        </div>
      </aside>
    </form>
  );
}

function Dergo({ disabled }: { disabled: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn-primary w-full !py-3 text-base" disabled={disabled || pending}>
      {pending ? "Po dërgohet…" : "Dërgo rezervimin"}
    </button>
  );
}
