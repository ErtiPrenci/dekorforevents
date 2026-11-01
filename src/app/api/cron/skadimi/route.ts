import { NextResponse } from "next/server";
import { eshteKerkesePerCron } from "@/lib/cron";
import { njoftoAfatetQeSkadojne } from "@/lib/notify";
import { skadoMbajtjet } from "@/lib/reservations";

// Every 15 minutes: free the dates of unpaid holds and warn owners about
// holds expiring within 6 hours.
export async function GET(req: Request) {
  if (!eshteKerkesePerCron(req)) return NextResponse.json({ gabim: "Unauthorized" }, { status: 401 });
  const skaduar = await skadoMbajtjet();
  const kujtesa = await njoftoAfatetQeSkadojne();
  return NextResponse.json({ skaduar: skaduar.length, kujtesa });
}
