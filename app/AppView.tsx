"use client";

import { useState } from "react";
import AppMock from "./AppMock";
import Logo from "./Logo";
import Mark from "./Mark";
import DotIcon from "./DotIcon";
import Moon from "./(app)/Moon";

// L'aperçu de l'espace Semper, fidèle à l'outil (V1) : barre latérale avec la lune et le titre,
// les trois vues du calendrier et Constance. Des détails débordent du cadre.
type Tab = "calendrier" | "kanban" | "liste" | "constance";
const tabs: { id: Tab; label: string }[] = [
  { id: "calendrier", label: "Calendrier" },
  { id: "kanban", label: "Kanban" },
  { id: "liste", label: "Liste" },
  { id: "constance", label: "Constance" },
];
const nav = [
  { icon: "cal", label: "Calendrier" },
  { icon: "lune", label: "Constance" },
  { icon: "orga", label: "Organisation" },
  { icon: "profil", label: "Profil" },
] as const;

const KANBAN: [string, string, { t: string; d: string; tag?: string }[]][] = [
  ["Idée", "s-idee", [{ t: "Le piège du volume", d: "Sans date", tag: "Attacher · Avis" }]],
  ["À écrire", "s-ecrire", [{ t: "Ma méthode en 3 blocs", d: "sam. 3 oct. · 19:00", tag: "Convertir · Tutoriel" }]],
  ["À tourner", "s-tourner", [{ t: "3 erreurs de calendrier", d: "jeu. 1 oct. · 12:00", tag: "Attirer · Erreur" }]],
  ["À monter", "s-monter", [{ t: "Pourquoi tu t'arrêtes", d: "mar. 29 sept. · 18:00", tag: "Convertir · Offre" }]],
  ["Prêt", "s-pret", []],
  ["Publié", "s-publie", [{ t: "Ma semaine de fondateur", d: "lun. 28 sept. · 18:00", tag: "Attacher · Coulisses" }]],
];
const LIST = [
  ["Ma semaine de fondateur", "Publié", "s-publie", "lun. 28 sept. · 18:00", "Attacher · Coulisses"],
  ["Pourquoi tu t'arrêtes", "À monter", "s-monter", "mar. 29 sept. · 18:00", "Convertir · Offre"],
  ["3 erreurs de calendrier", "À tourner", "s-tourner", "jeu. 1 oct. · 12:00", "Attirer · Erreur"],
  ["Ma méthode en 3 blocs", "À écrire", "s-ecrire", "sam. 3 oct. · 19:00", "Convertir · Tutoriel"],
  ["Le piège du volume", "Idée", "s-idee", "Sans date", "Attacher · Avis"],
];

// « Attacher · Avis » : au téléphone, la colonne est trop étroite, seul le sous-choix reste.
function Tag({ v }: { v: string }) {
  const [o, s] = v.split(" · ");
  return <i className="tag">{s ? <><span className="tag-o">{o} · </span>{s}</> : o}</i>;
}

export default function AppView() {
  const [tab, setTab] = useState<Tab>("calendrier");
  return (
    <div className="app-shell">
      <div className="app" data-tilt aria-label="Aperçu de Semper">
        <div className="app-chrome"><span className="dots"><i /><i /><i /></span><div className="app-url"><Mark /> trysemper.app/{tab === "constance" ? "constance" : "calendrier"}</div></div>
        <div className="app-main">
          <aside className="app-side">
            <Logo />
            <span className="app-new"><DotIcon name="ajout" /> Nouveau contenu</span>
            <ul>
              {nav.map((n, i) => (
                <li key={n.label} className={(tab === "constance" ? i === 1 : i === 0) ? "on" : ""}><DotIcon name={n.icon} /><span>{n.label}</span></li>
              ))}
            </ul>
            <div className="app-moon"><Moon streak={6} n={11} /><span><b>Lune gibbeuse</b><small className="disp">6 sem.</small></span></div>
          </aside>

          <div className="app-content">
            <header className="app-head">
              <div><small>{tab === "constance" ? "Série" : "Semaine 40"}</small><h4>{tab === "constance" ? "Constance" : tab === "calendrier" ? "28 sept. au 4 oct." : "Contenus"}</h4></div>
              <div className="tabs" role="tablist">
                {tabs.map((t) => (
                  <button key={t.id} role="tab" aria-selected={tab === t.id} className={tab === t.id ? "on" : ""} onClick={() => setTab(t.id)}>{t.label}</button>
                ))}
              </div>
            </header>
            {tab !== "constance" && (
              <div className="app-filters" aria-hidden="true">
                <span className="f-search"><DotIcon name="loupe" /> Rechercher</span><span>Statut</span><span>Objectif</span>
              </div>
            )}

            <div className="app-body">
              {tab === "calendrier" && <div className="pane" key="c"><AppMock /></div>}
              {tab === "kanban" && (
                <div className="pane kanban" key="k">
                  {KANBAN.map(([label, cls, cards]) => (
                    <div className="kcol" key={label}>
                      <h4><span className="lbl">{label}</span><b className="disp">{cards.length}</b></h4>
                      {cards.map((c) => <div className="kcard" key={c.t}>{c.t}<small>{c.d}</small>{c.tag && <Tag v={c.tag} />}</div>)}
                    </div>
                  ))}
                </div>
              )}
              {tab === "liste" && (
                <div className="pane list" key="l">
                  <div className="row head"><span>Titre</span><span>Statut</span><span>Publication</span><span>Objectif</span></div>
                  {LIST.map(([t, s, cls, d, o]) => (
                    <div className="row" key={t}><b>{t}</b><span className={`chip ${cls}`}>{s}</span><span className="date">{d}</span><span className="plat">{o}</span></div>
                  ))}
                </div>
              )}
              {tab === "constance" && (
                <div className="pane cst" key="s">
                  <div className="cst-hero">
                    <Moon streak={6} n={17} orbit />
                    <div>
                      <span className="lbl"><i className="dot" /> Titre</span>
                      <b className="cst-t">Lune gibbeuse</b>
                      <span className="cst-s"><b className="disp">6</b> semaines tenues</span>
                      <span className="cst-segs">{[0, 1, 2, 3].map((i) => <i key={i} className={i < 2 ? "on" : ""} />)}</span>
                      <span className="lbl">Pleine lune dans 2 sem.</span>
                    </div>
                  </div>
                  <div className="cst-hm" aria-hidden="true">
                    {Array.from({ length: 26 * 7 }, (_, k) => {
                      const w = Math.floor(k / 7), d = k % 7;
                      const on = w >= 13 && (d === 1 || d === 4) && w !== 19;
                      return <i key={k} className={on ? (w >= 20 ? "g" : "on") : ""} />;
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* détails qui débordent du cadre */}
      <div className="float f1" aria-hidden="true">
        <Moon streak={7} n={9} />
        <span>Semaine tenue · 7 d&apos;affilée</span>
      </div>
      <div className="float f2" aria-hidden="true">
        <span className="chip s-publie">Publié</span>
        <b>Ma semaine de fondateur</b>
        <small>Attacher · Coulisses · lun. 28 sept.</small>
      </div>
      <div className="float f3" aria-hidden="true"><i className="dot" /> Sauvegardé à l&apos;instant</div>
    </div>
  );
}
