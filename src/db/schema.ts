import { relations, sql } from "drizzle-orm";
import {
  boolean,
  date,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

// Every tenant-owned table carries biznes_id (docs/PLAN.md §3).
// Money is stored as whole units of the business currency (LEK has no
// subunits in practice; EUR decor prices are whole euros).

export const monedha = pgEnum("monedha", ["LEK", "EUR"]);
export const roli = pgEnum("roli", ["PRONAR", "STAF"]);
export const statusiProduktit = pgEnum("statusi_produktit", [
  "AKTIV",
  "NE_MIREMBAJTJE",
  "SHITUR",
  "I_TERHEQUR",
]);
export const llojiOpsionit = pgEnum("lloji_opsionit", ["NGJYRE", "TEKST", "NUMER", "ZGJEDHJE"]);
export const statusiRezervimit = pgEnum("statusi_rezervimit", [
  "NE_PRITJE_TE_APROVIMIT",
  "NE_PRITJE_TE_KAPARIT",
  "KONFIRMUAR",
  "DOREZUAR",
  "PERFUNDUAR",
  "ANULUAR",
  "REFUZUAR",
  "SKADUAR",
  "MOSPARAQITJE",
]);
export const llojiRezervimit = pgEnum("lloji_rezervimit", ["QIRA", "POROSI", "BLERJE"]);
export const menyraDorezimit = pgEnum("menyra_dorezimit", ["MARRJE", "DERGESE"]);
export const llojiPageses = pgEnum("lloji_pageses", ["KAPAR", "MBETJE", "GARANCI", "KTHIM_GARANCIE"]);
export const menyraPageses = pgEnum("menyra_pageses", ["KESH"]);
export const kanaliNjoftimit = pgEnum("kanali_njoftimit", ["WHATSAPP", "PUSH"]);
export const statusiNjoftimit = pgEnum("statusi_njoftimit", ["DERGUAR", "DESHTOI", "ANASHKALUAR"]);

const krijuarMe = () => timestamp("krijuar_me", { withTimezone: true }).notNull().defaultNow();
const biznesId = () =>
  uuid("biznes_id")
    .notNull()
    .references(() => biznes.id, { onDelete: "cascade" });

export const biznes = pgTable("biznes", {
  id: uuid("id").primaryKey().defaultRandom(),
  emri: text("emri").notNull(),
  slug: text("slug").notNull().unique(),
  kodiPrefix: text("kodi_prefix").notNull(),
  logoRruga: text("logo_rruga"),
  ngjyraPrimare: text("ngjyra_primare").notNull().default("#c084fc"),
  qyteti: text("qyteti").notNull().default("Tiranë"),
  adresaPunishtes: text("adresa_punishtes"),
  googleMapsUrl: text("google_maps_url"),
  orariPunes: text("orari_punes"),
  telefoni: text("telefoni"),
  whatsappPronarit: text("whatsapp_pronarit"),
  instagram: text("instagram"),
  email: text("email"),
  nipt: text("nipt"),
  monedha: monedha("monedha").notNull().default("LEK"),
  // Off: the owner confirms each reservation and everything is paid at pickup.
  // On: the date is held for oretMbajtjes until the kapar is paid in cash.
  kerkonKapar: boolean("kerkon_kapar").notNull().default(false),
  kapariPerqindje: integer("kapari_perqindje").notNull().default(30),
  kapariMinimum: integer("kapari_minimum").notNull().default(3000),
  oretMbajtjes: integer("oret_mbajtjes").notNull().default(48),
  kushtet: text("kushtet"),
  numeruesiRezervimeve: integer("numeruesi_rezervimeve").notNull().default(0),
  krijuarMe: krijuarMe(),
});

export const perdorues = pgTable("perdorues", {
  id: uuid("id").primaryKey().defaultRandom(),
  biznesId: biznesId(),
  email: text("email").notNull().unique(),
  emri: text("emri").notNull(),
  fjalekalimiHash: text("fjalekalimi_hash").notNull(),
  roli: roli("roli").notNull().default("PRONAR"),
  krijuarMe: krijuarMe(),
});

export const sesion = pgTable("sesion", {
  // sha256 of the cookie token — the raw token never touches the database
  id: text("id").primaryKey(),
  biznesId: biznesId(),
  perdoruesId: uuid("perdorues_id")
    .notNull()
    .references(() => perdorues.id, { onDelete: "cascade" }),
  skadonMe: timestamp("skadon_me", { withTimezone: true }).notNull(),
});

// Each business manages its own categories (Produktet → Kategoritë).
export const kategori = pgTable(
  "kategori",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    biznesId: biznesId(),
    emri: text("emri").notNull(),
    slug: text("slug").notNull(),
    renditja: integer("renditja").notNull().default(0),
  },
  (t) => [uniqueIndex("kategori_biznes_slug").on(t.biznesId, t.slug)],
);

