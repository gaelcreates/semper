"use client";

import { useEffect, useRef } from "react";

// La matrice tonale. Un sujet éclairé est échantillonné sur la grille de 8 px, et chaque case devient
// un point dont la taille suit l'ombre : plus c'est sombre, plus le point est gros. C'est une trame
// d'imprimerie, la même que celle des journaux, appliquée à un relief calculé. Le relief est réel :
// une sphère, une carte de hauteur (cratères) qui déforme la normale, une lumière qui tourne.
// Sujet : la lune. Le plus vieux calendrier du monde, un cycle qui revient chaque semaine.
// Fixe derrière toute la page, il continue pendant le défilement. Une image par 33 ms, en pause hors écran.

const P = 8;                       // pas de la grille, une unité
const MAP_W = 1024, MAP_H = 512;   // carte de hauteur (longitude × latitude)

// Bruit de valeur lissé, 3D, déterministe. Suffisant pour un relief lunaire crédible une fois superposé.
function hash(x: number, y: number, z: number) {
  let h = (x * 374761393 + y * 668265263 + z * 2147483647) | 0;
  h = (h ^ (h >>> 13)) * 1274126177; h = h ^ (h >>> 16);
  return (h >>> 0) / 4294967296;
}
function smooth(t: number) { return t * t * (3 - 2 * t); }
function noise(x: number, y: number, z: number) {
  const xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z);
  const fx = smooth(x - xi), fy = smooth(y - yi), fz = smooth(z - zi);
  let r = 0;
  for (let dz = 0; dz < 2; dz++) for (let dy = 0; dy < 2; dy++) for (let dx = 0; dx < 2; dx++) {
    const w = (dx ? fx : 1 - fx) * (dy ? fy : 1 - fy) * (dz ? fz : 1 - fz);
    r += w * hash(xi + dx, yi + dy, zi + dz);
  }
  return r;
}
// Cratères : des creux ronds de tailles variées, posés au hasard sur la sphère, plus un grain de fbm.
// La construction est découpée en tranches (générateur) pour ne jamais bloquer la page plus de quelques ms.
function* buildMap(map: Float32Array) {
  for (let j = 0; j < MAP_H; j++) {
    const lat = (j / MAP_H - 0.5) * Math.PI, cl = Math.cos(lat), y = Math.sin(lat);
    for (let i = 0; i < MAP_W; i++) {
      const lon = (i / MAP_W) * Math.PI * 2;
      const x = cl * Math.cos(lon), z = cl * Math.sin(lon);
      let h = 0, a = 0.5, f = 2.2;
      for (let o = 0; o < 5; o++) { h += a * (noise(x * f + 7, y * f + 3, z * f + 11) - 0.5); a *= 0.5; f *= 2.1; }
      map[j * MAP_W + i] = h;                                        // mers et plaines
    }
    if (j % 24 === 23) yield;
  }
  let seed = 7;
  const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  for (let n = 0; n < 250; n++) {
    const clat = (rnd() - 0.5) * Math.PI * 0.94, clon = rnd() * Math.PI * 2;
    const r = 0.02 + Math.pow(rnd(), 2.2) * 0.15;                    // beaucoup de petits, quelques grands
    const depth = 0.35 + rnd() * 0.5;
    const cx = Math.cos(clat) * Math.cos(clon), cy = Math.sin(clat), cz = Math.cos(clat) * Math.sin(clon);
    const j0 = Math.max(0, Math.floor((clat / Math.PI + 0.5) * MAP_H - r * 1.3 * MAP_H / Math.PI));
    const j1 = Math.min(MAP_H - 1, Math.ceil((clat / Math.PI + 0.5) * MAP_H + r * 1.3 * MAP_H / Math.PI));
    for (let j = j0; j <= j1; j++) {
      const lat = (j / MAP_H - 0.5) * Math.PI, cl = Math.cos(lat), y = Math.sin(lat);
      const span = Math.min(MAP_W / 2, Math.ceil((r * 1.3 / Math.max(0.08, cl)) / (Math.PI * 2) * MAP_W)); // fenêtre de longitude
      const ic = Math.round(clon / (Math.PI * 2) * MAP_W);
      for (let k = -span; k <= span; k++) {
        const i = ((ic + k) % MAP_W + MAP_W) % MAP_W;
        const lon = (i / MAP_W) * Math.PI * 2;
        const x = cl * Math.cos(lon), z = cl * Math.sin(lon);
        const d = Math.acos(Math.min(1, x * cx + y * cy + z * cz)) / r;   // distance angulaire normalisée
        if (d > 1.25) continue;
        // fond creux, rebord relevé, puis retombée
        const prof = d < 0.8 ? -depth * (1 - (d / 0.8) ** 2) : d < 1 ? depth * 0.35 * Math.sin((d - 0.8) / 0.2 * Math.PI) : depth * 0.08 * (1 - (d - 1) / 0.25);
        map[j * MAP_W + i] += prof * r * 2.4;
      }
    }
    if (n % 12 === 11) yield;
  }
}

