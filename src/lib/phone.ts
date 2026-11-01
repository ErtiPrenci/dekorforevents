// Albanian mobile numbers: 066/067/068/069 + 7 digits.
// Stored as E.164 ("+355691234567"), shown as "069 123 4567".

export function normalizoTelefonin(input: string): string | null {
  let d = input.replace(/[^\d+]/g, "");
  if (d.startsWith("+")) d = d.slice(1);
  if (d.startsWith("00")) d = d.slice(2);
  if (d.startsWith("355")) d = d.slice(3);
  if (d.startsWith("0")) d = d.slice(1);
  return /^6[6-9]\d{7}$/.test(d) ? `+355${d}` : null;
}

export function shfaqTelefonin(e164: string): string {
  const d = e164.replace(/^\+355/, "0");
  return d.length === 10 ? `${d.slice(0, 3)} ${d.slice(3, 6)} ${d.slice(6)}` : e164;
}

/** wa.me link, optionally with a prefilled message. */
export function lidhjeWhatsApp(e164: string, mesazhi?: string): string {
  const numri = e164.replace(/\D/g, "");
  return `https://wa.me/${numri}${mesazhi ? `?text=${encodeURIComponent(mesazhi)}` : ""}`;
}
