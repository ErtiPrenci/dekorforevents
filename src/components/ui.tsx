import { EMRAT_E_STATUSEVE, type Statusi } from "@/lib/status";

export function Ngjyra({ hex, madhesia = 18 }: { hex?: string | null; madhesia?: number }) {
  if (!hex) return null;
  return (
    <span
      aria-hidden
      className="inline-block shrink-0 rounded-full border border-black/10"
      style={{ background: hex, width: madhesia, height: madhesia }}
    />
  );
}

const NGJYRAT_E_STATUSIT: Record<Statusi, string> = {
  NE_PRITJE_TE_APROVIMIT: "bg-info-soft text-info",
  NE_PRITJE_TE_KAPARIT: "bg-warn-soft text-warn",
  KONFIRMUAR: "bg-ok-soft text-ok",
  DOREZUAR: "bg-brand-soft text-brand-strong",
  PERFUNDUAR: "bg-line text-ink-soft",
  ANULUAR: "bg-line text-muted",
  REFUZUAR: "bg-bad-soft text-bad",
  SKADUAR: "bg-line text-muted",
  MOSPARAQITJE: "bg-bad-soft text-bad",
};

export function StatusBadge({ statusi }: { statusi: Statusi }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${NGJYRAT_E_STATUSIT[statusi]}`}>
      {EMRAT_E_STATUSEVE[statusi]}
    </span>
  );
}

export function Gabim({ children }: { children?: React.ReactNode }) {
  if (!children) return null;
  return (
    <p role="alert" className="rounded-xl bg-bad-soft px-3.5 py-2.5 text-sm text-bad">
      {children}
    </p>
  );
}

export function Sukses({ children }: { children?: React.ReactNode }) {
  if (!children) return null;
  return <p className="rounded-xl bg-ok-soft px-3.5 py-2.5 text-sm text-ok">{children}</p>;
}

export function FotoOseVend({ src, alt, className = "" }: { src?: string | null; alt: string; className?: string }) {
  if (!src) {
    return (
      <div className={`grid place-items-center bg-brand-soft text-brand-strong ${className}`} aria-label={alt}>
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <rect x="3" y="4" width="18" height="16" rx="3" />
          <circle cx="9" cy="10" r="2" />
          <path d="m21 16-5-5-8 8" />
        </svg>
      </div>
    );
  }
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt={alt} loading="lazy" className={`object-cover ${className}`} />;
}