// Shared taxonomy (not tenant-owned)
export const tema = pgTable("tema", {
  id: uuid("id").primaryKey().defaultRandom(),
  emri: text("emri").notNull(),
  slug: text("slug").notNull().unique(),
});

export const produkt = pgTable(
  "produkt",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    biznesId: biznesId(),
    emri: text("emri").notNull(),
    slug: text("slug").notNull(),
    pershkrimi: text("pershkrimi"),
    kategoriId: uuid("kategori_id").references(() => kategori.id, { onDelete: "set null" }),
    modet: text("modet").array().notNull().default(sql`ARRAY['RENTAL']::text[]`),
    gjeresiCm: integer("gjeresi_cm"),
    lartesiCm: integer("lartesi_cm"),
    thellesiCm: integer("thellesi_cm"),
    peshaKg: integer("pesha_kg"),
    materiali: text("materiali"),
    cmimiQira: integer("cmimi_qira"),
    cmimiPorosi: integer("cmimi_porosi"),
    cmimiShitje: integer("cmimi_shitje"),
    garanciaDemtimit: integer("garancia_demtimit").notNull().default(0),
    sasiaNeStok: integer("sasia_ne_stok").notNull().default(1),
    diteMontimi: integer("dite_montimi").notNull().default(0),
    diteCmontimi: integer("dite_cmontimi").notNull().default(0),
    diteProdhimi: integer("dite_prodhimi"),
    shenimetKerkojneAprovim: boolean("shenimet_kerkojne_aprovim").notNull().default(false),
    statusi: statusiProduktit("statusi").notNull().default("AKTIV"),
    renditja: integer("renditja").notNull().default(0),
    krijuarMe: krijuarMe(),
  },
  (t) => [uniqueIndex("produkt_biznes_slug").on(t.biznesId, t.slug)],
);

export const produktTema = pgTable(
  "produkt_tema",
  {
    biznesId: biznesId(),
    produktId: uuid("produkt_id")
      .notNull()
      .references(() => produkt.id, { onDelete: "cascade" }),
    temaId: uuid("tema_id")
      .notNull()
      .references(() => tema.id, { onDelete: "cascade" }),
  },
  (t) => [primaryKey({ columns: [t.produktId, t.temaId] })],
);

export const foto = pgTable(
  "foto",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    biznesId: biznesId(),
    produktId: uuid("produkt_id")
      .notNull()
      .references(() => produkt.id, { onDelete: "cascade" }),
    rruga: text("rruga").notNull(),
    // lowest renditja is the main photo
    renditja: integer("renditja").notNull().default(0),
  },
  (t) => [index("foto_produkt").on(t.produktId)],
);

export const paletaNgjyrave = pgTable("paleta_ngjyrave", {
  id: uuid("id").primaryKey().defaultRandom(),
  biznesId: biznesId(),
  emri: text("emri").notNull(),
  hex: text("hex").notNull(),
  cmimiShtese: integer("cmimi_shtese").notNull().default(0),
  renditja: integer("renditja").notNull().default(0),
});

export const opsionProdukti = pgTable("opsion_produkti", {
  id: uuid("id").primaryKey().defaultRandom(),
  biznesId: biznesId(),
  produktId: uuid("produkt_id")
    .notNull()
    .references(() => produkt.id, { onDelete: "cascade" }),
  lloji: llojiOpsionit("lloji").notNull(),
  emri: text("emri").notNull(),
  iDetyrueshem: boolean("i_detyrueshem").notNull().default(false),
  gjatesiaMax: integer("gjatesia_max"),
  // extra price for TEKST / NUMER options
  cmimiShtese: integer("cmimi_shtese").notNull().default(0),
  lejonNgjyreTjeter: boolean("lejon_ngjyre_tjeter").notNull().default(false),
  renditja: integer("renditja").notNull().default(0),
});

export const vleraOpsioni = pgTable("vlera_opsioni", {
  id: uuid("id").primaryKey().defaultRandom(),
  biznesId: biznesId(),
  opsionId: uuid("opsion_id")
    .notNull()
    .references(() => opsionProdukti.id, { onDelete: "cascade" }),
  paletaId: uuid("paleta_id").references(() => paletaNgjyrave.id, { onDelete: "set null" }),
  emri: text("emri").notNull(),
  hex: text("hex"),
  fotoId: uuid("foto_id").references(() => foto.id, { onDelete: "set null" }),
  cmimiShtese: integer("cmimi_shtese").notNull().default(0),
  diteShtese: integer("dite_shtese").notNull().default(0),
  renditja: integer("renditja").notNull().default(0),
});

