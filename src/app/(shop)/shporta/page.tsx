import { Arketimi } from "@/components/shop/checkout";
import { shtoDite, sot } from "@/lib/dates";
import { merrBiznesinPublik } from "@/lib/tenant";

export const metadata = { title: "Rezervimi juaj" };

export default async function Shporta() {
  const b = await merrBiznesinPublik();
  return (
    <div className="mx-auto max-w-6xl px-4 pt-8">
      <h1 className="mb-6 text-3xl font-semibold sm:text-4xl">Rezervimi juaj</h1>
      <Arketimi
        min={shtoDite(sot(), 1)}
        punishtja={[[b.adresaPunishtes, b.qyteti].filter(Boolean).join(", "), b.orariPunes].filter(Boolean).join(" · ")}
        rregullat={{
          kerkonKapar: b.kerkonKapar,
          kapariPerqindje: b.kapariPerqindje,
          kapariMinimum: b.kapariMinimum,
          oretMbajtjes: b.oretMbajtjes,
          monedha: b.monedha,
        }}
      />
    </div>
  );
}
