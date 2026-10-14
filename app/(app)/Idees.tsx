"use client";

import { useState } from "react";
import DotIcon from "../DotIcon";
import { DAYS, MONTHS_SHORT, addDays, dayKey, parse } from "./lib";
import { announce, deleteContent, movePublish, openSheet, patchContent, type Content } from "./store";

// Une idée et son passage au calendrier : un clic, puis le jour, dans les 7 prochains jours.
// L'heure de publication est 18 h, les étapes se posent à rebours comme partout.
export default function IdeaRow({ c, del = false }: { c: Content; del?: boolean }) {
  const [plan, setPlan] = useState(false);
  const days = Array.from({ length: 7 }, (_, i) => addDays(new Date(), i));
  function place(d: Date) {
    const k = dayKey(d);
    patchContent(c.id, (x, dd) => movePublish(x, `${k}T18:00`, dd.profile.durations));
    setPlan(false);
    const p = parse(k);
    announce(`Planifiée ${DAYS[(p.getDay() + 6) % 7]} ${p.getDate()} ${MONTHS_SHORT[p.getMonth()]} à 18 h.`);
  }
  return (
    <div className={`idea${plan ? " open" : ""}`}>
      <button type="button" className="idea-t" onClick={() => openSheet(c.id)}>{c.title.trim() || "Sans titre"}</button>
      <span className="idea-act">
        <button type="button" className="btn btn-ghost btn-sm" onClick={() => setPlan(!plan)} aria-expanded={plan}>{plan ? "Annuler" : "Cette semaine"}</button>
        {del && <button type="button" className="x" onClick={() => deleteContent(c.id)} aria-label="Supprimer l'idée"><DotIcon name="croix" /></button>}
      </span>
      {plan && (
        <div className="idea-days">
          {days.map((d, i) => (
            <button type="button" key={i} onClick={() => place(d)}><span>{i === 0 ? "Auj." : DAYS[(d.getDay() + 6) % 7]}</span><b className="disp">{d.getDate()}</b></button>
          ))}
        </div>
      )}
    </div>
  );
}

// Les idées, des plus récentes aux plus anciennes.
export const ideasOf = (contents: Content[]) => contents.filter((c) => !c.publishAt).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
