"use client";

import { useEffect, useState } from "react";
import MarkDots from "./MarkDots";

// Voile de chargement : le signe tourne le temps que les polices arrivent, puis s'efface.
export default function Loader() {
  const [gone, setGone] = useState(false);

  useEffect(() => {
    const start = performance.now();
    const ready = (document.fonts?.ready ?? Promise.resolve()) as Promise<unknown>;
    let t: number;
    ready.then(() => {
      const wait = Math.max(0, 900 - (performance.now() - start));
      t = window.setTimeout(() => setGone(true), wait);
    });
    return () => window.clearTimeout(t);
  }, []);

  return (
    <div className={`loader${gone ? " out" : ""}`} aria-hidden="true">
      <MarkDots spin />
    </div>
  );
}
