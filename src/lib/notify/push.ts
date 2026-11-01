import { eq, inArray } from "drizzle-orm";
import webpush from "web-push";
import { db } from "@/db";
import { pushAbonim } from "@/db/schema";
import type { RezultatDergimi } from "./whatsapp";

let konfiguruar = false;

export function pushEshteKonfiguruar() {
  return !!(process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY);
}

function konfiguro() {
  if (konfiguruar) return;
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT ?? "mailto:admin@example.com",
    process.env.VAPID_PUBLIC_KEY!,
    process.env.VAPID_PRIVATE_KEY!,
  );
  konfiguruar = true;
}

export type PushPayload = { titulli: string; teksti: string; url: string };

/** Sends to every admin device of the business. Dead subscriptions are removed. */
export async function dergoPush(biznesId: string, payload: PushPayload): Promise<RezultatDergimi & { marres: number }> {
  if (!pushEshteKonfiguruar()) return { statusi: "ANASHKALUAR", gabimi: "VAPID mungon", marres: 0 };
  konfiguro();
  const abonimet = await db.select().from(pushAbonim).where(eq(pushAbonim.biznesId, biznesId));
  if (!abonimet.length) return { statusi: "ANASHKALUAR", gabimi: "Asnjë pajisje e regjistruar", marres: 0 };

  const teVdekura: string[] = [];
  const gabimet: string[] = [];
  let derguar = 0;
  await Promise.all(
    abonimet.map(async (a) => {
      try {
        await webpush.sendNotification(
          { endpoint: a.endpoint, keys: { p256dh: a.p256dh, auth: a.auth } },
          JSON.stringify(payload),
          { TTL: 60 * 60 * 24 },
        );
        derguar++;
      } catch (e) {
        const kodi = (e as { statusCode?: number }).statusCode;
        if (kodi === 404 || kodi === 410) teVdekura.push(a.id);
        else gabimet.push(String(kodi ?? (e as Error).message));
      }
    }),
  );
  if (teVdekura.length) await db.delete(pushAbonim).where(inArray(pushAbonim.id, teVdekura));
  if (derguar) return { statusi: "DERGUAR", marres: derguar };
  return { statusi: "DESHTOI", gabimi: gabimet.join(", ") || "Asnjë pajisje aktive", marres: 0 };
}
