"use client";

import { useEffect, useRef, useState } from "react";
import { SYMBOL_BOX as b, drawSymbolAt, easeIO, colorOf, makeCanvas, reduced } from "./brand";

// Voile de chargement : le symbole se dessine en un tour, de la pointe gauche à la pointe droite,
// le temps que les polices arrivent. Puis le voile s'efface.
const SIZE = 72;                                     // hauteur du symbole en px
const DELAY = 0.15, DURATION = 1.1;                  // départ et durée du tracé, en secondes

export default function Loader() {
  const [gone, setGone] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const host = ref.current; if (!host) return;
    const w = (SIZE * b.w) / b.h;
    const { cv, ctx, dpr } = makeCanvas(w, SIZE);
    host.replaceChildren(cv);
    const color = colorOf(host), k = (SIZE / b.h) * dpr;
    let raf = 0; const t0 = performance.now();
    if (reduced()) drawSymbolAt(ctx, k, color, 1, -b.x, -b.y);
    else {
      const frame = (now: number) => {
        const q = easeIO(((now - t0) / 1000 - DELAY) / DURATION);
        ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, cv.width, cv.height);
        drawSymbolAt(ctx, k, color, q, -b.x, -b.y);
        if (q < 1) raf = requestAnimationFrame(frame);
      };
      raf = requestAnimationFrame(frame);
    }
    const start = performance.now();
    const ready = (document.fonts?.ready ?? Promise.resolve()) as Promise<unknown>;
    let t = 0;
    ready.then(() => {
      const wait = Math.max(0, (DELAY + DURATION) * 1000 + 250 - (performance.now() - start));
      t = window.setTimeout(() => setGone(true), wait);
    });
    return () => { cancelAnimationFrame(raf); window.clearTimeout(t); };
  }, []);

  return (
    <div className={`loader${gone ? " out" : ""}`} aria-hidden="true">
      <span ref={ref} className="loader-mark" />
    </div>
  );
}
