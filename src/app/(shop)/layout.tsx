import Link from "next/link";
import { ButoniShportes, ShportaProvider } from "@/components/shop/cart";
import { lidhjeWhatsApp, shfaqTelefonin } from "@/lib/phone";
import { urlFoto } from "@/lib/storage";
import { merrBiznesinPublik } from "@/lib/tenant";

// Every shop page depends on which business is being viewed (per request in Faza 2).
export const dynamic = "force-dynamic";

export default async function ShopLayout({ children }: { children: React.ReactNode }) {
  const b = await merrBiznesinPublik();
  const kontakti = b.whatsappPronarit ?? b.telefoni;

  return (
    <ShportaProvider celesi={b.slug}>
      <div style={{ ["--brand" as string]: b.ngjyraPrimare }} className="flex min-h-dvh flex-col">
        <header className="sticky top-0 z-30 border-b border-line/70 bg-cream/90 backdrop-blur">
          <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3">
            <Link href="/" className="flex min-w-0 items-center gap-2.5">
              {b.logoRruga ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={urlFoto(b.logoRruga)} alt="" className="h-9 w-9 rounded-full object-cover" />
              ) : (
                <span className="grid h-9 w-9 place-items-center rounded-full bg-brand text-sm font-bold text-ink">
                  {b.emri.slice(0, 1)}
                </span>
              )}
              <span className="truncate font-display text-lg font-semibold">{b.emri}</span>
            </Link>
            <nav className="ml-auto flex items-center gap-1 sm:gap-2">
              <Link href="/katalogu" className="hidden rounded-full px-3 py-1.5 text-sm font-medium text-ink-soft hover:bg-paper sm:block">
                Katalogu
              </Link>
              <Link href="/ndiq" className="hidden rounded-full px-3 py-1.5 text-sm font-medium text-ink-soft hover:bg-paper sm:block">
                Ndiq rezervimin
              </Link>
              <ButoniShportes />
            </nav>
          </div>
          <nav className="mx-auto flex max-w-6xl gap-1 px-4 pb-2 sm:hidden">
            <Link href="/katalogu" className="chip">
              Katalogu
            </Link>
            <Link href="/ndiq" className="chip">
              Ndiq rezervimin
            </Link>
          </nav>
        </header>

        <main className="flex-1">{children}</main>

        <footer className="mt-16 border-t border-line bg-paper">
          <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 text-sm text-ink-soft sm:grid-cols-3">
            <div>
              <p className="font-display text-lg font-semibold text-ink">{b.emri}</p>
              <p className="mt-1">Struktura profesionale dhe zgjidhje për eventet tuaja.</p>
            </div>
            <div className="space-y-1">
              <p className="eyebrow mb-2">Punishtja</p>
              <p>{[b.adresaPunishtes, b.qyteti].filter(Boolean).join(", ")}</p>
              {b.orariPunes && <p>{b.orariPunes}</p>}
              {b.googleMapsUrl && (
                <a href={b.googleMapsUrl} target="_blank" rel="noopener noreferrer" className="font-medium text-ink underline">
                  Google Maps
                </a>
              )}
            </div>
            <div className="space-y-1">
              <p className="eyebrow mb-2">Kontakt</p>
              {kontakti && (
                <a href={lidhjeWhatsApp(kontakti)} target="_blank" rel="noopener noreferrer" className="block hover:text-ink">
                  WhatsApp · {shfaqTelefonin(kontakti)}
                </a>
              )}
              {b.instagram && (
                <a href={`https://www.instagram.com/${b.instagram}/`} target="_blank" rel="noopener noreferrer" className="block hover:text-ink">
                  Instagram · @{b.instagram}
                </a>
              )}
              <Link href="/ndiq" className="block hover:text-ink">
                Ndiq rezervimin
              </Link>
              <Link href="/kushtet" className="block hover:text-ink">
                Kushtet e rezervimit
              </Link>
            </div>
          </div>
        </footer>
      </div>
    </ShportaProvider>
  );
}
