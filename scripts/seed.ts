import "dotenv/config";
import { existsSync, readFileSync } from "node:fs";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import {
  biznes,
  foto,
  kategori,
  opsionProdukti,
  paletaNgjyrave,
  perdorues,
  produkt,
  produktTema,
  tema,
  vleraOpsioni,
} from "@/db/schema";
import { hashFjalekalimin } from "@/lib/auth";
import { slugify } from "@/lib/format";
import { ruajFoto } from "@/lib/storage";
import { krijoTaksonomine, PALETA } from "./defaults";

// Development seed: the shared taxonomy, the first business (Dekor_for_Events)
// with an owner login, a colour palette and five sample products.

const email = process.env.SEED_ADMIN_EMAIL;
const fjalekalimi = process.env.SEED_ADMIN_PASSWORD;
if (!email || !fjalekalimi) throw new Error("Set SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD in .env");
const slug = process.env.DEFAULT_BIZNES_SLUG ?? "dekor-for-events";

if (await db.query.biznes.findFirst({ where: eq(biznes.slug, slug) })) {
  console.log(`Biznesi "${slug}" ekziston tashmë — asgjë për të bërë. Përdor npm run db:reset për të filluar nga e para.`);
  process.exit(0);
}


const [b] = await db
  .insert(biznes)
  .values({
    emri: "Dekor for Events",
    slug,
    kodiPrefix: "DFE",
    ngjyraPrimare: "#b07cd8",
    qyteti: "Tiranë",
    orariPunes: "E hënë – E shtunë, 09:00 – 19:00",
    instagram: "dekor_for_events",
  })
  .returning();

await krijoTaksonomine(b.id);
const kat = Object.fromEntries(
  (await db.select().from(kategori).where(eq(kategori.biznesId, b.id))).map((k) => [k.emri, k.id]),
);
const tem = Object.fromEntries((await db.select().from(tema)).map((t) => [t.emri, t.id]));

await db.insert(perdorues).values({
  biznesId: b.id,
  email: email.toLowerCase(),
  emri: "Pronari",
  fjalekalimiHash: await hashFjalekalimin(fjalekalimi),
  roli: "PRONAR",
});

const paleta = await db
  .insert(paletaNgjyrave)
  .values(PALETA.map(([emri, hex, cmimiShtese], renditja) => ({ biznesId: b.id, emri, hex, cmimiShtese, renditja })))
  .returning();
const ngjyra = (emrat: string[], diteShtese = 0, cmimiShtese?: number) =>
  paleta
    .filter((p) => emrat.includes(p.emri))
    .map((p, renditja) => ({
      paletaId: p.id,
      emri: p.emri,
      hex: p.hex,
      cmimiShtese: cmimiShtese ?? p.cmimiShtese,
      diteShtese,
      renditja,
    }));

type Opsion = {
  lloji: "NGJYRE" | "TEKST" | "NUMER" | "ZGJEDHJE";
  emri: string;
  iDetyrueshem?: boolean;
  gjatesiaMax?: number;
  cmimiShtese?: number;
  lejonNgjyreTjeter?: boolean;
  vlerat?: ReturnType<typeof ngjyra>;
};

async function shtoProdukt(
  p: Omit<typeof produkt.$inferInsert, "biznesId" | "slug">,
  kategoria: string,
  temat: string[],
  fotoSkedar: string,
  opsionet: Opsion[],
) {
  const [r] = await db
    .insert(produkt)
    .values({ ...p, biznesId: b.id, slug: slugify(p.emri), kategoriId: kat[kategoria] })
    .returning();
  await db.insert(produktTema).values(temat.map((t) => ({ biznesId: b.id, produktId: r.id, temaId: tem[t] })));
  const skedari = `scripts/seed-images/${fotoSkedar}`;
  if (existsSync(skedari)) {
    const rruga = await ruajFoto(b.id, "produkte", readFileSync(skedari));
    await db.insert(foto).values({ biznesId: b.id, produktId: r.id, rruga, renditja: 0 });
  }
  for (const [i, o] of opsionet.entries()) {
    const [op] = await db
      .insert(opsionProdukti)
      .values({
        biznesId: b.id,
        produktId: r.id,
        lloji: o.lloji,
        emri: o.emri,
        iDetyrueshem: o.iDetyrueshem ?? false,
        gjatesiaMax: o.gjatesiaMax,
        cmimiShtese: o.cmimiShtese ?? 0,
        lejonNgjyreTjeter: o.lejonNgjyreTjeter ?? false,
        renditja: i,
      })
      .returning();
    if (o.vlerat?.length) {
      await db.insert(vleraOpsioni).values(o.vlerat.map((v) => ({ ...v, biznesId: b.id, opsionId: op.id })));
    }
  }
}

