import type { Monedha } from "./format";

/**
 * Kapar = percentage of the items' subtotal, never below the minimum and never
 * above the subtotal itself. LEK amounts round up to the next 100.
 */
export function llogaritKaparin(nentotali: number, perqindja: number, minimumi: number, monedha: Monedha): number {
  if (nentotali <= 0) return 0;
  const raw = (nentotali * perqindja) / 100;
  const rrumbullakuar = monedha === "LEK" ? Math.ceil(raw / 100) * 100 : Math.ceil(raw);
  return Math.min(nentotali, Math.max(minimumi, rrumbullakuar));
}
