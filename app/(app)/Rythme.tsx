"use client";

import { useState } from "react";
import DotIcon from "../DotIcon";
import { Stepper } from "./ui";
import { MONTHS_SHORT, addDays, dayKey } from "./lib";
import { locked, setProfile, useData } from "./store";

const WEEKS = [4, 8, 12];

// Le rythme visé, et la possibilité de s'y engager : une fois bloqué, impossible de le baisser
// (ni de le changer) avant la date choisie. La base de données refuse aussi, pas seulement l'écran.
export default function Rythme({ compact = false }: { compact?: boolean }) {
  const p = useData()!.profile;
  const [open, setOpen] = useState(false);
  const [weeks, setWeeks] = useState(8);
  const on = locked(p);
  const until = (iso: string) => { const d = new Date(iso); return `${d.getDate()} ${MONTHS_SHORT[d.getMonth()]}`; };
  const end = dayKey(addDays(new Date(), weeks * 7));

  return (
    <div className={`rythme${compact ? " compact" : ""}`}>
      <Stepper label="Rythme visé par semaine" value={p.rythme} min={1} max={14} format={(n) => `${n} / sem.`}
        onChange={(rythme) => setProfile({ rythme })} disabled={on} />
      {on ? (
        <span className="lock on"><DotIcon name="cadenas" /> Bloqué jusqu&apos;au {until(p.lockUntil!)}</span>
      ) : !open ? (
        <button type="button" className="lock" onClick={() => setOpen(true)}><DotIcon name="cadenas" /> Bloquer</button>
      ) : (
        <div className="lock-pick">
          <div className="opts">
            {WEEKS.map((w) => <button type="button" key={w} className={weeks === w ? "on" : ""} onClick={() => setWeeks(w)}>{w} sem.</button>)}
          </div>
          <p>{p.rythme} par semaine, sans retour possible avant le {until(end)}.</p>
          <div className="lock-act">
            <button type="button" className="link" onClick={() => setOpen(false)}>Annuler</button>
            <button type="button" className="btn btn-sm" onClick={() => { setProfile({ lockUntil: end }); setOpen(false); }}>Je m&apos;engage</button>
          </div>
        </div>
      )}
    </div>
  );
}
