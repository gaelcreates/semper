"use client";

import { useState } from "react";
import AppMock from "./AppMock";
import Logo from "./Logo";
import Mark from "./Mark";
import DotIcon from "./DotIcon";
import Moon from "./(app)/Moon";

// L'aperçu de l'espace Semper, fidèle à l'outil (13 oct) : barre latérale (nouveau contenu, menu, profil, lune),
// en-tête de la page Calendrier (semaine, période, vue), filtres, et la page Constance. Des détails débordent du cadre.
type View = "calendrier" | "kanban" | "liste";
type Page = "calendrier" | "constance";
const views: View[] = ["calendrier", "kanban", "liste"];
const nav = [
  { icon: "cal", label: "Calendrier", page: "calendrier" },
  { icon: "lune", label: "Constance", page: "constance" },
  { icon: "orga", label: "Organisation" },
  { icon: "profil", label: "Profil" },
] as const;

const KANBAN: [string, string, { t: string; d: string; tag?: string }[]][] = [
  ["Idée", "s-idee", [{ t: "Le piège du volume", d: "Sans date", tag: "Attacher · Avis" }]],
  ["À écrire", "s-ecrire", [{ t: "3 erreurs de calendrier", d: "ven. 16 oct. · 12:00", tag: "Attirer · Erreur" }, { t: "Ma méthode en 3 blocs", d: "dim. 18 oct. · 19:00", tag: "Convertir · Tutoriel" }]],
  ["À tourner", "s-tourner", []],
  ["À monter", "s-monter", [{ t: "Pourquoi tu t'arrêtes", d: "mer. 14 oct. · 18:00", tag: "Convertir · Offre" }]],
  ["Prêt", "s-pret", []],
  ["Publié", "s-publie", [{ t: "Ma semaine de fondateur", d: "lun. 12 oct. · 18:00", tag: "Attacher · Coulisses" }]],
];
const LIST = [
  ["Ma semaine de fondateur", "Publié", "s-publie", "lun. 12 oct. · 18:00", "Attacher · Coulisses"],
  ["Pourquoi tu t'arrêtes", "À monter", "s-monter", "mer. 14 oct. · 18:00", "Convertir · Offre"],
  ["3 erreurs de calendrier", "À écrire", "s-ecrire", "ven. 16 oct. · 12:00", "Attirer · Erreur"],
  ["Ma méthode en 3 blocs", "À écrire", "s-ecrire", "dim. 18 oct. · 19:00", "Convertir · Tutoriel"],
  ["Le piège du volume", "Idée", "s-idee", "Sans date", "Attacher · Avis"],
];
const PHASES = [["Nouvelle lune", 0], ["Premier croissant", 1], ["Premier quartier", 2], ["Lune gibbeuse", 4], ["Pleine lune", 8], ["Équinoxe", 13]] as const;

// « Attacher · Avis » : au téléphone, la colonne est trop étroite, seul le sous-choix reste.
function Tag({ v }: { v: string }) {
  const [o, s] = v.split(" · ");
  return <i className="tag">{s ? <><span className="tag-o">{o} · </span>{s}</> : o}</i>;
}

export default function AppView() {
  const [view, setView] = useState<View>("calendrier");
  const [page, setPage] = useState<Page>("calendrier");
  const cal = page === "calendrier" && view === "calendrier";
  return (
    <div className="app-shell">
      <div className="app" data-tilt aria-label="Aperçu de Semper">
        <div className="app-chrome"><span className="dots"><i /><i /><i /></span><div className="app-url"><Mark /> trysemper.app/{page}</div></div>
        <div className="app-main">
          <aside className="app-side">
            <Logo />
            <span className="app-new"><DotIcon name="ajout" /> Nouveau contenu</span>
            <ul>
              {nav.map((n) => (
                <li key={n.label} className={"page" in n && n.page === page ? "on" : ""}>
                  {"page" in n ? <button type="button" onClick={() => setPage(n.page)}><DotIcon name={n.icon} /><span>{n.label}</span></button> : <span className="app-nav-i"><DotIcon name={n.icon} /><span>{n.label}</span></span>}
                </li>
              ))}
            </ul>
            <div className="app-me"><i>L</i><span><b>Léa</b><small>@lea.cree</small></span></div>
            <div className="app-moon"><Moon streak={6} n={11} /><span><b>Lune gibbeuse</b><small className="disp">6 sem.</small></span></div>
          </aside>

          <div className="app-content">
            <header className="app-head">
              <div><small>{page === "constance" ? "\u00a0" : cal ? "Semaine 42" : "5 sur 5"}</small><h4>{page === "constance" ? "Constance" : cal ? "12 au 18 oct." : "Contenus"}</h4></div>
              {page === "calendrier" && (
                <div className="app-ctrl">
                  {cal && <span className="app-today" aria-hidden="true"><DotIcon name="gauche" /><span>Aujourd&apos;hui</span><DotIcon name="droite" /></span>}
                  {cal && <span className="tabs app-span" aria-hidden="true"><span className="on">Semaine</span><span>Mois</span></span>}
                  <div className="tabs" role="tablist">
                    {views.map((v) => (
                      <button key={v} role="tab" aria-selected={view === v} className={view === v ? "on" : ""} onClick={() => setView(v)}>{v[0].toUpperCase() + v.slice(1)}</button>
                    ))}
                  </div>
                </div>
              )}
            </header>
            {page === "calendrier" && (
              <div className="app-filters" aria-hidden="true">
                <span className="f-search"><DotIcon name="loupe" /> Rechercher</span><span>Statut</span><span>Objectif</span>
              </div>
            )}

            <div className="app-body">
              {cal && <div className="pane" key="c"><AppMock /></div>}
              {page === "calendrier" && view === "kanban" && (
                <div className="pane kanban" key="k">
                  {KANBAN.map(([label, , cards]) => (
                    <div className="kcol" key={label}>
                      <h4><span className="lbl">{label}</span><b className="disp">{cards.length}</b></h4>
                      {cards.map((c) => <div className="kcard" key={c.t}>{c.t}<small>{c.d}</small>{c.tag && <Tag v={c.tag} />}</div>)}
                    </div>
                  ))}
                </div>
              )}
              {page === "calendrier" && view === "liste" && (
                <div className="pane list" key="l">
                  <div className="row head"><span>Titre</span><span>Statut</span><span>Publication</span><span>Objectif</span></div>
                  {LIST.map(([t, s, cls, d, o]) => (
                    <div className="row" key={t}><b>{t}</b><span className={`chip ${cls}`}>{s}</span><span className="date">{d}</span><span className="plat">{o}</span></div>
                  ))}
                </div>
              )}
              {page === "constance" && (
                <div className="pane cst" key="s">
                  <div className="cst-card">
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
                    <div className="cst-phases">
                      {PHASES.map(([n, w]) => <span key={n} className={n === "Lune gibbeuse" ? "on" : w > 6 ? "off" : ""}><small className="lbl">{n}</small><b className="disp">{w}</b></span>)}
                    </div>
                  </div>
                  <div className="cst-stats">
                    <span><small className="lbl">Record</small><b className="disp">9</b><em>semaines</em></span>
                    <span><small className="lbl">Cette semaine</small><b className="disp">1<i>/2</i></b><em>2 / sem.</em></span>
                    <span><small className="lbl">Publiées</small><b className="disp">23</b><em>vidéos</em></span>
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
        <small>Attacher · Coulisses · lun. 12 oct.</small>
      </div>
      <div className="float f3" aria-hidden="true"><i className="dot" /> Sauvegardé à l&apos;instant</div>
    </div>
  );
}
