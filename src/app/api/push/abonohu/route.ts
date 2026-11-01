import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/db";
import { pushAbonim } from "@/db/schema";
import { merrAdminin } from "@/lib/auth";

const Abonim = z.object({
  endpoint: z.url().max(1000),
  keys: z.object({ p256dh: z.string().max(200), auth: z.string().max(100) }),
});

// Registers this admin device for web push (the free backup to WhatsApp).
export async function POST(req: Request) {
  const admin = await merrAdminin();
  if (!admin) return NextResponse.json({ gabim: "Jo i loguar" }, { status: 401 });
  const parsed = Abonim.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ gabim: "Abonim i pavlefshëm" }, { status: 400 });
  const { endpoint, keys } = parsed.data;
  await db
    .insert(pushAbonim)
    .values({ biznesId: admin.biznesId, perdoruesId: admin.perdoruesId, endpoint, p256dh: keys.p256dh, auth: keys.auth })
    .onConflictDoUpdate({
      target: pushAbonim.endpoint,
      set: { biznesId: admin.biznesId, perdoruesId: admin.perdoruesId, p256dh: keys.p256dh, auth: keys.auth },
    });
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request) {
  const admin = await merrAdminin();
  if (!admin) return NextResponse.json({ gabim: "Jo i loguar" }, { status: 401 });
  const { endpoint } = (await req.json().catch(() => ({}))) as { endpoint?: string };
  if (endpoint) await db.delete(pushAbonim).where(and(eq(pushAbonim.endpoint, endpoint), eq(pushAbonim.biznesId, admin.biznesId)));
  return NextResponse.json({ ok: true });
}
