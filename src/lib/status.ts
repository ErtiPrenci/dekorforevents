// Pure module — safe to import from client components.

export type Statusi =
  | "NE_PRITJE_TE_APROVIMIT"
  | "NE_PRITJE_TE_KAPARIT"
  | "KONFIRMUAR"
  | "DOREZUAR"
  | "PERFUNDUAR"
  | "ANULUAR"
  | "REFUZUAR"
  | "SKADUAR"
  | "MOSPARAQITJE";

export const EMRAT_E_STATUSEVE: Record<Statusi, string> = {
  NE_PRITJE_TE_APROVIMIT: "Në pritje të konfirmimit",
  NE_PRITJE_TE_KAPARIT: "Në pritje të kaparit",
  KONFIRMUAR: "Konfirmuar",
  DOREZUAR: "Dorëzuar",
  PERFUNDUAR: "Përfunduar",
  ANULUAR: "Anuluar",
  REFUZUAR: "Refuzuar",
  SKADUAR: "Skaduar",
  MOSPARAQITJE: "Nuk u paraqit",
};
