"use client";

import { useState } from "react";
import { Face, Mark } from "./Fiche";
import { LEAD_STATUS, STALE, ageDays, daysUntil, name, stageLabel, suite, type Funnel, type LeadStatus, type Ops, type Person } from "./model";

// Le pipeline : une colonne par étape, « Pas pour nous » replié en bas. Glisser une carte change son étape.
// Taux de passage depuis la colonne précédente : ceux qui ont atteint l'étape (admin_funnel), pas seulement ceux qui y sont.
const RATE: Partial<Record<LeadStatus, [keyof Funnel, keyof Funnel]>> = {
  qualifie: ["qualifies", "inscrits"], contacte: ["contactes", "qualifies"], discussion: ["reponses", "contactes"],
  appel: ["appels", "reponses"], client: ["clients", "appels"],
};

// Trop longtemps dans l'étape : Contacté 3 j, En discussion 5 j, Appel dont la date est passée sans « Appel fait ».
const stale = (p: Person) =>
  p.status === "appel" ? p.next_action === "appel" && !!p.next_action_at && daysUntil(p.next_action_at) < 0
  : STALE[p.status] != null && ageDays(p.stage_at) >= STALE[p.status]!;

export default function Pipeline({ people, funnel, ops, show }: { people: Person[]; funnel: Funnel | null; ops: Ops; show: (id: string) => void }) {
  const [over, setOver] = useState<LeadStatus | null>(null);
  const [lost, setLost] = useState(false);

  function drop(e: React.DragEvent, s: LeadStatus) {
    e.preventDefault();
    setOver(null);
    const id = e.dataTransfer.getData("text/plain");
    if (id) ops.stage(id, s);
  }
  const zone = (s: LeadStatus) => ({
    onDragOver: (e: React.DragEvent) => { e.preventDefault(); setOver(s); },
    onDragLeave: () => setOver((o) => (o === s ? null : o)),
    onDrop: (e: React.DragEvent) => drop(e, s),
  });
  const card = (p: Person) => {
    const s = suite(p);
    const age = ageDays(p.stage_at);
    return (
      <button type="button" key={p.user_id} className="cr-card" draggable data-row={p.user_id}
        onDragStart={(e) => { e.dataTransfer.setData("text/plain", p.user_id); e.dataTransfer.effectAllowed = "move"; }}
        onClick={() => show(p.user_id)}>
        <span className="cr-card-top"><Face p={p} size={24} /><b>{name(p)}</b><Mark c={p.c} /></span>
        <span className="cr-card-bot">
          <small className={s?.late ? "cr-late" : ""}>{s?.text ?? ""}</small>
          {age !== Infinity && <small className={stale(p) ? "cr-late" : ""}>{age} j</small>}
        </span>
      </button>
    );
  };
  const rate = (s: LeadStatus) => {
    const r = RATE[s];
    if (!r || !funnel) return null;
    const den = Number(funnel[r[1]] ?? 0);
    return den ? `${Math.round((100 * Number(funnel[r[0]] ?? 0)) / den)} %` : "–";
  };
  const non = people.filter((p) => p.status === "non");

  return (
    <div className="cr-pipe">
      <div className="cr-cols">
        {LEAD_STATUS.filter((l) => l.key !== "non").map((col) => {
          const list = people.filter((p) => p.status === col.key);
          return (
            <section key={col.key} className={`cr-col${over === col.key ? " over" : ""}`} {...zone(col.key)} aria-label={col.label}>
              <header>
                <span className="lbl">{col.label}</span>
                <b className="disp">{list.length}</b>
                {rate(col.key) && <small className="disp muted">{rate(col.key)}</small>}
              </header>
              {list.map(card)}
            </section>
          );
        })}
      </div>
      <section className={`cr-lost${over === "non" ? " over" : ""}${lost ? " open" : ""}`} {...zone("non")} aria-label={stageLabel("non")}>
        <button type="button" className="cr-lost-h" onClick={() => setLost(!lost)} aria-expanded={lost}>
          <span className="lbl">{stageLabel("non")}</span><b className="disp">{non.length}</b>
        </button>
        {lost && <div className="cr-lost-list">{non.map(card)}</div>}
      </section>
    </div>
  );
}
