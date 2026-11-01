import { formatoCmimin, type Monedha } from "./format";

/** Default reservation terms, used until the business writes its own in Cilësimet. */
export function kushtetParazgjedhur(b: {
  emri: string;
  kerkonKapar: boolean;
  kapariPerqindje: number;
  kapariMinimum: number;
  oretMbajtjes: number;
  monedha: Monedha;
}): string {
  const rezervimi = b.kerkonKapar
    ? `## Rezervimi dhe kapari

- Rezervimi mban datën për ju për ${b.oretMbajtjes} orë.
- Për ta konfirmuar, paguani kaparin në punishte, në kesh: ${b.kapariPerqindje}% e vlerës, minimumi ${formatoCmimin(b.kapariMinimum, b.monedha)}.
- Nëse kapari nuk paguhet brenda afatit, data lirohet automatikisht për klientë të tjerë.
- Kapari nuk kthehet.

## Anulimi

- Më shumë se 30 ditë para eventit: kapari bëhet kredi, e vlefshme 6 muaj për një datë tjetër.
- 15–30 ditë para eventit: 50% e kaparit bëhet kredi.
- Më pak se 14 ditë para eventit: kapari humbet.

## Pagesa e mbetur

- Pjesa e mbetur paguhet në kesh kur merrni dekorin në punishte.`
    : `## Rezervimi

- Pas rezervimit, ${b.emri} ju kontakton për ta konfirmuar.
- Data mbahet për ju nga momenti i rezervimit.

## Pagesa

- Dekori merret dhe kthehet në punishte.
- E gjithë shuma paguhet në kesh kur merrni dekorin.

## Anulimi

- Nëse nuk mund të vini, na njoftoni sa më shpejt, që data t'i lirohet një klienti tjetër.`;

  return `${rezervimi}

## Garancia dhe dëmtimet

- Për disa dekore mbahet një garanci në kesh në momentin e marrjes.
- Garancia kthehet pasi dekori kthehet dhe kontrollohet.
- Dëmtimet e shkaktuara gjatë përdorimit zbriten nga garancia.

## Ngjyrat dhe kërkesat e veçanta

- Ngjyrat e veçanta, tekstet dhe shënimet konfirmohen nga ${b.emri}.
- Ngjyrat në ekran mund të duken pak ndryshe nga realiteti.`;
}
