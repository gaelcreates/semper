"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import Orbit from "./Orbit";

const none = () => () => {};

// Voile de chargement : le symbole en orbite, petit, le temps que les polices arrivent. Puis le voile s'efface.
// Seulement au premier chargement : après une navigation dans le site, la page arrive tout de suite (classe « back »).
export default function Loader() {
  const first = useSyncExternalStore(none, () => false, () => true);
  const [gone, setGone] = useState(!first);

  useEffect(() => {
    if (gone) { document.documentElement.classList.add("back"); return; }
    const start = performance.now();
    const ready = (document.fonts?.ready ?? Promise.resolve()) as Promise<unknown>;
    let t = 0;
    ready.then(() => {
      const wait = Math.max(0, 900 - (performance.now() - start));
      t = window.setTimeout(() => setGone(true), wait);
    });
    return () => window.clearTimeout(t);
  }, []);

  return (
    <div className={`loader${gone ? " out" : ""}`} aria-hidden="true">
      <span className="loader-mark"><Orbit size={36} /></span>
    </div>
  );
}
