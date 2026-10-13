"use client";

import { useEffect, useRef, useState } from "react";
import Mark from "./Mark";
import Moon from "./(app)/Moon";
import { DEMO_FRAME } from "./(app)/demo";
import { MONTHS_SHORT } from "./(app)/lib";

// L'aperçu de la vitrine : le vrai espace Semper, chargé dans un cadre sur des données de démonstration
// (voir app/(app)/demo.ts). Toute évolution de l'outil s'y voit d'elle-même. Hauteur fixe : passer du
// calendrier à la constance ne fait pas bouger la page. La barre d'adresse suit la page ouverte.
export default function AppDemo() {
  const frame = useRef<HTMLIFrameElement>(null);
  const [path, setPath] = useState("/calendrier");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const t = setInterval(() => {
      try {
        const w = frame.current?.contentWindow;
        if (w?.document.readyState === "complete" && w.location.pathname !== "blank") { setPath(w.location.pathname); setReady(true); }
      } catch {}
    }, 400);
    return () => clearInterval(t);
  }, []);

  const monday = new Date();
  monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7));
  const lundi = `lun. ${monday.getDate()} ${MONTHS_SHORT[monday.getMonth()]}`;

  return (
    <div className="app-shell">
      <div className="app" aria-label="Aperçu de Semper, avec des données de démonstration">
        <div className="app-chrome"><span className="dots"><i /><i /><i /></span><div className="app-url"><Mark /> trysemper.app{path}</div></div>
        <iframe ref={frame} name={DEMO_FRAME} src="/calendrier" title="Semper, espace de démonstration" className={`app-frame${ready ? " on" : ""}`}
          onLoad={() => setReady(true)} />
        {/* le cadre peut finir de charger avant que la page soit prête : l'intervalle le rattrape */}
      </div>

      {/* détails qui débordent du cadre, tels que l'outil les affiche */}
      <div className="float f1" aria-hidden="true">
        <Moon streak={7} n={9} />
        <span>Semaine tenue · 7 d&apos;affilée</span>
      </div>
      <div className="float f2" aria-hidden="true">
        <span className="chip s-publie">Publié</span>
        <b>Ma semaine de fondateur</b>
        <small suppressHydrationWarning>Attacher · Coulisses · {lundi}</small>
      </div>
    </div>
  );
}
