// Dates are handled as ISO strings ("2026-06-12") so that day arithmetic never
// shifts across timezones. "Today" is always today in Tirana.

export const ZONA_KOHORE = "Europe/Tirane";

const MUAJT = [
  "janar", "shkurt", "mars", "prill", "maj", "qershor",
  "korrik", "gusht", "shtator", "tetor", "nëntor", "dhjetor",
];
const DITET = ["e diel", "e hënë", "e martë", "e mërkurë", "e enjte", "e premte", "e shtunë"];
export const DITET_SHKURT = ["Hë", "Ma", "Më", "En", "Pr", "Sh", "Di"];

export function sot(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: ZONA_KOHORE }).format(new Date());
}

function neUTC(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

function ngaUTC(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function shtoDite(iso: string, dite: number): string {
  const d = neUTC(iso);
  d.setUTCDate(d.getUTCDate() + dite);
  return ngaUTC(d);
}

export function ditetMes(nga: string, deri: string): number {
  return Math.round((neUTC(deri).getTime() - neUTC(nga).getTime()) / 86_400_000);
}

export function eshteDateValide(iso: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(iso) && ngaUTC(neUTC(iso)) === iso;
}

/** Each day from `nga` to `deri`, inclusive. */
export function ditet(nga: string, deri: string): string[] {
  const out: string[] = [];
  for (let d = nga; d <= deri; d = shtoDite(d, 1)) out.push(d);
  return out;
}

/** Monday-first grid of a month, padded with nulls. */
export function rrjetaEMuajit(viti: number, muaji: number): (string | null)[] {
  const ePara = new Date(Date.UTC(viti, muaji - 1, 1));
  const ditetNeMuaj = new Date(Date.UTC(viti, muaji, 0)).getUTCDate();
  const zhvendosja = (ePara.getUTCDay() + 6) % 7;
  const qelizat: (string | null)[] = Array(zhvendosja).fill(null);
  for (let d = 1; d <= ditetNeMuaj; d++) qelizat.push(ngaUTC(new Date(Date.UTC(viti, muaji - 1, d))));
  while (qelizat.length % 7) qelizat.push(null);
  return qelizat;
}

export function emriMuajit(muaji: number): string {
  return MUAJT[muaji - 1];
}

/** "e shtunë, 12 qershor 2026" */
export function formatoDaten(iso: string, meDiten = true): string {
  const d = neUTC(iso);
  const baza = `${d.getUTCDate()} ${MUAJT[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
  return meDiten ? `${DITET[d.getUTCDay()]}, ${baza}` : baza;
}

/** "14 qershor, ora 18:00" in Tirana time */
export function formatoKohen(t: Date): string {
  const p = Object.fromEntries(
    new Intl.DateTimeFormat("en-GB", {
      timeZone: ZONA_KOHORE,
      day: "numeric",
      month: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    })
      .formatToParts(t)
      .map((x) => [x.type, x.value]),
  );
  return `${p.day} ${MUAJT[Number(p.month) - 1]}, ora ${p.hour}:${p.minute}`;
}

/** "edhe 5 orë" / "edhe 40 min" / "skaduar" */
export function koheEMbetur(deri: Date, tani = new Date()): string {
  const ms = deri.getTime() - tani.getTime();
  if (ms <= 0) return "skaduar";
  const min = Math.floor(ms / 60_000);
  if (min < 60) return `edhe ${min} min`;
  const ore = Math.floor(min / 60);
  if (ore < 48) return `edhe ${ore} orë`;
  return `edhe ${Math.floor(ore / 24)} ditë`;
}
