import { and, asc, desc, eq, gte } from "drizzle-orm";
import { db } from "@/db";
import { bllokimDate, njoftim, paletaNgjyrave, produkt } from "@/db/schema";
import { Dergo, FormaVeprimi } from "@/components/admin/action-form";
import { NjoftimetPush } from "@/components/admin/push-toggle";
import { kerkoPronarin } from "@/lib/auth";
import { formatoDaten, formatoKohen, sot } from "@/lib/dates";
import { kushtetParazgjedhur } from "@/lib/kushtet";
import { whatsappEshteKonfiguruar } from "@/lib/notify/whatsapp";
import { shfaqTelefonin } from "@/lib/phone";
import { urlFoto } from "@/lib/storage";
import { merrBiznesinMeId } from "@/lib/tenant";
import * as v from "./actions";

export const metadata = { title: "Cilësimet" };

export default async function Cilesimet() {
  const admin = await kerkoPronarin();
  const [b, paleta, bllokimet, produktet, logu] = await Promise.all([
    merrBiznesinMeId(admin.biznesId),
    db.select().from(paletaNgjyrave).where(eq(paletaNgjyrave.biznesId, admin.biznesId)).orderBy(asc(paletaNgjyrave.renditja)),
    db
      .select({ id: bllokimDate.id, nga: bllokimDate.nga, deri: bllokimDate.deri, arsyeja: bllokimDate.arsyeja, produkti: produkt.emri })
      .from(bllokimDate)
      .leftJoin(produkt, eq(produkt.id, bllokimDate.produktId))
      .where(and(eq(bllokimDate.biznesId, admin.biznesId), gte(bllokimDate.deri, sot())))
      .orderBy(asc(bllokimDate.nga)),
    db.select({ id: produkt.id, emri: produkt.emri }).from(produkt).where(eq(produkt.biznesId, admin.biznesId)).orderBy(asc(produkt.emri)),
    db.select().from(njoftim).where(eq(njoftim.biznesId, admin.biznesId)).orderBy(desc(njoftim.krijuarMe)).limit(8),
  ]);

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <h1 className="text-3xl font-semibold">Cilësimet</h1>
      <nav className="flex flex-wrap gap-2 text-sm">
        {[
          ["biznesi", "Biznesi"],
          ["rregullat", "Pagesa"],
          ["paleta", "Ngjyrat"],
          ["bllokime", "Datat e mbyllura"],
          ["kushtet", "Kushtet"],
          ["njoftimet", "Njoftimet"],
          ["fjalekalimi", "Fjalëkalimi"],
        ].map(([id, emri]) => (
          <a key={id} href={`#${id}`} className="chip">
            {emri}
          </a>
        ))}
      </nav>

      <Seksion id="biznesi" titulli="Biznesi dhe punishtja" pershkrimi="Shfaqen te klientët në dyqan dhe në faqen e rezervimit.">
        <FormaVeprimi veprimi={v.ruajBiznesin} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Fushe emri="emri" etiketa="Emri i biznesit *" vlera={b.emri} required />
            <Fushe emri="qyteti" etiketa="Qyteti" vlera={b.qyteti} />
            <Fushe emri="adresaPunishtes" etiketa="Adresa e punishtes" vlera={b.adresaPunishtes} vend="Rruga, nr., lagja" />
            <Fushe emri="orariPunes" etiketa="Orari" vlera={b.orariPunes} vend="E hënë – E shtunë, 09:00 – 19:00" />
            <Fushe emri="googleMapsUrl" etiketa="Lidhja e Google Maps" vlera={b.googleMapsUrl} vend="https://maps.app.goo.gl/…" />
            <Fushe emri="instagram" etiketa="Instagram" vlera={b.instagram} vend="emri_juaj" />
            <Fushe emri="whatsappPronarit" etiketa="WhatsApp për njoftimet *" vlera={b.whatsappPronarit && shfaqTelefonin(b.whatsappPronarit)} vend="069 123 4567" ndihme="Këtu vijnë mesazhet për rezervimet e reja." />
            <Fushe emri="telefoni" etiketa="Telefoni për klientët" vlera={b.telefoni && shfaqTelefonin(b.telefoni)} />
            <Fushe emri="email" etiketa="Email" vlera={b.email} />
            <Fushe emri="nipt" etiketa="NIPT (për faturat)" vlera={b.nipt} />
            <label className="block">
              <span className="label">Ngjyra e dyqanit</span>
              <input type="color" name="ngjyraPrimare" defaultValue={b.ngjyraPrimare} className="h-11 w-24 cursor-pointer rounded-xl border border-line bg-paper p-1" />
            </label>
          </div>
          <div className="flex items-center gap-4">
            {b.logoRruga && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={urlFoto(b.logoRruga)} alt="Logo" className="h-14 w-14 rounded-full object-cover" />
            )}
            <label className="block flex-1">
              <span className="label">Logoja</span>
              <input type="file" name="logo" accept="image/*" className="block w-full text-sm file:mr-3 file:rounded-full file:border-0 file:bg-brand-soft file:px-4 file:py-2 file:text-sm file:font-semibold file:text-brand-strong" />
            </label>
          </div>
          <Dergo>Ruaj</Dergo>
        </FormaVeprimi>
      </Seksion>

      <Seksion id="rregullat" titulli="Pagesa" pershkrimi="Pa kapar: ju e konfirmoni çdo rezervim dhe klienti paguan gjithçka në marrje. Me kapar: data mbahet disa orë derisa klienti të paguajë kaparin.">
        <FormaVeprimi veprimi={v.ruajRregullat} className="space-y-4">
          <label className="flex items-center gap-2 text-sm font-medium">
            <input type="checkbox" name="kerkonKapar" defaultChecked={b.kerkonKapar} />
            Kërko kapar për të mbajtur datën
          </label>
          <div className="grid gap-4 sm:grid-cols-4">
            <Fushe emri="kapariPerqindje" etiketa="Kapari (%)" vlera={b.kapariPerqindje} numer />
            <Fushe emri="kapariMinimum" etiketa="Kapari minimum" vlera={b.kapariMinimum} numer />
            <Fushe emri="oretMbajtjes" etiketa="Mbahet për (orë)" vlera={b.oretMbajtjes} numer />
            <label className="block">
              <span className="label">Monedha</span>
              <select name="monedha" className="input" defaultValue={b.monedha}>
                <option value="LEK">Lek (L)</option>
                <option value="EUR">Euro (€)</option>
              </select>
            </label>
          </div>
          <Dergo>Ruaj</Dergo>
        </FormaVeprimi>
      </Seksion>

      <Seksion id="paleta" titulli="Paleta e ngjyrave" pershkrimi="Ngjyrat që ofroni. Te çdo produkt zgjidhni cilat vlejnë.">
        <ul className="space-y-2">
          {paleta.map((ng) => (
            <li key={ng.id} className="flex flex-wrap items-start gap-2">
              <FormaVeprimi veprimi={v.ndryshoNgjyren.bind(null, ng.id)} className="flex flex-1 flex-wrap items-center gap-2">
                <input type="color" name="hex" defaultValue={ng.hex} className="h-10 w-12 cursor-pointer rounded-lg border border-line p-0.5" />
                <input name="emri" defaultValue={ng.emri} className="input !w-44 !py-2" maxLength={40} />
                <input name="cmimiShtese" defaultValue={ng.cmimiShtese || ""} inputMode="numeric" placeholder="+ çmim" className="input !w-28 !py-2" />
                <Dergo className="btn-ghost btn-sm">Ruaj</Dergo>
              </FormaVeprimi>
              <FormaVeprimi veprimi={v.fshiNgjyren.bind(null, ng.id)} konfirmim={`Ta fshij "${ng.emri}" nga paleta? Produktet që e kanë e ruajnë.`}>
                <button className="mt-2 text-sm text-bad underline">Fshi</button>
              </FormaVeprimi>
            </li>
          ))}
        </ul>
        <FormaVeprimi veprimi={v.shtoNgjyre} className="mt-4 flex flex-wrap items-center gap-2 border-t border-line pt-4" pastroPasSuksesit>
          <input type="color" name="hex" defaultValue="#f6c1cf" className="h-10 w-12 cursor-pointer rounded-lg border border-line p-0.5" />
          <input name="emri" placeholder="Emri, p.sh. Rozë pudër" className="input !w-44 !py-2" maxLength={40} required />
          <input name="cmimiShtese" inputMode="numeric" placeholder="+ çmim" className="input !w-28 !py-2" />
          <Dergo className="btn-primary btn-sm">+ Shto ngjyrë</Dergo>
        </FormaVeprimi>
      </Seksion>

      <Seksion id="bllokime" titulli="Datat e mbyllura" pershkrimi="Pushime ose punë private — në këto ditë nuk pranohen rezervime të reja.">
        {bllokimet.length > 0 && (
          <ul className="mb-4 divide-y divide-line rounded-xl border border-line">
            {bllokimet.map((bl) => (
              <li key={bl.id} className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
                <span>
                  <strong>
                    {formatoDaten(bl.nga, false)}
                    {bl.deri !== bl.nga && ` – ${formatoDaten(bl.deri, false)}`}
                  </strong>
                  <span className="text-ink-soft"> · {bl.produkti ?? "Gjithë punishtja"}</span>
                  {bl.arsyeja && <span className="text-muted"> · {bl.arsyeja}</span>}
                </span>
                <FormaVeprimi veprimi={v.fshiBllokim.bind(null, bl.id)}>
                  <button className="text-bad underline">Hiq</button>
                </FormaVeprimi>
              </li>
            ))}
          </ul>
        )}
        <FormaVeprimi veprimi={v.shtoBllokim} className="grid gap-3 sm:grid-cols-2" pastroPasSuksesit>
          <label className="block">
            <span className="label">Nga</span>
            <input type="date" name="nga" className="input" required min={sot()} />
          </label>
          <label className="block">
            <span className="label">Deri</span>
            <input type="date" name="deri" className="input" min={sot()} />
          </label>
          <label className="block">
            <span className="label">Çfarë</span>
            <select name="produktId" className="input">
              <option value="">Gjithë punishtja</option>
              {produktet.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.emri}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="label">Arsyeja (vetëm për ju)</span>
            <input name="arsyeja" className="input" maxLength={120} placeholder="p.sh. Pushime" />
          </label>
          <div>
            <Dergo className="btn-primary btn-sm">Blloko datat</Dergo>
          </div>
        </FormaVeprimi>
      </Seksion>

      <Seksion id="kushtet" titulli="Kushtet e rezervimit" pershkrimi="Klienti i pranon para se të rezervojë. Përdorni ## për tituj dhe - për pika.">
        <FormaVeprimi veprimi={v.ruajKushtet} className="space-y-3">
          <textarea name="kushtet" className="input min-h-72 font-mono text-sm" defaultValue={b.kushtet ?? kushtetParazgjedhur(b)} />
          <div className="flex flex-wrap gap-2">
            <Dergo>Ruaj kushtet</Dergo>
            {b.kushtet && (
              <button name="rikthe" value="1" className="btn-ghost">
                Rikthe tekstin standard
              </button>
            )}
          </div>
        </FormaVeprimi>
      </Seksion>

      <Seksion id="njoftimet" titulli="Njoftimet" pershkrimi="Për çdo rezervim të ri merrni mesazh në WhatsApp dhe njoftim në telefon.">
        <div className="space-y-4">
          <div className="rounded-xl bg-cream p-4 text-sm">
            <p className="font-semibold">WhatsApp</p>
            <p className="mt-1 text-ink-soft">
              {!b.whatsappPronarit
                ? "Shtoni numrin e WhatsApp më sipër."
                : whatsappEshteKonfiguruar()
                  ? `Aktive · ${shfaqTelefonin(b.whatsappPronarit)}`
                  : "Ende jo aktive (pritet lidhja me WhatsApp Business)."}
            </p>
          </div>
          <div className="rounded-xl bg-cream p-4 text-sm">
            <p className="mb-2 font-semibold">Njoftime në këtë pajisje</p>
            <NjoftimetPush celesiPublik={process.env.VAPID_PUBLIC_KEY || null} />
          </div>
          <FormaVeprimi veprimi={v.testoNjoftimet}>
            <Dergo className="btn-ghost btn-sm">Dërgo njoftim prove</Dergo>
          </FormaVeprimi>
          {logu.length > 0 && (
            <div>
              <p className="label">Njoftimet e fundit</p>
              <ul className="divide-y divide-line rounded-xl border border-line text-xs">
                {logu.map((n) => (
                  <li key={n.id} className="flex flex-wrap justify-between gap-2 px-3 py-2">
                    <span>
                      {n.kanali === "WHATSAPP" ? "WhatsApp" : "Push"} · {n.shablloni} · {formatoKohen(n.krijuarMe)}
                    </span>
                    <span className={n.statusi === "DERGUAR" ? "text-ok" : n.statusi === "DESHTOI" ? "text-bad" : "text-muted"} title={n.gabimi ?? ""}>
                      {n.statusi === "DERGUAR" ? "U dërgua" : n.statusi === "DESHTOI" ? "Dështoi" : "Anashkaluar"}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </Seksion>

      <Fjalekalimi />
    </div>
  );
}

function Fjalekalimi() {
  return (
    <Seksion id="fjalekalimi" titulli="Fjalëkalimi" pershkrimi="Ndryshoni fjalëkalimin me të cilin hyni në panel.">
      <FormaVeprimi veprimi={v.ndryshoFjalekalimin} className="grid gap-3 sm:grid-cols-3" pastroPasSuksesit>
        <label className="block">
          <span className="label">Aktual</span>
          <input type="password" name="aktual" className="input" required autoComplete="current-password" />
        </label>
        <label className="block">
          <span className="label">I ri (min. 10)</span>
          <input type="password" name="iRi" className="input" required minLength={10} autoComplete="new-password" />
        </label>
        <label className="block">
          <span className="label">I ri përsëri</span>
          <input type="password" name="perseri" className="input" required minLength={10} autoComplete="new-password" />
        </label>
        <div>
          <Dergo className="btn-primary btn-sm">Ndrysho fjalëkalimin</Dergo>
        </div>
      </FormaVeprimi>
    </Seksion>
  );
}

function Seksion({ id, titulli, pershkrimi, children }: { id: string; titulli: string; pershkrimi?: string; children: React.ReactNode }) {
  return (
    <section id={id} className="card scroll-mt-6 p-5">
      <h2 className="text-xl font-semibold">{titulli}</h2>
      {pershkrimi && <p className="mb-4 mt-1 text-sm text-ink-soft">{pershkrimi}</p>}
      {children}
    </section>
  );
}

function Fushe({
  emri,
  etiketa,
  vlera,
  vend,
  ndihme,
  numer,
  required,
}: {
  emri: string;
  etiketa: string;
  vlera?: string | number | null;
  vend?: string;
  ndihme?: string;
  numer?: boolean;
  required?: boolean;
}) {
  return (
    <label className="block">
      <span className="label">{etiketa}</span>
      <input name={emri} className="input" defaultValue={vlera ?? ""} placeholder={vend} inputMode={numer ? "numeric" : undefined} required={required} />
      {ndihme && <span className="mt-1 block text-xs text-muted">{ndihme}</span>}
    </label>
  );
}
