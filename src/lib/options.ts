// Pure option logic shared by the product page (live price preview) and the
// server (authoritative price and validation). No server imports here.

import type { ZgjedhjeRuajtur } from "@/db/schema";

export type VleraPerKlient = {
  id: string;
  emri: string;
  hex: string | null;
  cmimiShtese: number;
  diteShtese: number;
  fotoId: string | null;
};

export type OpsionPerKlient = {
  id: string;
  lloji: "NGJYRE" | "TEKST" | "NUMER" | "ZGJEDHJE";
  emri: string;
  iDetyrueshem: boolean;
  gjatesiaMax: number | null;
  cmimiShtese: number;
  lejonNgjyreTjeter: boolean;
  vlerat: VleraPerKlient[];
};

export type ZgjedhjeHyrese = {
  opsionId: string;
  vleraId?: string;
  tekst?: string;
  ngjyreTjeter?: string;
};

export type RezultatOpsionesh = {
  cmimiNjesi: number;
  zgjedhjet: ZgjedhjeRuajtur[];
  diteShtese: number;
  kerkonAprovim: boolean;
  gabimet: string[];
};

export const GJATESIA_MAX_TEKST = 30;
export const GJATESIA_MAX_SHENIM = 500;

export function llogaritOpsionet(
  cmimiBaze: number,
  opsionet: OpsionPerKlient[],
  hyrja: ZgjedhjeHyrese[],
  shenimetKerkojneAprovim: boolean,
  kaShenimOseFoto: boolean,
): RezultatOpsionesh {
  const gabimet: string[] = [];
  const zgjedhjet: ZgjedhjeRuajtur[] = [];
  let cmimi = cmimiBaze;
  let diteShtese = 0;
  let ngjyreTjeter = false;

  const sipasOpsionit = new Map(hyrja.map((z) => [z.opsionId, z]));
  for (const id of sipasOpsionit.keys()) {
    if (!opsionet.some((o) => o.id === id)) gabimet.push("Zgjedhje e panjohur.");
  }

  for (const o of opsionet) {
    const z = sipasOpsionit.get(o.id);

    if (o.lloji === "NGJYRE" || o.lloji === "ZGJEDHJE") {
      const tjeter = o.lloji === "NGJYRE" && o.lejonNgjyreTjeter ? z?.ngjyreTjeter?.trim() : undefined;
      const vlera = z?.vleraId ? o.vlerat.find((v) => v.id === z.vleraId) : undefined;
      if (z?.vleraId && !vlera) gabimet.push(`Zgjedhje e pavlefshme për "${o.emri}".`);
      if (tjeter) {
        if (tjeter.length > 80) gabimet.push(`Përshkrimi i ngjyrës është shumë i gjatë.`);
        ngjyreTjeter = true;
        zgjedhjet.push({
          opsioni: o.emri,
          lloji: o.lloji,
          vlera: tjeter.slice(0, 80),
          eshteNgjyreTjeter: true,
          cmimiShtese: 0,
          diteShtese: 0,
        });
      } else if (vlera) {
        cmimi += vlera.cmimiShtese;
        diteShtese = Math.max(diteShtese, vlera.diteShtese);
        zgjedhjet.push({
          opsioni: o.emri,
          lloji: o.lloji,
          vlera: vlera.emri,
          hex: vlera.hex,
          cmimiShtese: vlera.cmimiShtese,
          diteShtese: vlera.diteShtese,
        });
      } else if (o.iDetyrueshem) {
        gabimet.push(`Zgjidhni "${o.emri}".`);
      }
      continue;
    }

    const tekst = z?.tekst?.trim() ?? "";
    if (!tekst) {
      if (o.iDetyrueshem) gabimet.push(`Plotësoni "${o.emri}".`);
      continue;
    }
    if (o.lloji === "NUMER" && !/^\d{1,3}$/.test(tekst)) {
      gabimet.push(`"${o.emri}" duhet të jetë numër.`);
      continue;
    }
    const max = o.gjatesiaMax ?? GJATESIA_MAX_TEKST;
    if (tekst.length > max) {
      gabimet.push(`"${o.emri}" lejon deri në ${max} shkronja.`);
      continue;
    }
    cmimi += o.cmimiShtese;
    zgjedhjet.push({ opsioni: o.emri, lloji: o.lloji, vlera: tekst, cmimiShtese: o.cmimiShtese, diteShtese: 0 });
  }

  return {
    cmimiNjesi: cmimi,
    zgjedhjet,
    diteShtese,
    kerkonAprovim: ngjyreTjeter || (shenimetKerkojneAprovim && kaShenimOseFoto),
    gabimet,
  };
}

export function permbledhjaEZgjedhjeve(zgjedhjet: ZgjedhjeRuajtur[]): string {
  return zgjedhjet.map((z) => `${z.opsioni}: ${z.vlera}${z.eshteNgjyreTjeter ? " (ngjyrë tjetër)" : ""}`).join(" · ");
}
