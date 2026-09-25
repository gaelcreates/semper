// Géométrie et animations du symbole Semper (kit « SEMPER — Kit animations », 25 sept 2026).
// Le symbole : un anneau vu en perspective, ouvert en haut, épais devant, effilé aux pointes.
// Grille 100 × 100. Tout part de ces constantes, rien n'est dessiné à la main.

export const SY = 0.65;                 // aplatissement de l'anneau (perspective)
export const CY = 50 - 9.4 * SY;        // centre vertical, corrigé optiquement
export const RO = 42;                   // rayon extérieur
export const WMAX = 15;                 // épaisseur maximale (devant)
export const A0 = 30, A1 = 330;         // l'anneau va de 30° à 330° (0° = en haut, sens horaire)

export const PT = (r: number, a: number): [number, number] => { const t = (a * Math.PI) / 180; return [50 + r * Math.sin(t), CY - r * Math.cos(t) * SY]; };
export const Wa = (a: number) => { const x = ((a % 360) + 360) % 360; if (x < A0 || x > A1) return 0; return WMAX * Math.pow(Math.sin((Math.PI * (x - A0)) / (A1 - A0)), 0.9); };

function buildLogoPath(n = 140) {
  const o: [number, number][] = [], i: [number, number][] = [];
  for (let k = 0; k <= n; k++) { const a = A0 + ((A1 - A0) * k) / n; o.push(PT(RO, a)); i.push(PT(RO - Wa(a), a)); }
  let d = `M${o[0][0].toFixed(2)} ${o[0][1].toFixed(2)}`;
  for (let k = 1; k <= n; k++) d += `L${o[k][0].toFixed(2)} ${o[k][1].toFixed(2)}`;
  for (let k = n; k >= 0; k--) d += `L${i[k][0].toFixed(2)} ${i[k][1].toFixed(2)}`;
  return d + "Z";
}
export const LOGO_PATH = buildLogoPath();

/* Boîte visible du symbole dans la grille 100 (pour les lockups). */
export const SYMBOL_BOX = { x: 8, y: 20.25, w: 84, h: 50.94 };
/* Hauteur optique de « semper » (x-height + dépassements), en em. Le symbole a cette hauteur, posé sur la ligne de base. */
export const NAME_HEIGHT_EM = 0.558;
export const LOCKUP_GAP_EM = 0.16;

/* ---------- Outils d'animation (côté client seulement) ---------- */
export const reduced = () => typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;
export const easeIO = (x: number) => { x = Math.max(0, Math.min(1, x)); return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; };
export const rgbOf = (hex: string) => { const h = hex.replace("#", ""); return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16)).join(","); };
export const DPR = () => Math.min(3, (window.devicePixelRatio || 1) * 1.5);

export function makeCanvas(w: number, h: number) {
  const cv = document.createElement("canvas"), dpr = DPR();
  cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr);
  cv.style.width = w + "px"; cv.style.height = h + "px"; cv.style.display = "block";
  return { cv, ctx: cv.getContext("2d")!, dpr };
}

/* Bout arrondi, construit dans la forme du logo (ne déborde jamais). */
export function capPath(head: number) {
  const w = Wa(head); if (w <= 0.05) return null;
  const o = PT(RO, head), i = PT(RO - w, head), rm = RO - w / 2;
  const q1 = PT(rm, head + 0.5), q0 = PT(rm, head - 0.5), perDeg = Math.hypot(q1[0] - q0[0], q1[1] - q0[1]);
  const dmax = Math.hypot(o[0] - i[0], o[1] - i[1]) / 2 / perDeg;
  const p = new Path2D(), back = head - 1.2;
  p.moveTo(...PT(RO, back));
  for (let j = 0; j <= 40; j++) { const u = j / 40, d = dmax * Math.sqrt(Math.max(0, 1 - Math.pow(2 * u - 1, 2))), a = head + d; p.lineTo(...PT(RO - Wa(a) * u, a)); }
  p.lineTo(...PT(RO - Wa(back), back)); p.closePath();
  return p;
}
export function sectorPath(from: number, to: number) {
  const p = new Path2D(); p.moveTo(50, CY);
  for (let j = 0; j <= 120; j++) { const a = from + ((to - from) * j) / 120, q = PT(RO, a); p.lineTo(50 + (q[0] - 50) * 3, CY + (q[1] - CY) * 3); }
  p.closePath(); return p;
}
export const polar = (a: number) => { const q = PT(RO, a); return Math.atan2(q[1] - CY, q[0] - 50); };

/* Le symbole dessiné à q ∈ [0, 1] : de la pointe gauche, un tour, jusqu'à la pointe droite. */
export function drawSymbolAt(ctx: CanvasRenderingContext2D, k: number, color: string, q: number, ox = 0, oy = 0) {
  const logo = new Path2D(LOGO_PATH);
  ctx.setTransform(k, 0, 0, k, ox * k, oy * k); ctx.fillStyle = color;
  if (q >= 1) { ctx.fill(logo); return; }
  if (q <= 0) return;
  const head = A0 + (A1 - A0) * q;
  ctx.fill(sectorPath(A0 - 1, head));
  const cap = capPath(head); if (cap) ctx.fill(cap);
  ctx.globalCompositeOperation = "destination-in"; ctx.fill(logo); ctx.globalCompositeOperation = "source-over";
}

/* Couleur d'un élément (currentColor) en hexadécimal, pour le canevas. */
export function colorOf(el: Element) {
  const c = getComputedStyle(el).color.match(/\d+/g)?.slice(0, 3).map(Number) ?? [14, 14, 14];
  return "#" + c.map((n) => n.toString(16).padStart(2, "0")).join("");
}
