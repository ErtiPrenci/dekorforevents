"use client";

import { useActionState } from "react";
import { gjejRezervimin } from "./actions";

export default function Ndiq() {
  const [gjendja, veprimi, duke] = useActionState(gjejRezervimin, {});
  return (
    <div className="mx-auto max-w-md px-4 pt-12">
      <h1 className="text-3xl font-semibold">Ndiq rezervimin</h1>
      <p className="mt-2 text-ink-soft">Shkruani kodin e rezervimit dhe numrin e telefonit me të cilin rezervuat.</p>
      <form action={veprimi} className="card mt-6 space-y-4 p-5">
        <label className="block">
          <span className="label">Kodi i rezervimit</span>
          <input name="kodi" className="input uppercase" required placeholder="DFE-2026-0001" autoComplete="off" />
        </label>
        <label className="block">
          <span className="label">Telefoni</span>
          <input name="telefoni" className="input" required inputMode="tel" placeholder="069 123 4567" />
        </label>
        {gjendja.gabim && <p className="rounded-xl bg-bad-soft p-3 text-sm text-bad">{gjendja.gabim}</p>}
        <button className="btn-primary w-full" disabled={duke}>
          {duke ? "Po kërkohet…" : "Shiko rezervimin"}
        </button>
      </form>
    </div>
  );
}
