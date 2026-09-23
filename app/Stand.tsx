"use client";

import { useEffect } from "react";

// Le visualiseur est couché sur le dos à l'arrivée ; il se relève face à nous au scroll.
// Pose --stand (0 = couché, 1 = debout) sur .mock-wrap.
export default function Stand() {
  useEffect(() => {
    const el = document.querySelector<HTMLElement>(".mock-wrap");
    if (!el) return;
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) { el.style.setProperty("--stand", "1"); return; }
    let raf = 0;
    const update = () => {
      raf = 0;
      const r = el.getBoundingClientRect();
      const vh = innerHeight;
      const p = Math.min(1, Math.max(0, (vh * 0.8 - r.top) / (vh * 0.6)));
      el.style.setProperty("--stand", p.toFixed(3));
    };
    const onScroll = () => { if (!raf) raf = requestAnimationFrame(update); };
    update();
    addEventListener("scroll", onScroll, { passive: true });
    addEventListener("resize", onScroll);
    return () => { removeEventListener("scroll", onScroll); removeEventListener("resize", onScroll); if (raf) cancelAnimationFrame(raf); };
  }, []);
  return null;
}