export const klient = pgTable(
  "klient",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    biznesId: biznesId(),
    emri: text("emri").notNull(),
    telefoni: text("telefoni").notNull(),
    qyteti: text("qyteti"),
    numriMosparaqitjeve: integer("numri_mosparaqitjeve").notNull().default(0),
    krijuarMe: krijuarMe(),
  },
  (t) => [uniqueIndex("klient_biznes_telefoni").on(t.biznesId, t.telefoni)],
);

export type ZgjedhjeRuajtur = {
  opsioni: string;
  lloji: "NGJYRE" | "TEKST" | "NUMER" | "ZGJEDHJE";
  vlera: string;
  hex?: string | null;
  eshteNgjyreTjeter?: boolean;
  cmimiShtese: number;
  diteShtese: number;
};

export const rezervim = pgTable(
  "rezervim",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    biznesId: biznesId(),
    kodi: text("kodi").notNull(),
    tokenPublik: text("token_publik").notNull().unique(),
    klientId: uuid("klient_id")
      .notNull()
      .references(() => klient.id),
    lloji: llojiRezervimit("lloji").notNull().default("QIRA"),
    dataEventit: date("data_eventit").notNull(),
    llojiEventit: text("lloji_eventit"),
    menyraDorezimit: menyraDorezimit("menyra_dorezimit").notNull().default("MARRJE"),
    adresaDorezimit: text("adresa_dorezimit"),
    tarifaTransportit: integer("tarifa_transportit").notNull().default(0),
    statusi: statusiRezervimit("statusi").notNull(),
    mbahetDeri: timestamp("mbahet_deri", { withTimezone: true }),
    nentotali: integer("nentotali").notNull(),
    kapari: integer("kapari").notNull(),
    garancia: integer("garancia").notNull().default(0),
    shenimeKlienti: text("shenime_klienti"),
    shenimeBrendshme: text("shenime_brendshme"),
    arsyejaRefuzimit: text("arsyeja_refuzimit"),
    kujtuarSkadimi: boolean("kujtuar_skadimi").notNull().default(false),
    krijuarMe: krijuarMe(),
  },
  (t) => [
    uniqueIndex("rezervim_biznes_kodi").on(t.biznesId, t.kodi),
    index("rezervim_biznes_statusi").on(t.biznesId, t.statusi),
    index("rezervim_biznes_data").on(t.biznesId, t.dataEventit),
  ],
);

export const rezervimRresht = pgTable(
  "rezervim_rresht",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    biznesId: biznesId(),
    rezervimId: uuid("rezervim_id")
      .notNull()
      .references(() => rezervim.id, { onDelete: "cascade" }),
    produktId: uuid("produkt_id")
      .notNull()
      .references(() => produkt.id),
    emriProduktit: text("emri_produktit").notNull(),
    sasia: integer("sasia").notNull().default(1),
    // base price + option extras, per unit; owner may override on approval
    cmimiNjesi: integer("cmimi_njesi").notNull(),
    zgjedhjet: jsonb("zgjedhjet").$type<ZgjedhjeRuajtur[]>().notNull().default([]),
    shenimi: text("shenimi"),
    kerkonAprovim: boolean("kerkon_aprovim").notNull().default(false),
    // the item is blocked over this window (event date ± buffers ± repaint days)
    dritarjaNga: date("dritarja_nga").notNull(),
    dritarjaDeri: date("dritarja_deri").notNull(),
  },
  (t) => [
    index("rresht_rezervim").on(t.rezervimId),
    index("rresht_produkt_dritarja").on(t.produktId, t.dritarjaNga, t.dritarjaDeri),
  ],
);

export const fotoFrymezimi = pgTable("foto_frymezimi", {
  id: uuid("id").primaryKey().defaultRandom(),
  biznesId: biznesId(),
  rreshtId: uuid("rresht_id")
    .notNull()
    .references(() => rezervimRresht.id, { onDelete: "cascade" }),
  rruga: text("rruga").notNull(),
});

export const pagese = pgTable("pagese", {
  id: uuid("id").primaryKey().defaultRandom(),
  biznesId: biznesId(),
  rezervimId: uuid("rezervim_id")
    .notNull()
    .references(() => rezervim.id, { onDelete: "cascade" }),
  shuma: integer("shuma").notNull(),
  lloji: llojiPageses("lloji").notNull(),
  menyra: menyraPageses("menyra").notNull().default("KESH"),
  shenim: text("shenim"),
  regjistruarNga: uuid("regjistruar_nga").references(() => perdorues.id, { onDelete: "set null" }),
  krijuarMe: krijuarMe(),
});

