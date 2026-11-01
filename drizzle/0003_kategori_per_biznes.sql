-- Categories become per-business. Every business gets its own copy of the
-- previously shared categories, products are re-pointed to their business's
-- copy, then the shared rows are removed.
ALTER TABLE "kategori" DROP CONSTRAINT "kategori_slug_unique";--> statement-breakpoint
ALTER TABLE "kategori" ADD COLUMN "biznes_id" uuid;--> statement-breakpoint
INSERT INTO "kategori" ("id", "biznes_id", "emri", "slug", "renditja")
  SELECT gen_random_uuid(), b."id", k."emri", k."slug", k."renditja"
  FROM "kategori" k CROSS JOIN "biznes" b
  WHERE k."biznes_id" IS NULL;--> statement-breakpoint
UPDATE "produkt" p SET "kategori_id" = e_re."id"
  FROM "kategori" e_vjeter, "kategori" e_re
  WHERE p."kategori_id" = e_vjeter."id"
    AND e_vjeter."biznes_id" IS NULL
    AND e_re."biznes_id" = p."biznes_id"
    AND e_re."slug" = e_vjeter."slug";--> statement-breakpoint
DELETE FROM "kategori" WHERE "biznes_id" IS NULL;--> statement-breakpoint
ALTER TABLE "kategori" ALTER COLUMN "biznes_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "kategori" ADD CONSTRAINT "kategori_biznes_id_biznes_id_fk" FOREIGN KEY ("biznes_id") REFERENCES "public"."biznes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "kategori_biznes_slug" ON "kategori" USING btree ("biznes_id","slug");
