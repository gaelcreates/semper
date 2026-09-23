"use client";

import { useEffect } from "react";

// Fait apparaître les éléments [data-reveal] quand ils entrent dans l'écran,
// et fait monter les chiffres [data-count] de 0 à leur valeur.
function count(el: HTMLElement) {
  const to = Number(el.dataset.count);
  if (!to || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const start = performance.now();
  const dur = 1800;
  const tick = (now: number) => {
    const t = Math.min(1, (now - start) / dur);
    const e = 1 - Math.pow(1 - t, 4);
    el.textContent = String(Math.round(to * e));
    if (t < 1) requestAnimationFrame(tick);
  };
  el.textContent = "0";
  requestAnimationFrame(tick);
}
export default function Reveal() {
  useEffect(() => {
    const els = Array.from(document.querySelectorAll<HTMLElement>("[data-reveal]"));
    if (!("IntersectionObserver" in window)) {
      els.forEach((el) => el.classList.add("in"));
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            e.target.classList.add("in");
            e.target.querySelectorAll<HTMLElement>("[data-count]").forEach(count);
            io.unobserve(e.target);
          }
        }
      },
      { rootMargin: "0px 0px -10% 0px", threshold: 0.12 }
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);
  return null;
}
