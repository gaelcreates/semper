"use client";

import { useEffect, useRef } from "react";

// Fond du premier écran : les deux mains de la Création d'Adam (Michel-Ange), en matrice de points.
// Elles s'approchent, se touchent presque, un point d'or s'allume entre les doigts, puis s'écartent. En boucle.
// Les formes sont dessinées en primitives (capsules, ellipses, trapèzes) sur un canevas basse résolution,
// puis chaque case devient un point dont l'intensité suit la couverture : c'est ce qui donne le rendu afficheur.

const W = 1000, H = 300;          // espace de dessin (large et bas : les mains vivent au-dessus du titre)
const PITCH = 8;                  // pas de la matrice en px CSS : une unité (le fond bat à 24, trois unités)
const PERIOD = 9000;              // durée d'une boucle en ms
const REACH = 70;                 // amplitude du mouvement de chaque main

type Ctx = CanvasRenderingContext2D;

function capsule(c: Ctx, x1: number, y1: number, x2: number, y2: number, r: number) {
  c.lineCap = "round"; c.lineWidth = r * 2; c.beginPath(); c.moveTo(x1, y1); c.lineTo(x2, y2); c.stroke();
}
function ellipse(c: Ctx, x: number, y: number, rx: number, ry: number, rot = 0) {
  c.beginPath(); c.ellipse(x, y, rx, ry, rot, 0, Math.PI * 2); c.fill();
}
function quad(c: Ctx, pts: number[][]) {
  c.beginPath(); c.moveTo(pts[0][0], pts[0][1]); pts.slice(1).forEach((p) => c.lineTo(p[0], p[1])); c.closePath(); c.fill();
}

// Main d'Adam, venue d'en bas à gauche, relâchée : l'index retombe un peu.
function adam(c: Ctx, dx: number) {
  c.save(); c.translate(dx, 0);
  quad(c, [[-80, 252], [300, 216], [300, 274], [-80, 330]]);           // avant-bras
  ellipse(c, 350, 238, 66, 40, -0.12);                                  // paume
  capsule(c, 394, 214, 482, 206, 12);                                   // index
  capsule(c, 396, 240, 448, 246, 11);                                   // majeur replié
  capsule(c, 390, 262, 434, 268, 10);                                   // annulaire
  capsule(c, 382, 280, 414, 284, 9);                                    // auriculaire
  capsule(c, 340, 205, 372, 180, 11);                                   // pouce
  c.restore();
}
// Main de Dieu, venue d'en haut à droite, tendue : l'index pointe droit.
function god(c: Ctx, dx: number) {
  c.save(); c.translate(dx, 0);
  quad(c, [[1080, 40], [700, 150], [700, 210], [1080, 120]]);           // avant-bras
  ellipse(c, 650, 188, 66, 40, 0.1);                                    // paume
  capsule(c, 606, 196, 520, 200, 12);                                   // index
  capsule(c, 606, 214, 560, 226, 11);                                   // majeur
  capsule(c, 600, 234, 562, 246, 10);                                   // annulaire
  capsule(c, 594, 252, 568, 262, 9);                                    // auriculaire
  capsule(c, 640, 160, 618, 132, 11);                                   // pouce
  c.restore();
}

export default function HeroDots() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const still = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const low = document.createElement("canvas");
    const lctx = low.getContext("2d", { willReadFrequently: true })!;
    let cols = 0, rows = 0, scale = 1, raf = 0, visible = true, start = performance.now();

    const size = () => {
      const r = canvas.getBoundingClientRect();
      const dpr = Math.min(devicePixelRatio || 1, 2);
      canvas.width = r.width * dpr; canvas.height = r.height * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      cols = Math.ceil(r.width / PITCH); rows = Math.ceil(r.height / PITCH);
      low.width = cols; low.height = rows;
      scale = r.width / W;                              // l'espace de dessin suit la largeur
    };

    const frame = (now: number) => {
      const t = ((now - start) % PERIOD) / PERIOD;      // 0 → 1
      const a = still ? 0 : REACH * (1 - Math.cos(t * Math.PI * 2)) / 2;   // 0 = contact, REACH = écart max
      // dessin basse résolution : une case du canevas = un point de la matrice
      lctx.setTransform(1, 0, 0, 1, 0, 0);
      lctx.clearRect(0, 0, cols, rows);
      lctx.setTransform((scale / PITCH), 0, 0, (scale / PITCH), 0, 0);
      lctx.fillStyle = lctx.strokeStyle = "#000";
      adam(lctx, -a); god(lctx, a);
      const img = lctx.getImageData(0, 0, cols, rows).data;

      const r = canvas.getBoundingClientRect();
      ctx.clearRect(0, 0, r.width, r.height);
      const ink = getComputedStyle(document.documentElement).getPropertyValue("--fgr").trim() || "14, 14, 14";
      for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) {
        const cov = img[(y * cols + x) * 4 + 3] / 255;
        if (cov < 0.08) continue;
        ctx.fillStyle = `rgba(${ink}, ${(0.05 + cov * 0.18).toFixed(3)})`;
        ctx.beginPath(); ctx.arc(x * PITCH + PITCH / 2, y * PITCH + PITCH / 2, 1.1 + cov * 1.4, 0, Math.PI * 2); ctx.fill();
      }
      // l'étincelle : un point d'or entre les deux index quand ils se touchent presque
      const near = Math.max(0, 1 - a / 14);
      if (near > 0) {
        const px = 501 * scale, py = 203 * scale;
        ctx.fillStyle = `rgba(255, 197, 8, ${near.toFixed(3)})`;
        ctx.shadowColor = "rgba(255, 197, 8, 0.9)"; ctx.shadowBlur = 14 * near;
        ctx.beginPath(); ctx.arc(px, py, 3 + near * 3, 0, Math.PI * 2); ctx.fill();
        ctx.shadowBlur = 0;
      }
      if (!still && visible) raf = requestAnimationFrame(frame);
    };

    size(); raf = requestAnimationFrame(frame);
    const ro = new ResizeObserver(() => { size(); if (still) frame(start); });
    ro.observe(canvas);
    const io = new IntersectionObserver(([e]) => {
      visible = e.isIntersecting;
      if (visible && !raf) raf = requestAnimationFrame(frame);
      if (!visible) { cancelAnimationFrame(raf); raf = 0; }
    });
    io.observe(canvas);
    return () => { cancelAnimationFrame(raf); ro.disconnect(); io.disconnect(); };
  }, []);

  return <canvas ref={ref} className="hero-art" aria-hidden="true" />;
}
