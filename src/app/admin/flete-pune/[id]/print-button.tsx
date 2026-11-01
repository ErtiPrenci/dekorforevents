"use client";

export function ButoniPrint() {
  return (
    <button type="button" onClick={() => window.print()} className="btn-primary btn-sm">
      Printo
    </button>
  );
}
