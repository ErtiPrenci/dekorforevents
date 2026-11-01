import type { Metadata } from "next";
import { dil } from "@/app/admin/hyr/actions";
import { NavAdmin } from "@/components/admin/nav";
import { kerkoAdminin } from "@/lib/auth";
import { skadoMbajtjet } from "@/lib/reservations";
import { merrBiznesinMeId } from "@/lib/tenant";

export const metadata: Metadata = {
  title: { default: "Paneli", template: "%s · Paneli" },
  manifest: "/admin.webmanifest",
  robots: { index: false },
};

export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  const admin = await kerkoAdminin();
  const b = await merrBiznesinMeId(admin.biznesId);
  // Statuses stay correct even if the cron job is late.
  await skadoMbajtjet(undefined, admin.biznesId);

  return (
    <div style={{ ["--brand" as string]: b.ngjyraPrimare }} className="min-h-dvh lg:grid lg:grid-cols-[230px_1fr]">
      <aside className="no-print sticky top-0 hidden h-dvh border-r border-line bg-paper lg:flex lg:flex-col">
        <div className="px-5 py-5">
          <p className="eyebrow">Paneli</p>
          <p className="mt-1 truncate font-display text-lg font-semibold">{b.emri}</p>
        </div>
        <NavAdmin roli={admin.roli} vertikal />
        <div className="mt-auto space-y-2 p-4 text-sm">
          <a href="/" target="_blank" className="block text-ink-soft hover:text-ink">
            Shiko dyqanin ↗
          </a>
          <form action={dil}>
            <button className="text-ink-soft hover:text-bad">Dil ({admin.emri})</button>
          </form>
        </div>
      </aside>

      <div className="min-w-0 pb-24 lg:pb-10">
        <header className="no-print flex items-center justify-between border-b border-line bg-paper px-4 py-3 lg:hidden">
          <p className="truncate font-display text-lg font-semibold">{b.emri}</p>
          <form action={dil}>
            <button className="text-sm text-ink-soft">Dil</button>
          </form>
        </header>
        <main className="mx-auto max-w-6xl px-4 py-6 lg:px-8">{children}</main>
      </div>

      <nav className="no-print fixed inset-x-0 bottom-0 z-30 border-t border-line bg-paper/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden">
        <NavAdmin roli={admin.roli} />
      </nav>
    </div>
  );
}