await shtoProdukt(
  {
    emri: "Arkadë me valë",
    pershkrimi:
      "Arkadë dekorative me tre shtresa në formë valësh, e punuar me dorë nga druri. Qendra e çdo sfondi për ditëlindje, fejesa dhe dasma.",
    modet: ["RENTAL", "CUSTOM"],
    gjeresiCm: 220,
    lartesiCm: 240,
    thellesiCm: 40,
    materiali: "Dru MDF, i lyer",
    cmimiQira: 15000,
    cmimiPorosi: 65000,
    garanciaDemtimit: 10000,
    diteMontimi: 1,
    diteCmontimi: 1,
    diteProdhimi: 14,
  },
  "Arkada",
  ["Ditëlindje", "Boho", "Dasmë", "Fejesë"],
  "arkade.png",
  [
    {
      lloji: "NGJYRE",
      emri: "Ngjyra",
      iDetyrueshem: true,
      lejonNgjyreTjeter: true,
      vlerat: [
        ...ngjyra(["Natyrale (dru)"]),
        ...ngjyra(["E bardhë", "Rozë pastel", "Lejla", "Ari"], 2, 3000).map((v, i) => ({ ...v, renditja: i + 1 })),
      ],
    },
  ],
);

await shtoProdukt(
  {
    emri: "Tavolinë lule",
    pershkrimi: "Tavolinë e ulët në formë luleje për fëmijë, perfekte për festat e ditëlindjeve dhe baby shower.",
    modet: ["RENTAL", "CUSTOM"],
    gjeresiCm: 120,
    lartesiCm: 45,
    thellesiCm: 120,
    materiali: "Dru MDF",
    cmimiQira: 2500,
    cmimiPorosi: 18000,
    sasiaNeStok: 6,
    diteMontimi: 0,
    diteCmontimi: 1,
    diteProdhimi: 10,
  },
  "Tavolina",
  ["Ditëlindje", "Baby Shower", "Pagëzim"],
  "tavolina-lule.png",
  [
    {
      lloji: "NGJYRE",
      emri: "Ngjyra",
      vlerat: ngjyra(["Natyrale (dru)", "E bardhë", "Rozë pastel", "Verdhë pastel", "Mente"]),
    },
  ],
);

await shtoProdukt(
  {
    emri: "Shtëpizë përrallash",
    pershkrimi: "Shtëpizë lojërash me çati në formë luleje, derë dhe dritare që hapen. Fëmijët mund të hyjnë brenda.",
    modet: ["RENTAL", "CUSTOM"],
    gjeresiCm: 130,
    lartesiCm: 220,
    thellesiCm: 130,
    materiali: "Dru, i lyer me dorë",
    cmimiQira: 20000,
    cmimiPorosi: 90000,
    garanciaDemtimit: 15000,
    diteMontimi: 1,
    diteCmontimi: 1,
    diteProdhimi: 21,
  },
  "Shtëpiza",
  ["Princeshë", "Ditëlindje", "Baby Shower"],
  "shtepize.png",
  [
    {
      lloji: "NGJYRE",
      emri: "Ngjyra e çatisë",
      iDetyrueshem: true,
      vlerat: ngjyra(["Mente", "Rozë pastel", "Lejla", "Blu qielli"]),
    },
  ],
);

await shtoProdukt(
  {
    emri: "Kioskë ëmbëlsirash",
    pershkrimi: "Kioskë me tendë, banak me rrjetë dhe dy stola lule. Ideale për tavolinën e ëmbëlsirave.",
    modet: ["RENTAL"],
    gjeresiCm: 200,
    lartesiCm: 230,
    thellesiCm: 80,
    materiali: "Dru MDF",
    cmimiQira: 18000,
    garanciaDemtimit: 10000,
    diteMontimi: 1,
    diteCmontimi: 1,
  },
  "Kioska & banakë",
  ["Ditëlindje", "Princeshë", "Baby Shower"],
  "kioske.png",
  [],
);

await shtoProdukt(
  {
    emri: "Set ditëlindjeje K-Pop",
    pershkrimi:
      "Set i plotë me panel kryesor, shkronjat e emrit, numrin e moshës dhe piedestalet. Personalizohet me emrin e fëmijës.",
    modet: ["RENTAL"],
    gjeresiCm: 500,
    lartesiCm: 260,
    thellesiCm: 150,
    materiali: "Dru MDF, akrilik",
    cmimiQira: 35000,
    garanciaDemtimit: 20000,
    diteMontimi: 1,
    diteCmontimi: 1,
    shenimetKerkojneAprovim: true,
  },
  "Sfonde & panele",
  ["K-Pop", "Ditëlindje"],
  "kpop.png",
  [
    {
      lloji: "NGJYRE",
      emri: "Ngjyra kryesore",
      iDetyrueshem: true,
      lejonNgjyreTjeter: true,
      vlerat: ngjyra(["Lejla", "Rozë pastel", "Blu qielli"]),
    },
    { lloji: "TEKST", emri: "Emri mbi panel", gjatesiaMax: 12, cmimiShtese: 3000 },
    { lloji: "NUMER", emri: "Mosha", cmimiShtese: 1000 },
  ],
);

console.log(`U krijua biznesi "${b.emri}" me 5 produkte. Hyrja: ${email} (fjalëkalimi është te .env).`);
process.exit(0);
