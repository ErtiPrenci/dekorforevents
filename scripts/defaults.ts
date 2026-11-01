import { db } from "@/db";
import { kategori, tema } from "@/db/schema";
import { slugify } from "@/lib/format";

// Starting data shared by the dev seed and the production setup.

export const KATEGORITE = [
  "Arkada",
  "Tavolina",
  "Sfonde & panele",
  "Shtëpiza",
  "Kioska & banakë",
  "Piedestale",
  "Shkronja & numra",
  "Ulëse",
];

export const TEMAT = ["Ditëlindje", "Princeshë", "K-Pop", "Boho", "Baby Shower", "Pagëzim", "Dasmë", "Fejesë"];

export const PALETA: [string, string, number][] = [
  ["Natyrale (dru)", "#d9b98c", 0],
  ["E bardhë", "#ffffff", 0],
  ["Rozë pastel", "#f6c1cf", 0],
  ["Lejla", "#c7a6e8", 0],
  ["Verdhë pastel", "#f5e38f", 0],
  ["Mente", "#a8e2c8", 0],
  ["Blu qielli", "#a9cdf0", 0],
  ["Ari", "#d4af37", 2000],
];

/** Shared categories and themes; safe to run again. */
export async function krijoTaksonomine() {
  for (const [i, emri] of KATEGORITE.entries()) {
    await db.insert(kategori).values({ emri, slug: slugify(emri), renditja: i }).onConflictDoNothing();
  }
  for (const emri of TEMAT) {
    await db.insert(tema).values({ emri, slug: slugify(emri) }).onConflictDoNothing();
  }
}
