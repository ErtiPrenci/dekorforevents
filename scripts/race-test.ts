import "dotenv/config";
import { eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { biznes, klient, produkt, rezervim } from "@/db/schema";
import { GabimRezervimi, krijoRezervim } from "@/lib/reservations";

// Fires N simultaneous reservations for the same single-copy product and date.
// Exactly one must succeed. Cleans up after itself.

const N = 8;
const DATA = "2027-01-16";
const b = (await db.query.biznes.findFirst({ where: eq(biznes.slug, process.env.DEFAULT_BIZNES_SLUG!) }))!;
const p = (await db.query.produkt.findFirst({ where: eq(produkt.slug, "kioske-embelsirash") }))!;

const rezultatet = await Promise.allSettled(
  Array.from({ length: N }, (_, i) =>
    krijoRezervim(b, {
      dataEventit: DATA,
      emri: `Gara ${i}`,
      telefoni: `0690000${String(100 + i)}`,
      menyraDorezimit: "MARRJE",
      artikujt: [{ produktId: p.id, sasia: 1, zgjedhjet: [], fotot: [] }],
    }),
  ),
);

const sukses = rezultatet.filter((r) => r.status === "fulfilled");
const refuzuar = rezultatet.filter((r) => r.status === "rejected" && r.reason instanceof GabimRezervimi);
const teTjera = rezultatet.filter((r) => r.status === "rejected" && !(r.reason instanceof GabimRezervimi));
console.log(`Sukses: ${sukses.length}, refuzuar si "i zënë": ${refuzuar.length}, gabime të tjera: ${teTjera.length}`);
if (refuzuar[0]?.status === "rejected") console.log(`Mesazhi: ${refuzuar[0].reason.message}`);
for (const r of teTjera) if (r.status === "rejected") console.error(r.reason);

const ids = sukses.map((r) => (r as PromiseFulfilledResult<{ id: string }>).value.id);
if (ids.length) await db.delete(rezervim).where(inArray(rezervim.id, ids));
await db.delete(klient).where(inArray(klient.telefoni, Array.from({ length: N }, (_, i) => `+355690000${String(100 + i)}`)));

const ok = sukses.length === 1 && refuzuar.length === N - 1;
console.log(ok ? "OK — vetëm një rezervim kaloi." : "DËSHTOI — mbirezervim!");
process.exit(ok ? 0 : 1);
