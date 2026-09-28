"use client";

import { useState } from "react";
import { short } from "./lib";
import { STATUS, openSheet, patchContent, statusOf, withStatus, type Content, type Field, type Status } from "./store";

const byDate = (a: Content, b: Content) => (a.publishAt ?? "9999").localeCompare(b.publishAt ?? "9999");
const values = (c: Content, fields: Field[]) =>
  fields.flatMap((f) => { const v = c.values[f.id]; return Array.isArray(v) ? v : v ? [v] : []; });

// Le kanban : une colonne par statut. Glisser une carte change son statut.
export function Kanban({ contents, fields }: { contents: Content[]; fields: Field[] }) {
  const [over, setOver] = useState<Status | null>(null);
  const tags = fields.filter((f) => f.type === "choix" || f.type === "multi");

  function drop(e: React.DragEvent, s: Status) {
    e.preventDefault();
    setOver(null);
    const id = e.dataTransfer.getData("text/plain");
    const c = contents.find((x) => x.id === id);
    if (!c || statusOf(c) === s) return;
    patchContent(id, (c) => withStatus(c, s));
    // Une idée qui avance a besoin d'une date : on ouvre sa fiche.
    if (!c.publishAt && s !== "idee" && s !== "publie") openSheet(id);
  }

  return (
    <div className="kb">
      {STATUS.map((col) => {
        const list = contents.filter((c) => statusOf(c) === col.key).sort(byDate);
        return (
          <section key={col.key} className={`kb-col${over === col.key ? " over" : ""}`}
            onDragOver={(e) => { e.preventDefault(); setOver(col.key); }}
            onDragLeave={() => setOver((o) => (o === col.key ? null : o))}
            onDrop={(e) => drop(e, col.key)}>
            <header><span className="lbl">{col.label}</span><b className="disp">{list.length}</b></header>
            {list.map((c) => (
              <button type="button" key={c.id} className="kb-card" draggable
                onDragStart={(e) => e.dataTransfer.setData("text/plain", c.id)} onClick={() => openSheet(c.id)}>
                <b>{c.title || "Sans titre"}</b>
                <small>{short(c.publishAt)}</small>
                {values(c, tags).length > 0 && <span className="tags">{values(c, tags).slice(0, 3).map((v) => <i key={v}>{v}</i>)}</span>}
              </button>
            ))}
          </section>
        );
      })}
    </div>
  );
}

// La liste : tout d'un coup d'œil, trié par date de publication.
export function List({ contents, fields }: { contents: Content[]; fields: Field[] }) {
  const cols = fields.filter((f) => f.type !== "long").slice(0, 3);
  const grid = { gridTemplateColumns: `minmax(0, 2.2fr) 104px 168px${" minmax(0, 1fr)".repeat(cols.length)}` };
  if (!contents.length) return <p className="empty">Aucun contenu.</p>;
  return (
    <div className="ls" role="table">
      <div className="ls-row ls-head" style={grid} role="row">
        <span className="lbl">Titre</span><span className="lbl">Statut</span><span className="lbl">Publication</span>
        {cols.map((f) => <span key={f.id} className="lbl col-f">{f.label}</span>)}
      </div>
      {[...contents].sort(byDate).map((c) => {
        const st = statusOf(c);
        return (
          <button type="button" key={c.id} className="ls-row" style={grid} role="row" onClick={() => openSheet(c.id)}>
            <b>{c.title || "Sans titre"}</b>
            <span><i className={`chip st-${st}`}>{STATUS.find((s) => s.key === st)!.label}</i></span>
            <span className="muted">{short(c.publishAt)}</span>
            {cols.map((f) => <span key={f.id} className="muted col-f">{values(c, [f]).join(", ")}</span>)}
          </button>
        );
      })}
    </div>
  );
}
