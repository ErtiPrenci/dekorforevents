import "dotenv/config";
import { randomBytes } from "node:crypto";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { biznes, paletaNgjyrave, perdorues } from "@/db/schema";
import { hashFjalekalimin } from "@/lib/auth";
import { krijoTaksonomine, PALETA } from "./defaults";

// One-time production setup: the business, its owner login and a starting
// colour palette. No sample products — the owner adds his own.
//
//   SETUP_EMRI="Dekor for Events" SETUP_EMAIL=owner@example.com npm run setup
//
// Optional: SETUP_FJALEKALIMI (otherwise a strong one is generated and
// printed once), SETUP_PREFIX (reservation code prefix), SETUP_INSTAGRAM.

const emri = process.env.SETUP_EMRI?.trim();
const email = process.env.SETUP_EMAIL?.trim().toLowerCase();
const slug = process.env.DEFAULT_BIZNES_SLUG;
if (!emri || !email || !slug) {
  throw new Error("Set SETUP_EMRI, SETUP_EMAIL and DEFAULT_BIZNES_SLUG before running the setup.");
}
if (await db.query.biznes.findFirst({ where: eq(biznes.slug, slug) })) {
  console.log(`Biznesi "${slug}" ekziston tashmë — asgjë nuk u ndryshua.`);
  process.exit(0);
}

const fjalekalimi = process.env.SETUP_FJALEKALIMI || randomBytes(12).toString("base64url");
const prefix =
  process.env.SETUP_PREFIX?.trim().toUpperCase() ||
  emri
    .split(/\s+/)
    .map((f) => f[0])
    .join("")
    .toUpperCase()
    .replace(/[^A-Z]/g, "")
    .slice(0, 4) ||
  "R";

await krijoTaksonomine();
const [b] = await db
  .insert(biznes)
  .values({
    emri,
    slug,
    kodiPrefix: prefix,
    qyteti: "Tiranë",
    instagram: process.env.SETUP_INSTAGRAM?.replace(/^@/, "") || null,
  })
  .returning();
await db.insert(perdorues).values({
  biznesId: b.id,
  email,
  emri: "Pronari",
  fjalekalimiHash: await hashFjalekalimin(fjalekalimi),
  roli: "PRONAR",
});
await db
  .insert(paletaNgjyrave)
  .values(PALETA.map(([n, hex, cmimiShtese], renditja) => ({ biznesId: b.id, emri: n, hex, cmimiShtese, renditja })));

console.log(`U krijua "${emri}" (kodet e rezervimeve: ${prefix}-…).`);
console.log(`Hyrja në panel: ${email}`);
if (!process.env.SETUP_FJALEKALIMI) console.log(`Fjalëkalimi (ruajeni tani, nuk shfaqet më): ${fjalekalimi}`);
process.exit(0);
