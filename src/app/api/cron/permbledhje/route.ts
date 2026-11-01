import { NextResponse } from "next/server";
import { db } from "@/db";
import { biznes } from "@/db/schema";
import { eshteKerkesePerCron } from "@/lib/cron";
import { permbledhjaDitore } from "@/lib/notify";

// Daily at 08:00 Tirana time: today's deliveries, returns and open holds, per business.
export async function GET(req: Request) {
  if (!eshteKerkesePerCron(req)) return NextResponse.json({ gabim: "Unauthorized" }, { status: 401 });
  const bizneset = await db.select({ id: biznes.id }).from(biznes);
  let derguar = 0;
  for (const b of bizneset) if (await permbledhjaDitore(b.id)) derguar++;
  return NextResponse.json({ bizneset: bizneset.length, derguar });
}
