import Link from "next/link";
import { FormaEProduktit } from "@/components/admin/product-form";
import { kerkoPronarin } from "@/lib/auth";
import { merrBiznesinMeId } from "@/lib/tenant";
import { ruajProduktin } from "../actions";
import { teDhenatEFormes } from "../form-data";

export const metadata = { title: "Produkt i ri" };

export default async function ProduktIRi() {
  const admin = await kerkoPronarin();
  const [b, d] = await Promise.all([merrBiznesinMeId(admin.biznesId), teDhenatEFormes(admin.biznesId)]);
  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <Link href="/admin/produktet" className="text-sm text-ink-soft hover:text-ink">
        ← Produktet
      </Link>
      <h1 className="text-3xl font-semibold">Produkt i ri</h1>
      <FormaEProduktit veprimi={ruajProduktin.bind(null, null)} {...d} monedha={b.monedha} />
    </div>
  );
}
