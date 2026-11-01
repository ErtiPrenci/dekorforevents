import { merrAdminin } from "@/lib/auth";
import { EMRAT_E_PAGESAVE, pagesatEMuajit } from "@/lib/cash";
import { ZONA_KOHORE } from "@/lib/dates";

const qeliza = (v: string | number | null) => {
  const s = String(v ?? "");
  return /[";\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

// CSV for the accountant. Semicolon-separated so Excel with Albanian/European
// locale opens it in columns; BOM so "ë" displays correctly.
export async function GET(req: Request) {
  const admin = await merrAdminin();
  if (!admin || admin.roli !== "PRONAR") return new Response("Unauthorized", { status: 401 });
  const muaji = new URL(req.url).searchParams.get("muaji") ?? "";
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(muaji)) return new Response("Bad month", { status: 400 });

  const { rreshtat } = await pagesatEMuajit(admin.biznesId, muaji);
  const kohe = new Intl.DateTimeFormat("sv-SE", { timeZone: ZONA_KOHORE, dateStyle: "short", timeStyle: "short" });
  const linjat = [
    ["Data", "Rezervimi", "Klienti", "Lloji", "Shuma", "Regjistruar nga", "Shënim"],
    ...rreshtat.map((r) => [
      kohe.format(r.krijuarMe),
      r.kodi,
      r.klienti,
      EMRAT_E_PAGESAVE[r.lloji],
      r.lloji === "KTHIM_GARANCIE" ? -r.shuma : r.shuma,
      r.regjistruarNga,
      r.shenim,
    ]),
  ];
  const csv = "﻿" + linjat.map((l) => l.map(qeliza).join(";")).join("\r\n");
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="arka-${muaji}.csv"`,
    },
  });
}
