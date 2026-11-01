CREATE TYPE "public"."kanali_njoftimit" AS ENUM('WHATSAPP', 'PUSH');--> statement-breakpoint
CREATE TYPE "public"."lloji_opsionit" AS ENUM('NGJYRE', 'TEKST', 'NUMER', 'ZGJEDHJE');--> statement-breakpoint
CREATE TYPE "public"."lloji_pageses" AS ENUM('KAPAR', 'MBETJE', 'GARANCI', 'KTHIM_GARANCIE');--> statement-breakpoint
CREATE TYPE "public"."lloji_rezervimit" AS ENUM('QIRA', 'POROSI', 'BLERJE');--> statement-breakpoint
CREATE TYPE "public"."menyra_dorezimit" AS ENUM('MARRJE', 'DERGESE');--> statement-breakpoint
CREATE TYPE "public"."menyra_pageses" AS ENUM('KESH');--> statement-breakpoint
CREATE TYPE "public"."monedha" AS ENUM('LEK', 'EUR');--> statement-breakpoint
CREATE TYPE "public"."roli" AS ENUM('PRONAR', 'STAF');--> statement-breakpoint
CREATE TYPE "public"."statusi_njoftimit" AS ENUM('DERGUAR', 'DESHTOI', 'ANASHKALUAR');--> statement-breakpoint
CREATE TYPE "public"."statusi_produktit" AS ENUM('AKTIV', 'NE_MIREMBAJTJE', 'SHITUR', 'I_TERHEQUR');--> statement-breakpoint
CREATE TYPE "public"."statusi_rezervimit" AS ENUM('NE_PRITJE_TE_APROVIMIT', 'NE_PRITJE_TE_KAPARIT', 'KONFIRMUAR', 'DOREZUAR', 'PERFUNDUAR', 'ANULUAR', 'REFUZUAR', 'SKADUAR', 'MOSPARAQITJE');--> statement-breakpoint
CREATE TABLE "biznes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"emri" text NOT NULL,
	"slug" text NOT NULL,
	"kodi_prefix" text NOT NULL,
	"logo_rruga" text,
	"ngjyra_primare" text DEFAULT '#c084fc' NOT NULL,
	"qyteti" text DEFAULT 'Tiranë' NOT NULL,
	"adresa_punishtes" text,
	"google_maps_url" text,
	"orari_punes" text,
	"telefoni" text,
	"whatsapp_pronarit" text,
	"instagram" text,
	"email" text,
	"monedha" "monedha" DEFAULT 'LEK' NOT NULL,
	"kapari_perqindje" integer DEFAULT 30 NOT NULL,
	"kapari_minimum" integer DEFAULT 3000 NOT NULL,
	"oret_mbajtjes" integer DEFAULT 48 NOT NULL,
	"kushtet" text,
	"numeruesi_rezervimeve" integer DEFAULT 0 NOT NULL,
	"krijuar_me" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "biznes_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "bllokim_date" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"biznes_id" uuid NOT NULL,
	"produkt_id" uuid,
	"nga" date NOT NULL,
	"deri" date NOT NULL,
	"arsyeja" text
);
--> statement-breakpoint
CREATE TABLE "foto" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"biznes_id" uuid NOT NULL,
	"produkt_id" uuid NOT NULL,
	"rruga" text NOT NULL,
	"renditja" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "foto_frymezimi" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"biznes_id" uuid NOT NULL,
	"rresht_id" uuid NOT NULL,
	"rruga" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "historik_rezervimi" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"biznes_id" uuid NOT NULL,
	"rezervim_id" uuid NOT NULL,
	"nga_statusi" "statusi_rezervimit",
	"ne_statusi" "statusi_rezervimit" NOT NULL,
	"perdorues_id" uuid,
	"shenim" text,
	"krijuar_me" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "kategori" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"emri" text NOT NULL,
	"slug" text NOT NULL,
	"renditja" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "kategori_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "klient" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"biznes_id" uuid NOT NULL,
	"emri" text NOT NULL,
	"telefoni" text NOT NULL,
	"qyteti" text,
	"numri_mosparaqitjeve" integer DEFAULT 0 NOT NULL,
	"krijuar_me" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "njoftim" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"biznes_id" uuid NOT NULL,
	"kanali" "kanali_njoftimit" NOT NULL,
	"marresi" text NOT NULL,
	"shablloni" text NOT NULL,
	"statusi" "statusi_njoftimit" NOT NULL,
	"gabimi" text,
	"krijuar_me" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "opsion_produkti" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"biznes_id" uuid NOT NULL,
	"produkt_id" uuid NOT NULL,
	"lloji" "lloji_opsionit" NOT NULL,
	"emri" text NOT NULL,
	"i_detyrueshem" boolean DEFAULT false NOT NULL,
	"gjatesia_max" integer,
	"cmimi_shtese" integer DEFAULT 0 NOT NULL,
	"lejon_ngjyre_tjeter" boolean DEFAULT false NOT NULL,
	"renditja" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pagese" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"biznes_id" uuid NOT NULL,
	"rezervim_id" uuid NOT NULL,
	"shuma" integer NOT NULL,
	"lloji" "lloji_pageses" NOT NULL,
	"menyra" "menyra_pageses" DEFAULT 'KESH' NOT NULL,
	"shenim" text,
	"regjistruar_nga" uuid,
	"krijuar_me" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "paleta_ngjyrave" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"biznes_id" uuid NOT NULL,
	"emri" text NOT NULL,
	"hex" text NOT NULL,
	"cmimi_shtese" integer DEFAULT 0 NOT NULL,
	"renditja" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "perdorues" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"biznes_id" uuid NOT NULL,
	"email" text NOT NULL,
	"emri" text NOT NULL,
	"fjalekalimi_hash" text NOT NULL,
	"roli" "roli" DEFAULT 'PRONAR' NOT NULL,
	"krijuar_me" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "perdorues_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "produkt" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"biznes_id" uuid NOT NULL,
	"emri" text NOT NULL,
	"slug" text NOT NULL,
	"pershkrimi" text,
	"kategori_id" uuid,
	"modet" text[] DEFAULT ARRAY['RENTAL']::text[] NOT NULL,
	"gjeresi_cm" integer,
	"lartesi_cm" integer,
	"thellesi_cm" integer,
	"pesha_kg" integer,
	"materiali" text,
	"cmimi_qira" integer,
	"cmimi_porosi" integer,
	"cmimi_shitje" integer,
	"garancia_demtimit" integer DEFAULT 0 NOT NULL,
	"sasia_ne_stok" integer DEFAULT 1 NOT NULL,
	"dite_montimi" integer DEFAULT 0 NOT NULL,
	"dite_cmontimi" integer DEFAULT 0 NOT NULL,
	"dite_prodhimi" integer,
	"shenimet_kerkojne_aprovim" boolean DEFAULT false NOT NULL,
	"statusi" "statusi_produktit" DEFAULT 'AKTIV' NOT NULL,
	"renditja" integer DEFAULT 0 NOT NULL,
	"krijuar_me" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "produkt_tema" (
	"biznes_id" uuid NOT NULL,
	"produkt_id" uuid NOT NULL,
	"tema_id" uuid NOT NULL,
	CONSTRAINT "produkt_tema_produkt_id_tema_id_pk" PRIMARY KEY("produkt_id","tema_id")
);
--> statement-breakpoint
CREATE TABLE "push_abonim" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"biznes_id" uuid NOT NULL,
	"perdorues_id" uuid NOT NULL,
	"endpoint" text NOT NULL,
	"p256dh" text NOT NULL,
	"auth" text NOT NULL,
	"krijuar_me" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "push_abonim_endpoint_unique" UNIQUE("endpoint")
);
--> statement-breakpoint
CREATE TABLE "rezervim" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"biznes_id" uuid NOT NULL,
	"kodi" text NOT NULL,
	"token_publik" text NOT NULL,
	"klient_id" uuid NOT NULL,
	"lloji" "lloji_rezervimit" DEFAULT 'QIRA' NOT NULL,
	"data_eventit" date NOT NULL,
	"lloji_eventit" text,
	"menyra_dorezimit" "menyra_dorezimit" DEFAULT 'MARRJE' NOT NULL,
	"adresa_dorezimit" text,
	"tarifa_transportit" integer DEFAULT 0 NOT NULL,
	"statusi" "statusi_rezervimit" NOT NULL,
	"mbahet_deri" timestamp with time zone,
	"nentotali" integer NOT NULL,
	"kapari" integer NOT NULL,
	"garancia" integer DEFAULT 0 NOT NULL,
	"shenime_klienti" text,
	"shenime_brendshme" text,
	"arsyeja_refuzimit" text,
	"kujtuar_skadimi" boolean DEFAULT false NOT NULL,
	"krijuar_me" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "rezervim_token_publik_unique" UNIQUE("token_publik")
);
--> statement-breakpoint
CREATE TABLE "rezervim_rresht" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"biznes_id" uuid NOT NULL,
	"rezervim_id" uuid NOT NULL,
	"produkt_id" uuid NOT NULL,
	"emri_produktit" text NOT NULL,
	"sasia" integer DEFAULT 1 NOT NULL,
	"cmimi_njesi" integer NOT NULL,
	"zgjedhjet" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"shenimi" text,
	"kerkon_aprovim" boolean DEFAULT false NOT NULL,
	"dritarja_nga" date NOT NULL,
	"dritarja_deri" date NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sesion" (
	"id" text PRIMARY KEY NOT NULL,
	"biznes_id" uuid NOT NULL,
	"perdorues_id" uuid NOT NULL,
	"skadon_me" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tema" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"emri" text NOT NULL,
	"slug" text NOT NULL,
	CONSTRAINT "tema_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "vlera_opsioni" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"biznes_id" uuid NOT NULL,
	"opsion_id" uuid NOT NULL,
	"paleta_id" uuid,
	"emri" text NOT NULL,
	"hex" text,
	"foto_id" uuid,
	"cmimi_shtese" integer DEFAULT 0 NOT NULL,
	"dite_shtese" integer DEFAULT 0 NOT NULL,
	"renditja" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
