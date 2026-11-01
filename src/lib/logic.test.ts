import assert from "node:assert/strict";
import { test } from "node:test";
import { gjendjaPerDate, kulmiIPerdorimit, llogaritDritaren } from "./availability";
import { rrjetaEMuajit, shtoDite } from "./dates";
import { formatoCmimin, slugify } from "./format";
import { llogaritOpsionet, type OpsionPerKlient } from "./options";
import { normalizoTelefonin, shfaqTelefonin } from "./phone";
import { llogaritKaparin } from "./pricing";

const arkada = { id: "a", sasiaNeStok: 1, diteMontimi: 1, diteCmontimi: 1, statusi: "AKTIV" };
const tavolina = { id: "t", sasiaNeStok: 2, diteMontimi: 0, diteCmontimi: 0, statusi: "AKTIV" };
const DITA = "2026-06-01";

test("window includes setup, teardown and repaint days", () => {
  assert.deepEqual(llogaritDritaren("2026-06-13", arkada), { nga: "2026-06-12", deri: "2026-06-14" });
  assert.deepEqual(llogaritDritaren("2026-06-13", arkada, 2), { nga: "2026-06-10", deri: "2026-06-14" });
});

test("a booked arch blocks the neighbouring days through its buffers", () => {
  const zene = [{ produktId: "a", sasia: 1, dritarjaNga: "2026-06-12", dritarjaDeri: "2026-06-14" }];
  assert.equal(gjendjaPerDate(arkada, "2026-06-13", 1, zene, [], 0, DITA), "I_ZENE");
  assert.equal(gjendjaPerDate(arkada, "2026-06-15", 1, zene, [], 0, DITA), "I_ZENE"); // setup on the 14th clashes
  assert.equal(gjendjaPerDate(arkada, "2026-06-16", 1, zene, [], 0, DITA), "I_LIRE");
  assert.equal(gjendjaPerDate(arkada, "2026-06-16", 1, zene, [], 2, DITA), "I_ZENE"); // repaint needs the 14th too
});

test("peak usage lets non-overlapping bookings share one copy", () => {
  const zene = [
    { produktId: "t", sasia: 1, dritarjaNga: "2026-06-01", dritarjaDeri: "2026-06-02" },
    { produktId: "t", sasia: 1, dritarjaNga: "2026-06-04", dritarjaDeri: "2026-06-05" },
  ];
  assert.equal(kulmiIPerdorimit(zene, { nga: "2026-06-02", deri: "2026-06-04" }), 1);
  const tavolinaGjate = { ...tavolina, diteMontimi: 1, diteCmontimi: 1 };
  assert.equal(gjendjaPerDate(tavolinaGjate, "2026-06-03", 1, zene, [], 0, "2026-05-01"), "I_LIRE");
  assert.equal(gjendjaPerDate(tavolinaGjate, "2026-06-03", 2, zene, [], 0, "2026-05-01"), "I_ZENE");
});

test("blackouts, past dates and inactive products", () => {
  assert.equal(gjendjaPerDate(arkada, "2026-06-13", 1, [], [{ produktId: null, nga: "2026-06-14", deri: "2026-06-20" }], 0, DITA), "I_BLLOKUAR");
  assert.equal(gjendjaPerDate(arkada, "2026-06-13", 1, [], [{ produktId: "x", nga: "2026-06-13", deri: "2026-06-13" }], 0, DITA), "I_LIRE");
  assert.equal(gjendjaPerDate(arkada, "2026-06-02", 1, [], [], 0, DITA), "I_KALUAR"); // setup would be today
  assert.equal(gjendjaPerDate({ ...arkada, statusi: "NE_MIREMBAJTJE" }, "2026-06-13", 1, [], [], 0, DITA), "JO_AKTIV");
});

test("kapar: percentage, minimum, capped at subtotal, LEK rounded up to 100", () => {
  assert.equal(llogaritKaparin(20000, 30, 3000, "LEK"), 6000);
  assert.equal(llogaritKaparin(5000, 30, 3000, "LEK"), 3000);
  assert.equal(llogaritKaparin(2000, 30, 3000, "LEK"), 2000);
  assert.equal(llogaritKaparin(12345, 30, 0, "LEK"), 3800);
  assert.equal(llogaritKaparin(250, 30, 0, "EUR"), 75);
});