export const historikRezervimi = pgTable("historik_rezervimi", {
  id: uuid("id").primaryKey().defaultRandom(),
  biznesId: biznesId(),
  rezervimId: uuid("rezervim_id")
    .notNull()
    .references(() => rezervim.id, { onDelete: "cascade" }),
  ngaStatusi: statusiRezervimit("nga_statusi"),
  neStatusi: statusiRezervimit("ne_statusi").notNull(),
  perdoruesId: uuid("perdorues_id").references(() => perdorues.id, { onDelete: "set null" }),
  shenim: text("shenim"),
  krijuarMe: krijuarMe(),
});

export const bllokimDate = pgTable("bllokim_date", {
  id: uuid("id").primaryKey().defaultRandom(),
  biznesId: biznesId(),
  // null = the whole business is closed
  produktId: uuid("produkt_id").references(() => produkt.id, { onDelete: "cascade" }),
  nga: date("nga").notNull(),
  deri: date("deri").notNull(),
  arsyeja: text("arsyeja"),
});

export const pushAbonim = pgTable("push_abonim", {
  id: uuid("id").primaryKey().defaultRandom(),
  biznesId: biznesId(),
  perdoruesId: uuid("perdorues_id")
    .notNull()
    .references(() => perdorues.id, { onDelete: "cascade" }),
  endpoint: text("endpoint").notNull().unique(),
  p256dh: text("p256dh").notNull(),
  auth: text("auth").notNull(),
  krijuarMe: krijuarMe(),
});

export const njoftim = pgTable("njoftim", {
  id: uuid("id").primaryKey().defaultRandom(),
  biznesId: biznesId(),
  kanali: kanaliNjoftimit("kanali").notNull(),
  marresi: text("marresi").notNull(),
  shablloni: text("shablloni").notNull(),
  statusi: statusiNjoftimit("statusi").notNull(),
  gabimi: text("gabimi"),
  krijuarMe: krijuarMe(),
});

export const produktRelations = relations(produkt, ({ many, one }) => ({
  fotot: many(foto),
  opsionet: many(opsionProdukti),
  temat: many(produktTema),
  kategori: one(kategori, { fields: [produkt.kategoriId], references: [kategori.id] }),
}));
export const fotoRelations = relations(foto, ({ one }) => ({
  produkt: one(produkt, { fields: [foto.produktId], references: [produkt.id] }),
}));
export const opsionRelations = relations(opsionProdukti, ({ one, many }) => ({
  produkt: one(produkt, { fields: [opsionProdukti.produktId], references: [produkt.id] }),
  vlerat: many(vleraOpsioni),
}));
export const vleraRelations = relations(vleraOpsioni, ({ one }) => ({
  opsion: one(opsionProdukti, { fields: [vleraOpsioni.opsionId], references: [opsionProdukti.id] }),
}));
export const produktTemaRelations = relations(produktTema, ({ one }) => ({
  produkt: one(produkt, { fields: [produktTema.produktId], references: [produkt.id] }),
  tema: one(tema, { fields: [produktTema.temaId], references: [tema.id] }),
}));
export const rezervimRelations = relations(rezervim, ({ one, many }) => ({
  klient: one(klient, { fields: [rezervim.klientId], references: [klient.id] }),
  rreshtat: many(rezervimRresht),
  pagesat: many(pagese),
  historiku: many(historikRezervimi),
}));
export const rreshtRelations = relations(rezervimRresht, ({ one, many }) => ({
  rezervim: one(rezervim, { fields: [rezervimRresht.rezervimId], references: [rezervim.id] }),
  produkt: one(produkt, { fields: [rezervimRresht.produktId], references: [produkt.id] }),
  fotot: many(fotoFrymezimi),
}));
export const fotoFrymezimiRelations = relations(fotoFrymezimi, ({ one }) => ({
  rresht: one(rezervimRresht, { fields: [fotoFrymezimi.rreshtId], references: [rezervimRresht.id] }),
}));
export const pageseRelations = relations(pagese, ({ one }) => ({
  rezervim: one(rezervim, { fields: [pagese.rezervimId], references: [rezervim.id] }),
}));
export const historikRelations = relations(historikRezervimi, ({ one }) => ({
  rezervim: one(rezervim, { fields: [historikRezervimi.rezervimId], references: [rezervim.id] }),
}));
export const klientRelations = relations(klient, ({ many }) => ({
  rezervimet: many(rezervim),
}));
