"use client";

import { useState } from "react";
import AppMock from "./AppMock";
import Logo from "./Logo";
import Mark from "./Mark";
import DotIcon from "./DotIcon";

type Tab = "calendrier" | "kanban" | "liste" | "serie";
const tabs: { id: Tab; label: string }[] = [
  { id: "calendrier", label: "Calendrier" },
  { id: "kanban", label: "Kanban" },
  { id: "liste", label: "Liste" },
  { id: "serie", label: "Série" },
];
const sideIcons = ["semaine", "idee", "serie", "script", "reglages"] as const;
const side = ["Ma semaine", "Idées", "Série", "Scripts", "Réglages"];

// Visualiseur de l'espace Semper : barre latérale, en-tête, chiffres de la semaine,
// puis les onglets qui changent la vue sur les mêmes fiches. Des cartes flottent hors du cadre.
export default function AppView() {
  const [tab, setTab] = useState<Tab>("calendrier");
  return (
    <div className="app-shell">
      <div className="app" data-tilt aria-label="Aperçu de Semper">
        <div className="app-chrome"><span className="dots"><i /><i /><i /></span><div className="app-url"><Mark /> trysemper.app/semaine-39</div></div>
        <div className="app-main">
          <aside className="app-side">
            <Logo />
            <ul>
              {side.map((s, i) => <li key={s} className={i === 0 ? "on" : ""}><DotIcon name={sideIcons[i]} /><span>{s}</span></li>)}
            </ul>
            <div className="app-lvl"><b>Niveau 2</b><span>Régulier</span></div>
          </aside>

          <div className="app-content">
            <header className="app-head">
              <div><small>Semaine 39 · 21 au 27 septembre</small><h4>Ta semaine</h4></div>
              <div className="tabs" role="tablist">
                {tabs.map((t) => (
                  <button key={t.id} role="tab" aria-selected={tab === t.id} className={tab === t.id ? "on" : ""} onClick={() => setTab(t.id)}>{t.label}</button>
                ))}
              </div>
              <span className="app-btn">+ Créer</span>
            </header>

            <ul className="app-stats">
              <li><small>Série</small><b>7 <span>semaines</span></b><i className="bar"><i style={{ width: "58%" }} /></i></li>
              <li><small>Cette semaine</small><b>1 <span>/ 2 publiées</span></b><i className="bar"><i style={{ width: "50%" }} /></i></li>
              <li><small>En cours</small><b>8 <span>fiches</span></b><em>3 idées · 2 à tourner</em></li>
              <li><small>Prochaine</small><b>Lun 21 <span>· 19 h</span></b><em>Pourquoi tu t&apos;arrêtes</em></li>
            </ul>

            <div className="app-body">
              {tab === "calendrier" && <div className="pane" key="c"><AppMock /></div>}
              {tab === "kanban" && (
                <div className="pane kanban" key="k">
                  <div className="kcol"><h4>Idée <span>3</span></h4><div className="kcard">Le piège du volume<small>Instagram</small></div><div className="kcard">Ce que je ferais à 0 abonné<small>TikTok</small></div><div className="kcard ghost">+ Nouvelle idée</div></div>
                  <div className="kcol"><h4>À écrire <span>1</span></h4><div className="kcard">Le stock, pas la motivation<small>Jeu 24</small></div></div>
                  <div className="kcol"><h4>À tourner <span>2</span></h4><div className="kcard hot">Pourquoi tu t&apos;arrêtes<small>Lun 21 · 19 h</small></div><div className="kcard">Ma méthode en 3 blocs<small>Sam 26</small></div></div>
                  <div className="kcol"><h4>À monter <span>1</span></h4><div className="kcard">3 erreurs de calendrier<small>Mer 23</small></div></div>
                  <div className="kcol"><h4>Publié <span>4</span></h4><div className="kcard">Ma semaine de fondateur<small>Ven 25 · 12 400 vues</small></div><div className="kcard">Semaine 38 · 2 vidéos<small>Tenue</small></div></div>
                </div>
              )}
              {tab === "liste" && (
                <div className="pane list" key="l">
                  <div className="row head"><span>Contenu</span><span>Statut</span><span>Date</span><span>Plateforme</span></div>
                  <div className="row"><b>Pourquoi tu t&apos;arrêtes</b><span className="chip s-tourner">À tourner</span><span className="date">Lun 21</span><span className="plat">Instagram</span></div>
                  <div className="row"><b>3 erreurs de calendrier</b><span className="chip s-monter">À monter</span><span className="date">Mer 23</span><span className="plat">Instagram · TikTok</span></div>
                  <div className="row"><b>Le stock, pas la motivation</b><span className="chip s-ecrire">À écrire</span><span className="date">Jeu 24</span><span className="plat">YouTube</span></div>
                  <div className="row"><b>Ma semaine de fondateur</b><span className="chip s-publie">Publié</span><span className="date">Ven 25</span><span className="plat">YouTube</span></div>
                  <div className="row"><b>Le piège du volume</b><span className="chip s-idee">Idée</span><span className="date">Sam 26</span><span className="plat">Instagram</span></div>
                </div>
              )}
              {tab === "serie" && (
                <div className="pane serie" key="s">
                  <div className="serie-big"><b>7</b><span>semaines tenues d&apos;affilée</span><span className="lvl">Niveau 2 · Régulier</span></div>
                  <div className="weeks">
                    {Array.from({ length: 12 }).map((_, i) => <i key={i} className={i < 7 ? "on" : i === 7 ? "now" : ""} style={{ animationDelay: `${i * 70}ms` }} />)}
                    <div className="weeks-l"><span>Semaine 32</span><span>Semaine 43</span></div>
                    <p className="serie-goal">Ton objectif : <b>2 vidéos par semaine</b>. Cette semaine : 1 publiée, 1 à monter. Une semaine tenue compte, jamais le volume.</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* détails qui débordent du cadre */}
      <div className="float f1" aria-hidden="true">
        <span className="f-ico"><Mark /></span>
        <div><b>Semaine 38 tenue</b><small>Ta série passe à 7</small></div>
      </div>
      <div className="float f2" aria-hidden="true">
        <span className="chip s-publie">Publié</span>
        <b>Ma semaine de fondateur</b>
        <small>YouTube · Ven 25 · 12 400 vues</small>
      </div>
      <div className="float f3" aria-hidden="true"><i className="dot" /> Sauvegardé à l&apos;instant</div>
    </div>
  );
}
