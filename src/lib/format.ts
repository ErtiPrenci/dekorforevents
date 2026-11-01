export type Monedha = "LEK" | "EUR";

/** 6000 → "6.000 L", 25 → "25 €" */
export function formatoCmimin(shuma: number, monedha: Monedha = "LEK"): string {
  const numri = Math.round(shuma).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return monedha === "EUR" ? `${numri} €` : `${numri} L`;
}

export function slugify(tekst: string): string {
  return tekst
    .toLowerCase()
    .replace(/ë/g, "e")
    .replace(/ç/g, "c")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

export function formatoPermasat(p: { gjeresiCm: number | null; lartesiCm: number | null; thellesiCm: number | null }) {
  const pjeset = [p.gjeresiCm, p.lartesiCm, p.thellesiCm].filter((x): x is number => x != null);
  return pjeset.length ? `${pjeset.join(" × ")} cm` : null;
}
