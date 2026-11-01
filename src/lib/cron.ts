import { timingSafeEqual } from "node:crypto";

/** Cron endpoints require "Authorization: Bearer <CRON_SECRET>" (Vercel Cron sends it automatically). */
export function eshteKerkesePerCron(req: Request): boolean {
  const sekreti = process.env.CRON_SECRET;
  if (!sekreti) return false;
  const marre = Buffer.from(req.headers.get("authorization") ?? "");
  const pritur = Buffer.from(`Bearer ${sekreti}`);
  return marre.length === pritur.length && timingSafeEqual(marre, pritur);
}
