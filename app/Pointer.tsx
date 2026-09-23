"use client";

import { useEffect } from "react";

// Suit le curseur : halo global (--mx/--my), reflet sur les cartes [data-spot] (--x/--y)
// et légère inclinaison des blocs [data-tilt] (--rx/--ry). Rien sur les écrans tactiles.
export default function Pointer() {
  useEffect(() => {
    if (matchMedia("(hover: none)").matches) return;
    const root = document.documentElement;
    let raf = 0;
    let last: PointerEvent | null = null;

    const paint = () => {
      raf = 0;
      if (!last) return;
      const e = last;
      root.style.setProperty("--mx", `${e.clientX}px`);
      root.style.setProperty("--my", `${e.clientY}px`);
      const el = e.target as Element | null;
      const spot = el?.closest?.("[data-spot]") as HTMLElement | null;
      if (spot) {
        const r = spot.getBoundingClientRect();
        spot.style.setProperty("--x", `${e.clientX - r.left}px`);
        spot.style.setProperty("--y", `${e.clientY - r.top}px`);
      }
      const tilt = el?.closest?.("[data-tilt]") as HTMLElement | null;
      if (tilt) {
        const r = tilt.getBoundingClientRect();
        const px = (e.clientX - r.left) / r.width - 0.5;
        const py = (e.clientY - r.top) / r.height - 0.5;
        tilt.style.setProperty("--ry", `${(px * 5).toFixed(2)}deg`);
        tilt.style.setProperty("--rx", `${(-py * 5).toFixed(2)}deg`);
      }
    };
    const move = (e: PointerEvent) => {
      last = e;
      if (!raf) raf = requestAnimationFrame(paint);
    };
    const out = (e: Event) => {
      const t = e.target as HTMLElement | null;
      if (t?.matches?.("[data-tilt]")) {
        t.style.setProperty("--rx", "0deg");
        t.style.setProperty("--ry", "0deg");
      }
    };
    window.addEventListener("pointermove", move, { passive: true });
    document.addEventListener("pointerleave", out, true);
    return () => {
      window.removeEventListener("pointermove", move);
      document.removeEventListener("pointerleave", out, true);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);
  return null;
}
