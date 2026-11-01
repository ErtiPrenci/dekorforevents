"use client";

import { startTransition, useActionState, useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { KUFIRI_I_KERKESES, madhesiaEFotove, zvogeloFotot } from "@/lib/shrink-photos";

export type Rezultat = { gabim?: string; ok?: string };
type Veprim = (prev: Rezultat, fd: FormData) => Promise<Rezultat>;

/** A form bound to a server action, showing its error/success and asking for confirmation if needed. */
export function FormaVeprimi({
  veprimi,
  children,
  className,
  konfirmim,
  pastroPasSuksesit = false,
}: {
  veprimi: Veprim;
  children: React.ReactNode;
  className?: string;
  konfirmim?: string;
  pastroPasSuksesit?: boolean;
}) {
  const [gjendja, dergo] = useActionState(veprimi, {});
  const [gabimLokal, setGabimLokal] = useState<string | null>(null);
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (pastroPasSuksesit && gjendja.ok) ref.current?.reset();
  }, [gjendja, pastroPasSuksesit]);

  return (
    <form
      ref={ref}
      action={async (fd) => {
        setGabimLokal(null);
        const e_vogel = await zvogeloFotot(fd);
        if (madhesiaEFotove(e_vogel) > KUFIRI_I_KERKESES) {
          setGabimLokal("Fotot janë shumë të mëdha bashkë. Ngarkoni më pak foto njëherësh.");
          return;
        }
        startTransition(() => dergo(e_vogel));
      }}
      className={className}
      onSubmit={(e) => {
        if (konfirmim && !window.confirm(konfirmim)) e.preventDefault();
      }}
    >
      {children}
      {(gabimLokal || gjendja.gabim) && (
        <p role="alert" className="mt-2 rounded-xl bg-bad-soft px-3 py-2 text-sm text-bad">
          {gabimLokal || gjendja.gabim}
        </p>
      )}
      {gjendja.ok && !gabimLokal && <p className="mt-2 rounded-xl bg-ok-soft px-3 py-2 text-sm text-ok">{gjendja.ok}</p>}
    </form>
  );
}

export function Dergo({
  children,
  className = "btn-primary",
  disabled,
}: {
  children: React.ReactNode;
  className?: string;
  disabled?: boolean;
}) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className={className} disabled={pending || disabled}>
      {pending ? "Duke ruajtur…" : children}
    </button>
  );
}
