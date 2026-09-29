"use client";

import { useEffect, useRef, useState } from "react";

// Petites pièces partagées : le compteur à boutons et le menu de filtre.

export function Stepper({ value, onChange, min = 0, max = 999, step = 1, format = String, label, disabled = false }: {
  value: number; onChange: (n: number) => void; min?: number; max?: number; step?: number; format?: (n: number) => string; label: string; disabled?: boolean;
}) {
  return (
    <span className={`stepper${disabled ? " off" : ""}`} role="group" aria-label={label}>
      <button type="button" onClick={() => onChange(Math.max(min, value - step))} disabled={disabled || value <= min} aria-label="Moins">−</button>
      <b className="disp">{format(value)}</b>
      <button type="button" onClick={() => onChange(Math.min(max, value + step))} disabled={disabled || value >= max} aria-label="Plus">+</button>
    </span>
  );
}

export function FilterPill({ label, options, selected, onChange }: {
  label: string; options: { key: string; label: string; sub?: boolean }[]; selected: string[]; onChange: (s: string[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const close = (e: PointerEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, [open]);
  const toggle = (k: string) => onChange(selected.includes(k) ? selected.filter((x) => x !== k) : [...selected, k]);
  return (
    <div className="fpill" ref={ref}>
      <button type="button" className={selected.length ? "on" : ""} onClick={() => setOpen(!open)} aria-expanded={open}>
        {label}{selected.length ? <b className="disp">{selected.length}</b> : null}
      </button>
      {open && (
        <div className="fpop" role="menu">
          {options.map((o) => (
            <label key={o.key} className={o.sub ? "sub" : ""}><input type="checkbox" checked={selected.includes(o.key)} onChange={() => toggle(o.key)} /><span>{o.label}</span></label>
          ))}
          {selected.length > 0 && <button type="button" className="fclear" onClick={() => onChange([])}>Effacer</button>}
        </div>
      )}
    </div>
  );
}

// Largeur d'écran étroite (téléphone) : certaines vues se replient.
export function useNarrow(px = 760) {
  const [n, setN] = useState(false);
  useEffect(() => {
    const m = window.matchMedia(`(max-width: ${px}px)`);
    const f = () => setN(m.matches);
    f();
    m.addEventListener("change", f);
    return () => m.removeEventListener("change", f);
  }, [px]);
  return n;
}
