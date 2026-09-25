"use client";

import { useEffect, useRef } from "react";
import { LOGO_PATH, CY, capPath, colorOf, makeCanvas, polar, reduced, rgbOf, sectorPath } from "./brand";

// Chargement : le symbole en orbite, une traînée qui s'efface derrière la tête.
// Vitesse constante, un tour en `lap` secondes. Prend la couleur du texte parent.
export default function Orbit({ size = 48, lap = 1.2, trail = 300, className = "" }: { size?: number; lap?: number; trail?: number; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const host = ref.current; if (!host) return;
    const color = colorOf(host);
    const { cv, ctx, dpr } = makeCanvas(size, size);
    cv.setAttribute("role", "progressbar"); cv.setAttribute("aria-label", "Chargement");
    host.replaceChildren(cv);
    const logo = new Path2D(LOGO_PATH), rgb = rgbOf(color), k = (size * dpr) / 100;
    let raf = 0; const t0 = performance.now();
    const paint = (now: number) => {
      const t = (now - t0) / 1000;
      ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalCompositeOperation = "source-over"; ctx.clearRect(0, 0, cv.width, cv.height);
      ctx.setTransform(k, 0, 0, k, 0, 0);
      const head = 180 + ((t / lap) % 1) * 360, tail = head - trail;
      const p0 = polar(tail); let span = (polar(head) - p0) / (2 * Math.PI); span = ((span % 1) + 1) % 1; if (span < 0.001) span = 1;
      const g = ctx.createConicGradient(p0, 50, CY);
      for (let i = 0; i <= 24; i++) { const u = i / 24; g.addColorStop(u * span, `rgba(${rgb},${Math.min(1, Math.pow(u / 0.9, 1.6)).toFixed(4)})`); }
      if (span < 0.999) g.addColorStop(Math.min(1, span + 0.0005), `rgba(${rgb},0)`);
      ctx.fillStyle = g; ctx.fill(sectorPath(tail, head));
      const cap = capPath(head); if (cap) { ctx.fillStyle = color; ctx.fill(cap); }
      ctx.globalCompositeOperation = "destination-in"; ctx.fillStyle = "#000"; ctx.fill(logo);
      ctx.globalCompositeOperation = "source-over";
      raf = requestAnimationFrame(paint);
    };
    if (reduced()) { ctx.setTransform(k, 0, 0, k, 0, 0); ctx.fillStyle = color; ctx.fill(logo); }
    else raf = requestAnimationFrame(paint);
    return () => { cancelAnimationFrame(raf); };
  }, [size, lap, trail]);

  return <span ref={ref} className={`orbit${className ? ` ${className}` : ""}`} style={{ width: size, height: size }} aria-hidden="true" />;
}
