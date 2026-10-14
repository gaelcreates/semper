"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import DotIcon from "../DotIcon";
import { DAYS, MONTHS, MONTHS_SHORT, addDays, dayKey, parse, startOfWeek } from "./lib";
import { useData } from "./store";

// Le jour et l'heure, à la manière de Semper : un calendrier en points (aujourd'hui en or, les jours qui ont
// déjà une publication marqués d'un point) et une liste d'heures au quart d'heure. Remplace les sélecteurs du navigateur.

// Une petite fenêtre accrochée à son bouton, au-dessous, ou au-dessus s'il n'y a pas la place.
function Pop({ anchor, onClose, children, width }: { anchor: HTMLElement; onClose: () => void; children: React.ReactNode; width: number }) {
  const box = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  useLayoutEffect(() => {
    const place = () => {
      const r = anchor.getBoundingClientRect(), h = box.current?.offsetHeight ?? 340;
      const below = r.bottom + 8 + h < innerHeight;
      setPos({ top: below ? r.bottom + 8 : Math.max(8, r.top - 8 - h), left: Math.max(8, Math.min(r.left, innerWidth - width - 8)) });
    };
    place();
    addEventListener("resize", place);
    addEventListener("scroll", place, true);
    return () => { removeEventListener("resize", place); removeEventListener("scroll", place, true); };
  }, [anchor, width]);
  useEffect(() => {
    const out = (e: PointerEvent) => { if (!box.current?.contains(e.target as Node) && !anchor.contains(e.target as Node)) onClose(); };
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") { e.stopPropagation(); onClose(); anchor.focus(); } };
    document.addEventListener("pointerdown", out);
    document.addEventListener("keydown", esc, true);
    return () => { document.removeEventListener("pointerdown", out); document.removeEventListener("keydown", esc, true); };
  }, [anchor, onClose]);
  // Rendue hors de la fiche (qui peut être décalée par son animation), dans le voile ou la page.
  return createPortal(
    <div ref={box} className="qd-pop" role="dialog" style={{ width, top: pos?.top ?? -9999, left: pos?.left ?? -9999 }}>{children}</div>,
    anchor.closest(".veil") ?? document.body,
  );
}

const short = (k: string) => { const d = parse(k); return `${DAYS[(d.getDay() + 6) % 7]} ${d.getDate()} ${MONTHS_SHORT[d.getMonth()]}`; };

// Le jour : « AAAA-MM-JJ », ou vide.
export function DateField({ value, onChange, label, compact = false }: { value: string; onChange: (v: string) => void; label: string; compact?: boolean }) {
  const btn = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" ref={btn} className={`qd${value ? "" : " empty"}${compact ? " sm" : ""}`} aria-label={label} aria-expanded={open} onClick={() => setOpen(!open)}>
        <DotIcon name="cal" /><span>{value ? short(value) : "Choisir un jour"}</span>
      </button>
      {open && btn.current && (
        <Pop anchor={btn.current} onClose={() => setOpen(false)} width={296}>
          <Month value={value} onPick={(k) => { onChange(k); setOpen(false); btn.current?.focus(); }} />
        </Pop>
      )}
    </>
  );
}

function Month({ value, onPick }: { value: string; onPick: (k: string) => void }) {
  const contents = useData()?.contents ?? [];
  const today = dayKey(new Date());
  const [view, setView] = useState(() => { const d = value ? parse(value) : new Date(); return new Date(d.getFullYear(), d.getMonth(), 1); });
  const first = startOfWeek(view);
  const days = Array.from({ length: 42 }, (_, i) => addDays(first, i));
  const pubs = new Set(contents.map((c) => c.publishAt?.slice(0, 10)).filter(Boolean));
  const shift = (n: number) => setView(new Date(view.getFullYear(), view.getMonth() + n, 1));
  return (
    <div className="qd-month">
      <header>
        <b>{MONTHS[view.getMonth()]} {view.getFullYear()}</b>
        <span>
          <button type="button" className="x" onClick={() => shift(-1)} aria-label="Mois précédent"><DotIcon name="gauche" /></button>
          <button type="button" className="x" onClick={() => shift(1)} aria-label="Mois suivant"><DotIcon name="droite" /></button>
        </span>
      </header>
      <div className="qd-grid">
        {DAYS.map((d) => <small key={d} className="lbl">{d.charAt(0).toUpperCase()}</small>)}
        {days.map((d) => {
          const k = dayKey(d);
          const cls = [d.getMonth() !== view.getMonth() ? "out" : "", k === value ? "on" : "", k === today ? "today" : "", pubs.has(k) ? "pub" : ""].filter(Boolean).join(" ");
          return <button type="button" key={k} className={cls} onClick={() => onPick(k)} aria-label={short(k)} aria-pressed={k === value}><span className="disp">{d.getDate()}</span></button>;
        })}
      </div>
      <footer>
        <button type="button" className="link" onClick={() => onPick(today)}>Aujourd&apos;hui</button>
        {value && <button type="button" className="link muted" onClick={() => onPick("")}>Effacer</button>}
      </footer>
    </div>
  );
}

// L'heure : « HH:MM » au quart d'heure.
const TIMES = Array.from({ length: 96 }, (_, i) => `${String(Math.floor(i / 4)).padStart(2, "0")}:${String((i % 4) * 15).padStart(2, "0")}`);
export function TimeField({ value, onChange, label, disabled = false, compact = false }: { value: string; onChange: (v: string) => void; label: string; disabled?: boolean; compact?: boolean }) {
  const btn = useRef<HTMLButtonElement>(null);
  const list = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  useLayoutEffect(() => {
    if (!open) return;
    const at = TIMES.indexOf(value) >= 0 ? value : "18:00";
    list.current?.querySelector<HTMLElement>(`[data-t="${at}"]`)?.scrollIntoView({ block: "center" });
  }, [open, value]);
  return (
    <>
      <button type="button" ref={btn} className={`qd time${value ? "" : " empty"}${compact ? " sm" : ""}`} aria-label={label} aria-expanded={open} disabled={disabled} onClick={() => setOpen(!open)}>
        <span className="disp">{value || "--:--"}</span>
      </button>
      {open && btn.current && (
        <Pop anchor={btn.current} onClose={() => setOpen(false)} width={128}>
          <div className="qd-times" ref={list}>
            {TIMES.map((t) => (
              <button type="button" key={t} data-t={t} className={t === value ? "on" : ""} onClick={() => { onChange(t); setOpen(false); btn.current?.focus(); }}><span className="disp">{t}</span></button>
            ))}
          </div>
        </Pop>
      )}
    </>
  );
}

// Le jour et l'heure ensemble : « AAAA-MM-JJTHH:MM », ou null. Sans heure, 18 h par défaut.
export function When({ value, onChange, label, fallback = "18:00" }: { value: string | null; onChange: (v: string | null) => void; label: string; fallback?: string }) {
  const d = value?.slice(0, 10) ?? "", t = value?.slice(11, 16) ?? "";
  return (
    <span className="qd-when">
      <DateField compact label={`${label} : jour`} value={d} onChange={(k) => onChange(k ? `${k}T${t || fallback}` : null)} />
      <TimeField compact label={`${label} : heure`} value={t} disabled={!d} onChange={(h) => onChange(`${d}T${h}`)} />
    </span>
  );
}
