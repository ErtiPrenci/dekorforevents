"use client";

import { useEffect, useState } from "react";

function nePerUint8(base64: string) {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const raw = atob((base64 + padding).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}

type Gjendja = "duke-kontrolluar" | "pa-mbeshtetje" | "bllokuar" | "joaktiv" | "aktiv";

export function NjoftimetPush({ celesiPublik }: { celesiPublik: string | null }) {
  const [gjendja, setGjendja] = useState<Gjendja>("duke-kontrolluar");
  const [gabim, setGabim] = useState<string | null>(null);

  useEffect(() => {
    if (!celesiPublik || !("serviceWorker" in navigator) || !("PushManager" in window)) {
      setGjendja("pa-mbeshtetje");
      return;
    }
    if (Notification.permission === "denied") {
      setGjendja("bllokuar");
      return;
    }
    navigator.serviceWorker
      .register("/sw.js")
      .then((reg) => reg.pushManager.getSubscription())
      .then((s) => setGjendja(s ? "aktiv" : "joaktiv"))
      .catch(() => setGjendja("pa-mbeshtetje"));
  }, [celesiPublik]);

  async function aktivizo() {
    setGabim(null);
    try {
      const leja = await Notification.requestPermission();
      if (leja !== "granted") {
        setGjendja(leja === "denied" ? "bllokuar" : "joaktiv");
        return;
      }
      const reg = await navigator.serviceWorker.ready;
      const abonim = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: nePerUint8(celesiPublik!) });
      const res = await fetch("/api/push/abonohu", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(abonim.toJSON()),
      });
      if (!res.ok) throw new Error();
      setGjendja("aktiv");
    } catch {
      setGabim("Aktivizimi dështoi. Provoni përsëri.");
    }
  }

  async function caktivizo() {
    const reg = await navigator.serviceWorker.ready;
    const s = await reg.pushManager.getSubscription();
    if (s) {
      await fetch("/api/push/abonohu", { method: "DELETE", body: JSON.stringify({ endpoint: s.endpoint }) });
      await s.unsubscribe();
    }
    setGjendja("joaktiv");
  }

  return (
    <div className="space-y-2">
      {gjendja === "aktiv" && (
        <div className="flex flex-wrap items-center gap-3">
          <span className="rounded-full bg-ok-soft px-3 py-1 text-sm font-semibold text-ok">✓ Aktive në këtë pajisje</span>
          <button type="button" onClick={caktivizo} className="text-sm text-ink-soft underline">
            Çaktivizo
          </button>
        </div>
      )}
      {gjendja === "joaktiv" && (
        <button type="button" onClick={aktivizo} className="btn-primary btn-sm">
          Aktivizo njoftimet në këtë pajisje
        </button>
      )}
      {gjendja === "bllokuar" && (
        <p className="text-sm text-warn">Njoftimet janë bllokuar në shfletues. Lejojini te cilësimet e shfletuesit për këtë faqe.</p>
      )}
      {gjendja === "pa-mbeshtetje" && (
        <p className="text-sm text-ink-soft">
          Ky shfletues nuk i mbështet njoftimet. Në iPhone: hapeni panelin në Safari → Ndaj → &quot;Shto në ekranin bazë&quot;, pastaj hapeni nga ikona.
        </p>
      )}
      {gabim && <p className="text-sm text-bad">{gabim}</p>}
    </div>
  );
}