test("Albanian mobile numbers", () => {
  for (const n of ["069 123 4567", "0691234567", "+355 69 123 4567", "00355691234567", "355-69-123-4567"]) {
    assert.equal(normalizoTelefonin(n), "+355691234567", n);
  }
  assert.equal(normalizoTelefonin("04 222 3333"), null);
  assert.equal(normalizoTelefonin("069 123 456"), null);
  assert.equal(shfaqTelefonin("+355691234567"), "069 123 4567");
});

const opsionet: OpsionPerKlient[] = [
  {
    id: "ngjyra", lloji: "NGJYRE", emri: "Ngjyra", iDetyrueshem: true, gjatesiaMax: null, cmimiShtese: 0, lejonNgjyreTjeter: true,
    vlerat: [
      { id: "roze", emri: "Rozë pastel", hex: "#f9c5d1", cmimiShtese: 0, diteShtese: 0, fotoId: null },
      { id: "ari", emri: "Ari", hex: "#d4af37", cmimiShtese: 2000, diteShtese: 2, fotoId: null },
    ],
  },
  { id: "emri", lloji: "TEKST", emri: "Emri", iDetyrueshem: false, gjatesiaMax: 12, cmimiShtese: 1500, lejonNgjyreTjeter: false, vlerat: [] },
  { id: "mosha", lloji: "NUMER", emri: "Mosha", iDetyrueshem: false, gjatesiaMax: null, cmimiShtese: 500, lejonNgjyreTjeter: false, vlerat: [] },
];

test("options add price and repaint days", () => {
  const r = llogaritOpsionet(10000, opsionet, [{ opsionId: "ngjyra", vleraId: "ari" }, { opsionId: "emri", tekst: "ETUAL" }, { opsionId: "mosha", tekst: "5" }], false, false);
  assert.deepEqual(r.gabimet, []);
  assert.equal(r.cmimiNjesi, 14000);
  assert.equal(r.diteShtese, 2);
  assert.equal(r.kerkonAprovim, false);
  assert.equal(r.zgjedhjet.length, 3);
});

test("options validation and approval triggers", () => {
  assert.match(llogaritOpsionet(100, opsionet, [], false, false).gabimet[0], /Ngjyra/);
  assert.equal(llogaritOpsionet(100, opsionet, [{ opsionId: "ngjyra", vleraId: "x" }], false, false).gabimet.length > 0, true);
  assert.match(llogaritOpsionet(100, opsionet, [{ opsionId: "ngjyra", vleraId: "roze" }, { opsionId: "emri", tekst: "SHUMË I GJATË EMËR" }], false, false).gabimet[0], /12/);
  assert.match(llogaritOpsionet(100, opsionet, [{ opsionId: "ngjyra", vleraId: "roze" }, { opsionId: "mosha", tekst: "pesë" }], false, false).gabimet[0], /numër/);
  const tjeter = llogaritOpsionet(100, opsionet, [{ opsionId: "ngjyra", ngjyreTjeter: "Blu deti" }], false, false);
  assert.equal(tjeter.kerkonAprovim, true);
  assert.equal(tjeter.zgjedhjet[0].eshteNgjyreTjeter, true);
  assert.equal(llogaritOpsionet(100, opsionet, [{ opsionId: "ngjyra", vleraId: "roze" }], true, true).kerkonAprovim, true);
  assert.equal(llogaritOpsionet(100, opsionet, [{ opsionId: "ngjyra", vleraId: "roze" }], true, false).kerkonAprovim, false);
});

test("dates and formatting", () => {
  assert.equal(shtoDite("2026-02-28", 1), "2026-03-01");
  assert.equal(shtoDite("2026-01-01", -1), "2025-12-31");
  const r = rrjetaEMuajit(2026, 6); // June 2026 starts on a Monday
  assert.equal(r[0], "2026-06-01");
  assert.equal(r.length % 7, 0);
  assert.equal(formatoCmimin(6000), "6.000 L");
  assert.equal(formatoCmimin(25, "EUR"), "25 €");
  assert.equal(slugify("Arkadë me valë – Rozë"), "arkade-me-vale-roze");
});
