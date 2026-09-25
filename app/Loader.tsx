"use client";

import { useEffect, useState } from "react";
import Orbit from "./Orbit";

// Voile de chargement : le symbole en orbite, petit, le temps que les polices arrivent. Puis le voile s'efface.
export default function Loader() {
  const [gone, setGone] = useState(false);

  useEffect(() => {
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
