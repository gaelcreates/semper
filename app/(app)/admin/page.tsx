"use client";

import { useState } from "react";
import { constance } from "../stats";
import { LEAD_STATUS, setLead, useData, type LeadStatus } from "../store";

// Les inscrits, pour le setting : pseudo Instagram, activité, statut de prospection et note.
// En mode local, seul ce navigateur apparaît ; la vraie liste arrive avec Supabase.
export default function Admin() {
  const d = useData()!;
  const [tab, setTab] = useState<LeadStatus | "all">("all");
  const s = constance(d);
  const ans = d.profile.answers;
  const txt = (v: unknown) => (Array.isArray(v) ? v.join(", ") : String(v ?? ""));
  const rows = [{
    id: "local", name: d.profile.firstName, handle: d.profile.handle, since: new Date(d.profile.createdAt),
    abonnes: txt(ans.abonnes), pour: txt(ans.pourquoi), source: txt(ans.source), total: s.total, streak: s.streak, lead: d.lead,
  }];
  const shown = rows.filter((r) => tab === "all" || r.lead.status === tab);

  return (
    <div className="page wide">
      <header className="page-head"><h1>Inscrits</h1><b className="disp count">{rows.length}</b></header>

      <div className="seg ad-tabs" role="tablist">
        {[{ key: "all" as const, label: "Tous" }, ...LEAD_STATUS].map((t) => (
          <button key={t.key} role="tab" aria-selected={tab === t.key} className={tab === t.key ? "on" : ""} onClick={() => setTab(t.key)}>
            {t.label} <b className="disp">{t.key === "all" ? rows.length : rows.filter((r) => r.lead.status === t.key).length}</b>
          </button>
        ))}
      </div>

      <div className="ad box" role="table">
        <div className="ad-row ad-head" role="row">
          <span className="lbl">Créateur</span><span className="lbl">Abonnés</span><span className="lbl">Crée pour</span><span className="lbl">Source</span>
          <span className="lbl">Inscrit</span><span className="lbl">Publiées</span><span className="lbl">Série</span><span className="lbl">Statut</span><span className="lbl">Note</span>
        </div>
        {shown.map((r) => (
          <div className="ad-row" role="row" key={r.id}>
            <span className="who">
              <b>{r.name || "Sans prénom"}</b>
              {r.handle ? <a href={`https://www.instagram.com/${r.handle}/`} target="_blank" rel="noreferrer">@{r.handle}</a> : <span className="muted">Sans pseudo</span>}
            </span>
            <span>{r.abonnes}</span>
            <span className="muted clip" title={r.pour}>{r.pour}</span>
            <span className="muted">{r.source}</span>
            <span className="muted">{r.since.toLocaleDateString("fr-CH")}</span>
            <b className="disp">{r.total}</b>
            <b className="disp">{r.streak}</b>
            <select className="inp" value={r.lead.status} onChange={(e) => setLead({ status: e.target.value as LeadStatus })} aria-label="Statut">
              {LEAD_STATUS.map((l) => <option key={l.key} value={l.key}>{l.label}</option>)}
            </select>
            <input className="inp" value={r.lead.note} onChange={(e) => setLead({ note: e.target.value })} placeholder="Note" aria-label="Note" />
          </div>
        ))}
      </div>
      <p className="fine">Mode local : seul ce navigateur apparaît.</p>
    </div>
  );
}