ALTER TABLE "bllokim_date" ADD CONSTRAINT "bllokim_date_biznes_id_biznes_id_fk" FOREIGN KEY ("biznes_id") REFERENCES "public"."biznes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bllokim_date" ADD CONSTRAINT "bllokim_date_produkt_id_produkt_id_fk" FOREIGN KEY ("produkt_id") REFERENCES "public"."produkt"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "foto" ADD CONSTRAINT "foto_biznes_id_biznes_id_fk" FOREIGN KEY ("biznes_id") REFERENCES "public"."biznes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "foto" ADD CONSTRAINT "foto_produkt_id_produkt_id_fk" FOREIGN KEY ("produkt_id") REFERENCES "public"."produkt"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "foto_frymezimi" ADD CONSTRAINT "foto_frymezimi_biznes_id_biznes_id_fk" FOREIGN KEY ("biznes_id") REFERENCES "public"."biznes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "foto_frymezimi" ADD CONSTRAINT "foto_frymezimi_rresht_id_rezervim_rresht_id_fk" FOREIGN KEY ("rresht_id") REFERENCES "public"."rezervim_rresht"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "historik_rezervimi" ADD CONSTRAINT "historik_rezervimi_biznes_id_biznes_id_fk" FOREIGN KEY ("biznes_id") REFERENCES "public"."biznes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "historik_rezervimi" ADD CONSTRAINT "historik_rezervimi_rezervim_id_rezervim_id_fk" FOREIGN KEY ("rezervim_id") REFERENCES "public"."rezervim"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "historik_rezervimi" ADD CONSTRAINT "historik_rezervimi_perdorues_id_perdorues_id_fk" FOREIGN KEY ("perdorues_id") REFERENCES "public"."perdorues"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "klient" ADD CONSTRAINT "klient_biznes_id_biznes_id_fk" FOREIGN KEY ("biznes_id") REFERENCES "public"."biznes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "njoftim" ADD CONSTRAINT "njoftim_biznes_id_biznes_id_fk" FOREIGN KEY ("biznes_id") REFERENCES "public"."biznes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "opsion_produkti" ADD CONSTRAINT "opsion_produkti_biznes_id_biznes_id_fk" FOREIGN KEY ("biznes_id") REFERENCES "public"."biznes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "opsion_produkti" ADD CONSTRAINT "opsion_produkti_produkt_id_produkt_id_fk" FOREIGN KEY ("produkt_id") REFERENCES "public"."produkt"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pagese" ADD CONSTRAINT "pagese_biznes_id_biznes_id_fk" FOREIGN KEY ("biznes_id") REFERENCES "public"."biznes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pagese" ADD CONSTRAINT "pagese_rezervim_id_rezervim_id_fk" FOREIGN KEY ("rezervim_id") REFERENCES "public"."rezervim"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pagese" ADD CONSTRAINT "pagese_regjistruar_nga_perdorues_id_fk" FOREIGN KEY ("regjistruar_nga") REFERENCES "public"."perdorues"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "paleta_ngjyrave" ADD CONSTRAINT "paleta_ngjyrave_biznes_id_biznes_id_fk" FOREIGN KEY ("biznes_id") REFERENCES "public"."biznes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "perdorues" ADD CONSTRAINT "perdorues_biznes_id_biznes_id_fk" FOREIGN KEY ("biznes_id") REFERENCES "public"."biznes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "produkt" ADD CONSTRAINT "produkt_biznes_id_biznes_id_fk" FOREIGN KEY ("biznes_id") REFERENCES "public"."biznes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "produkt" ADD CONSTRAINT "produkt_kategori_id_kategori_id_fk" FOREIGN KEY ("kategori_id") REFERENCES "public"."kategori"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "produkt_tema" ADD CONSTRAINT "produkt_tema_biznes_id_biznes_id_fk" FOREIGN KEY ("biznes_id") REFERENCES "public"."biznes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "produkt_tema" ADD CONSTRAINT "produkt_tema_produkt_id_produkt_id_fk" FOREIGN KEY ("produkt_id") REFERENCES "public"."produkt"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "produkt_tema" ADD CONSTRAINT "produkt_tema_tema_id_tema_id_fk" FOREIGN KEY ("tema_id") REFERENCES "public"."tema"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "push_abonim" ADD CONSTRAINT "push_abonim_biznes_id_biznes_id_fk" FOREIGN KEY ("biznes_id") REFERENCES "public"."biznes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "push_abonim" ADD CONSTRAINT "push_abonim_perdorues_id_perdorues_id_fk" FOREIGN KEY ("perdorues_id") REFERENCES "public"."perdorues"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rezervim" ADD CONSTRAINT "rezervim_biznes_id_biznes_id_fk" FOREIGN KEY ("biznes_id") REFERENCES "public"."biznes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rezervim" ADD CONSTRAINT "rezervim_klient_id_klient_id_fk" FOREIGN KEY ("klient_id") REFERENCES "public"."klient"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rezervim_rresht" ADD CONSTRAINT "rezervim_rresht_biznes_id_biznes_id_fk" FOREIGN KEY ("biznes_id") REFERENCES "public"."biznes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rezervim_rresht" ADD CONSTRAINT "rezervim_rresht_rezervim_id_rezervim_id_fk" FOREIGN KEY ("rezervim_id") REFERENCES "public"."rezervim"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rezervim_rresht" ADD CONSTRAINT "rezervim_rresht_produkt_id_produkt_id_fk" FOREIGN KEY ("produkt_id") REFERENCES "public"."produkt"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sesion" ADD CONSTRAINT "sesion_biznes_id_biznes_id_fk" FOREIGN KEY ("biznes_id") REFERENCES "public"."biznes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sesion" ADD CONSTRAINT "sesion_perdorues_id_perdorues_id_fk" FOREIGN KEY ("perdorues_id") REFERENCES "public"."perdorues"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vlera_opsioni" ADD CONSTRAINT "vlera_opsioni_biznes_id_biznes_id_fk" FOREIGN KEY ("biznes_id") REFERENCES "public"."biznes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vlera_opsioni" ADD CONSTRAINT "vlera_opsioni_opsion_id_opsion_produkti_id_fk" FOREIGN KEY ("opsion_id") REFERENCES "public"."opsion_produkti"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vlera_opsioni" ADD CONSTRAINT "vlera_opsioni_paleta_id_paleta_ngjyrave_id_fk" FOREIGN KEY ("paleta_id") REFERENCES "public"."paleta_ngjyrave"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vlera_opsioni" ADD CONSTRAINT "vlera_opsioni_foto_id_foto_id_fk" FOREIGN KEY ("foto_id") REFERENCES "public"."foto"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "foto_produkt" ON "foto" USING btree ("produkt_id");--> statement-breakpoint
CREATE UNIQUE INDEX "klient_biznes_telefoni" ON "klient" USING btree ("biznes_id","telefoni");--> statement-breakpoint
CREATE UNIQUE INDEX "produkt_biznes_slug" ON "produkt" USING btree ("biznes_id","slug");--> statement-breakpoint
CREATE UNIQUE INDEX "rezervim_biznes_kodi" ON "rezervim" USING btree ("biznes_id","kodi");--> statement-breakpoint
CREATE INDEX "rezervim_biznes_statusi" ON "rezervim" USING btree ("biznes_id","statusi");--> statement-breakpoint
CREATE INDEX "rezervim_biznes_data" ON "rezervim" USING btree ("biznes_id","data_eventit");--> statement-breakpoint
CREATE INDEX "rresht_rezervim" ON "rezervim_rresht" USING btree ("rezervim_id");--> statement-breakpoint
CREATE INDEX "rresht_produkt_dritarja" ON "rezervim_rresht" USING btree ("produkt_id","dritarja_nga","dritarja_deri");