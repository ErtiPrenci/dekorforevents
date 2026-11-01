"use client";

import { useActionState } from "react";
import { hyr } from "./actions";

export default function Hyr() {
  const [gjendja, veprimi, duke] = useActionState(hyr, {});
  return (
    <div className="grid min-h-dvh place-items-center px-4">
      <form action={veprimi} className="card w-full max-w-sm space-y-4 p-6">
        <div>
          <p className="eyebrow">Paneli i biznesit</p>
          <h1 className="mt-1 text-3xl font-semibold">Hyr</h1>
        </div>
        <label className="block">
          <span className="label">Email</span>
          <input name="email" type="email" className="input" required autoComplete="username" />
        </label>
        <label className="block">
          <span className="label">Fjalëkalimi</span>
          <input name="fjalekalimi" type="password" className="input" required autoComplete="current-password" />
        </label>
        {gjendja.gabim && <p className="rounded-xl bg-bad-soft p-3 text-sm text-bad">{gjendja.gabim}</p>}
        <button className="btn-primary w-full" disabled={duke}>
          {duke ? "Duke hyrë…" : "Hyr"}
        </button>
      </form>
    </div>
  );
}
