import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { produkt } from "@/db/schema";
import { kalendariIProduktit } from "@/lib/availability";
import { ditet } from "@/lib/dates";
import { merrBiznesinPublik } from "@/lib/tenant";

// GET /api/kalendari?produkt=<id>&muaji=2026-06 → { "2026-06-01": "I_LIRE", ... }
export async function GET(req: Request) {
  const url = new URL(req.url);
  const produktId = url.searchParams.get("produkt") ?? "";
  const muaji = url.searchParams.get("muaji") ?? "";
  if (!/^[0-9a-f-]{36}$/.test(produktId) || !/^\d{4}-(0[1-9]|1[0-2])$/.test(muaji)) {
    return NextResponse.json({ gabim: "Parametra të pavlefshëm" }, { status: 400 });
  }
  const b = await merrBiznesinPublik();
  const p = await db.query.produkt.findFirst({ where: and(eq(produkt.id, produktId), eq(produkt.biznesId, b.id)) });
  if (!p) return NextResponse.json({ gabim: "Nuk u gjet" }, { status: 404 });

  const [y, m] = muaji.split("-").map(Number);
  const fundi = new Date(Date.UTC(y, m, 0)).toISOString().slice(0, 10);
  const kalendari = await kalendariIProduktit(b.id, p, ditet(`${muaji}-01`, fundi));
  return NextResponse.json(kalendari, { headers: { "Cache-Control": "no-store" } });
}
