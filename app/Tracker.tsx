"use client";

import { useEffect, useRef } from "react";
import MarkDots from "./MarkDots";

// Le signe du dernier appel suit la souris : le point tourne pour rester orienté vers le curseur.
// Au repos (écran tactile, pas de souris), il garde son animation habituelle.
export default function Tracker() {
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const svg = ref.current?.querySelector("svg");
    if (!svg || matchMedia("(hover: none)").matches || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    svg.classList.add("track");
    let target = 0, current = 0, raf = 0;
    const tick = () => {
      let d = target - current;
      d = ((d + 540) % 360) - 180;           // toujours par le chemin le plus court
      current += d * 0.12;
      svg.style.transform = `rotate(${current.toFixed(2)}deg)`;
      raf = Math.abs(d) > 0.05 ? requestAnimationFrame(tick) : 0;
    };
    const move = (e: PointerEvent) => {
      const r = svg.getBoundingClientRect();
      const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
      // le point est à -45° au repos (en haut à droite) : on compense
      target = (Math.atan2(e.clientY - cy, e.clientX - cx) * 180) / Math.PI + 45;
      if (!raf) raf = requestAnimationFrame(tick);
    };
    addEventListener("pointermove", move, { passive: true });
    return () => { removeEventListener("pointermove", move); if (raf) cancelAnimationFrame(raf); };
  }, []);

  return <span ref={ref} className="tracker"><MarkDots className="mark-xl" /></span>;
}
