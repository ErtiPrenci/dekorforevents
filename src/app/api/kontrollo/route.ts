import { and, eq, inArray } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/db";
import { produkt } from "@/db/schema";
import { kontrolloShporten } from "@/lib/availability";
import { eshteDateValide } from "@/lib/dates";
import { merrBiznesinPublik } from "@/lib/tenant";

const Hyrja = z.object({
  dataEventit: z.string().refine(eshteDateValide),
  artikujt: z
    .array(z.object({ produktId: z.uuid(), sasia: z.int().min(1).max(100), diteShtese: z.int().min(0).max(60) }))
    .max(30),
});

// POST — live availability check of the cart when the customer changes the date.
export async function POST(req: Request) {
  const parsed = Hyrja.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ gabim: "Kërkesë e pavlefshme" }, { status: 400 });
  const { dataEventit, artikujt } = parsed.data;
  const b = await merrBiznesinPublik();
  const ids = [...new Set(artikujt.map((a) => a.produktId))];
  const produktet = ids.length
    ? await db.select().from(produkt).where(and(eq(produkt.biznesId, b.id), inArray(produkt.id, ids)))
    : [];
  const gjendjet = await kontrolloShporten(b.id, produktet, dataEventit, artikujt);
  return NextResponse.json({ gjendjet });
}