export default function Matrix() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const still = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const map = new Float32Array(MAP_W * MAP_H);
    let ready = 0;                                                    // 0 tant que le relief se construit, puis l'instant où il est prêt
    const gen = buildMap(map);
    const step = () => { if (gen.next().done) { ready = performance.now(); if (still) frame(ready); } else setTimeout(step, 0); };
    setTimeout(step, 0);
    const at = (u: number, v: number) => {                              // lecture bilinéaire de la carte
      const x = ((u % 1) + 1) % 1 * MAP_W, y = Math.min(MAP_H - 1.001, Math.max(0, v * MAP_H));
      const xi = Math.floor(x), yi = Math.floor(y), fx = x - xi, fy = y - yi, xj = (xi + 1) % MAP_W;
      return (map[yi * MAP_W + xi] * (1 - fx) + map[yi * MAP_W + xj] * fx) * (1 - fy)
           + (map[(yi + 1) * MAP_W + xi] * (1 - fx) + map[(yi + 1) * MAP_W + xj] * fx) * fy;
    };

    let W = 0, H = 0, raf = 0, last = 0, hidden = false;
    const size = () => {
      const dpr = Math.min(devicePixelRatio || 1, 2);
      W = innerWidth; H = innerHeight;
      canvas.width = W * dpr; canvas.height = H * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const frame = (now: number) => {
      raf = still ? 0 : requestAnimationFrame(frame);
      if (now - last < 33 || !ready) return;                           // 30 images par seconde suffisent
      last = now;
      const fade = Math.min(1, (now - ready) / 1200);                  // apparition douce une fois le relief prêt
      const dark = document.documentElement.dataset.theme === "dark";
      const t = now / 1000;
      const spin = t * 0.012;                                          // un tour en ~8 minutes
      // la lumière vient de la gauche et balance lentement : la face visible reste claire, l'ombre glisse vers le bord
      const phase = -0.75 + Math.sin(t * 0.05) * 0.35;
      const lx = Math.sin(phase), lz = Math.cos(phase), ly = -0.3;
      const ln = Math.hypot(lx, ly, lz);
      const L = [lx / ln, ly / ln, lz / ln];

      // la lune, en haut à droite, un peu hors cadre, qui glisse à peine avec le défilement
      // au bord droit, deux tiers visibles, à mi-hauteur : la lune se lève à côté du texte, jamais dessus
      if (W < 860) return;                                             // pas de lune sur téléphone
      const R = Math.min(W, H) * 0.34;
      const cx = Math.max(W * 0.72 + R, W - R * 0.62), cy = H * 0.5 - scrollY * 0.05;
      ctx.clearRect(0, 0, W, H);
      const col = dark ? "245, 245, 245" : "14, 14, 14";
      const x0 = Math.max(0, Math.floor((cx - R) / P)), x1 = Math.min(Math.ceil(W / P), Math.ceil((cx + R) / P));
      const y0 = Math.max(0, Math.floor((cy - R) / P)), y1 = Math.min(Math.ceil(H / P), Math.ceil((cy + R) / P));
      const eps = 0.0025;
      for (let j = y0; j < y1; j++) {
        const py = j * P + P / 2, dy = (py - cy) / R;
        for (let i = x0; i < x1; i++) {
          const px = i * P + P / 2, dx = (px - cx) / R;
          const d2 = dx * dx + dy * dy;
          if (d2 > 1) continue;
          const nz = Math.sqrt(1 - d2);
          // coordonnées sur la sphère → longitude, latitude → carte de hauteur
          const lon = Math.atan2(dx, nz) + spin, lat = Math.asin(dy);
          const u = lon / (Math.PI * 2), v = lat / Math.PI + 0.5;
          const h0 = at(u, v), hu = at(u + eps, v), hv = at(u, v + eps);
          // la pente de la carte incline la normale (tangentes est et sud)
          const gu = (hu - h0) / eps * 0.11, gv = (hv - h0) / eps * 0.11;
          let nx = dx - gu * nz, ny = dy - gv * nz, nzz = nz + gu * dx + gv * dy;
          const nn = Math.hypot(nx, ny, nzz); nx /= nn; ny /= nn; nzz /= nn;
          let lum = nx * L[0] + ny * L[1] + nzz * L[2];
          lum = lum <= 0 ? 0 : Math.pow(lum, 0.8);
          const edge = Math.min(1, (1 - d2) * 14);                      // bord adouci du disque
          // trame : sur le papier, l'encre couvre l'ombre ; sur le sombre, la lumière allume les points
          const cov = (dark ? Math.pow(lum, 1.1) : Math.pow(1 - lum, 1.25) * 0.95) * edge;
          if (cov < 0.04) continue;
          const r = Math.sqrt(cov) * P * 0.5 * 0.96;
          ctx.fillStyle = `rgba(${col}, ${(Math.min(1, 0.25 + cov) * fade).toFixed(3)})`;
          ctx.beginPath(); ctx.arc(px, py, r, 0, Math.PI * 2); ctx.fill();
        }
      }
    };

    size(); if (!still) raf = requestAnimationFrame(frame);
    const onResize = () => { size(); if (still) frame(performance.now()); };
    const onVis = () => { hidden = document.hidden; if (hidden) { cancelAnimationFrame(raf); raf = 0; } else if (!still && !raf) raf = requestAnimationFrame(frame); };
    addEventListener("resize", onResize); document.addEventListener("visibilitychange", onVis);
    return () => { cancelAnimationFrame(raf); removeEventListener("resize", onResize); document.removeEventListener("visibilitychange", onVis); };
  }, []);

  return <canvas ref={ref} className="matrix" aria-hidden="true" />;
}
