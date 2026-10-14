"use client";

import { useState } from "react";
import IdeaRow, { ideasOf } from "../Idees";
import { addContent, useData } from "../store";

// Idées : l'endroit où tout se pose. Une idée se tape en une ligne, et passe dans la semaine en deux clics.
export default function Idees() {
  const d = useData()!;
  const [t, setT] = useState("");
  const list = ideasOf(d.contents);
  function add(e: React.FormEvent) {
    e.preventDefault();
    if (!t.trim()) return;
    addContent({ title: t.trim().slice(0, 200) });
    setT("");
  }
  return (
    <div className="page">
      <header className="page-head"><h1>Idées</h1>{list.length > 0 && <span className="count disp">{list.length}</span>}</header>
      <form className="idea-add" onSubmit={add}>
        <input className="inp big" value={t} onChange={(e) => setT(e.target.value)} placeholder="Une idée de vidéo…" autoFocus aria-label="Nouvelle idée" />
        <button type="submit" className="btn" disabled={!t.trim()}>Ajouter</button>
      </form>
      {list.length ? <div className="ideas">{list.map((c) => <IdeaRow key={c.id} c={c} del />)}</div>
        : <p className="empty">Aucune idée pour l&apos;instant. Les jeux du jour en trouvent.</p>}
    </div>
  );
}
