"use client";

import { useEffect, useRef, useState } from "react";

// Ligne de croissance dans le fond de la section « Le vrai problème » : elle entre par la gauche
// sous les cartes, monte par paliers, passe entre le texte et les cartes, puis sort par la droite.
// La géométrie est mesurée sur le contenu réel (texte, cartes) pour tenir à toutes les largeurs.
// Elle se trace au scroll (--draw de 0 à 1, posé sur la section), avec une zone d'or dessous
// et des points de passage qui pulsent.
type Geo = { path: string; dots: [number, number, number][] };

export default function Curve() {
  const ref = useRef<SVGSVGElement>(null);
  const [geo, setGeo] = useState<Geo | null>(null);

  useEffect(() => {
    const svg = ref.current;
    const section = svg?.parentElement;
    if (!svg || !section) return;

    // coordonnées sur 1000 x 1000 de la section
    const measure = () => {
      const sr = section.getBoundingClientRect();
      const story = section.querySelector(".story")?.getBoundingClientRect();
      const stats = section.querySelector(".stats")?.getBoundingClientRect();
      if (!story || !stats || !sr.height) return;
      const y = (v: number) => Math.round(((v - sr.top) / sr.height) * 1000);
      const cardsTop = y(stats.top), cardsBottom = y(stats.bottom), storyBottom = y(story.bottom);
      const y1 = Math.min(960, cardsBottom + 40);            // palier bas, sous les cartes
      const y2 = Math.round((storyBottom + cardsTop) / 2);   // palier haut, entre le texte et les cartes
      const y3 = Math.max(60, y2 - 240);                     // sortie à droite
      // montée douce entre les deux paliers (tangentes horizontales aux deux bouts), puis grimpée vers la sortie
      const path = `M -30 ${y1 + 70} C 60 ${y1 + 60}, 130 ${y1 + 8}, 200 ${y1} C 330 ${y1}, 390 ${y2}, 520 ${y2} C 600 ${y2}, 660 ${y2 - 4}, 740 ${y2 - 24} C 830 ${y2 - 46}, 850 ${y3 + 40}, 920 ${y3 + 16} C 960 ${y3 + 2}, 1000 ${y3}, 1040 ${y3 - 6}`;
      setGeo({ path, dots: [[200, y1, 0.19], [520, y2, 0.49], [630, y2 - 4, 0.6], [920, y3 + 16, 0.86]] });
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(section);

    if (matchMedia("(prefers-reduced-motion: reduce)").matches) { section.style.setProperty("--draw", "1"); return () => ro.disconnect(); }
    let raf = 0;
    const update = () => {
      raf = 0;
      const r = section.getBoundingClientRect();
      const vh = innerHeight;
      // rien tant que le haut de la section n'a pas atteint la moitié de l'écran ; ensuite la ligne avance
      // avec le scroll et finit quand le bout en haut à droite est encore visible (section entière si possible)
      const end = Math.max(-vh * 0.4, vh - r.height - 60);
      const start = Math.max(vh * 0.5, end + 500);
      const p = Math.min(1, Math.max(0, (start - r.top) / (start - end)));
      section.style.setProperty("--draw", p.toFixed(3));
    };
    const onScroll = () => { if (!raf) raf = requestAnimationFrame(update); };
    update();
    addEventListener("scroll", onScroll, { passive: true });
    addEventListener("resize", onScroll);
    return () => { ro.disconnect(); removeEventListener("scroll", onScroll); removeEventListener("resize", onScroll); if (raf) cancelAnimationFrame(raf); };
  }, []);

  return (
    <>
      <svg ref={ref} className="curve" viewBox="0 0 1000 1000" preserveAspectRatio="none" aria-hidden="true">
        <defs>
          <linearGradient id="curve-area" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#ffc508" stopOpacity="0.14" />
            <stop offset="1" stopColor="#ffc508" stopOpacity="0" />
          </linearGradient>
          <clipPath id="curve-clip"><rect className="curve-reveal" x="-30" y="0" width="1070" height="1000" /></clipPath>
        </defs>
        {geo && (
          <>
            <path className="curve-area" d={`${geo.path} L 1040 1000 L -30 1000 Z`} clipPath="url(#curve-clip)" />
            <path className="curve-line" d={geo.path} clipPath="url(#curve-clip)" />
          </>
        )}
      </svg>
      {geo?.dots.map(([x, y, t], i) => (
        <i key={i} className="curve-dot" style={{ left: `${x / 10}%`, top: `${y / 10}%`, ["--t" as string]: t, animationDelay: `${i * 0.6}s` }} aria-hidden="true" />
      ))}
    </>
  );
}
