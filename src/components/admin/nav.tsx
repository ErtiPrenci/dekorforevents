"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LIDHJET = [
  { href: "/admin", emri: "Paneli", ikona: "M3 12 12 4l9 8M5 10v10h14V10", pronar: false },
  {
    href: "/admin/rezervimet",
    emri: "Rezervimet",
    ikona: "M9 5h10M9 12h10M9 19h10M4 5h.01M4 12h.01M4 19h.01",
    pronar: false,
  },
  { href: "/admin/kalendari", emri: "Kalendari", ikona: "M3 5h18v16H3zM3 10h18M8 3v4M16 3v4", pronar: false },
  { href: "/admin/produktet", emri: "Produktet", ikona: "M4 7 12 3l8 4v10l-8 4-8-4zM4 7l8 4 8-4M12 11v10", pronar: true },
  // On phones the bottom bar has no room; categories are reached from Produktet.
  { href: "/admin/kategorite", emri: "Kategoritë", ikona: "M4 5h7v7H4zM13 5h7v7h-7zM4 14h7v5H4zM13 14h7v5h-7z", pronar: true, vetemDesktop: true },
  { href: "/admin/arka", emri: "Arka", ikona: "M3 7h18v12H3zM3 11h18M7 15h3", pronar: true },
  {
    href: "/admin/cilesimet",
    emri: "Cilësimet",
    ikona: "M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12M20 18h0M14 4v4M8 10v4M16 16v4",
    pronar: true,
  },
];

export function NavAdmin({ roli, vertikal = false }: { roli: "PRONAR" | "STAF"; vertikal?: boolean }) {
  const path = usePathname();
  const lidhjet = LIDHJET.filter((l) => (!l.pronar || roli === "PRONAR") && (vertikal || !("vetemDesktop" in l)));
  const aktiv = (href: string) => (href === "/admin" ? path === "/admin" : path.startsWith(href));

  if (vertikal) {
    return (
      <ul className="space-y-0.5 px-3">
        {lidhjet.map((l) => (
          <li key={l.href}>
            <Link
              href={l.href}
              className={`flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition ${
                aktiv(l.href) ? "bg-ink text-white" : "text-ink-soft hover:bg-cream"
              }`}
            >
              <Ikona d={l.ikona} />
              {l.emri}
            </Link>
          </li>
        ))}
      </ul>
    );
  }
  return (
    <ul className="grid" style={{ gridTemplateColumns: `repeat(${lidhjet.length}, minmax(0, 1fr))` }}>
      {lidhjet.map((l) => (
        <li key={l.href}>
          <Link
            href={l.href}
            className={`flex flex-col items-center gap-0.5 py-2 text-[10px] font-medium ${aktiv(l.href) ? "text-ink" : "text-muted"}`}
          >
            <Ikona d={l.ikona} />
            {l.emri}
          </Link>
        </li>
      ))}
    </ul>
  );
}

function Ikona({ d }: { d: string }) {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d={d} />
    </svg>
  );
}
