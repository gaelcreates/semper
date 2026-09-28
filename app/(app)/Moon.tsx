import { orbitOf, phaseOf } from "./stats";

// La lune en points : une grille ronde, la part éclairée croît avec la série.
// Avec `orbit`, un anneau de points l'entoure : il se remplit après la pleine lune, jusqu'à un an.
export default function Moon({ streak, n = 15, orbit = false, className = "" }: { streak: number; n?: number; orbit?: boolean; className?: string }) {
  const k = phaseOf(streak);
  const edge = Math.cos(Math.PI * k);
  const c = (n - 1) / 2;
  const r = 0.36 / (c + 0.5);
  const dots: React.ReactNode[] = [];
  for (let y = 0; y < n; y++) {
    for (let x = 0; x < n; x++) {
      const u = (x - c) / (c + 0.5), v = (y - c) / (c + 0.5);
      if (u * u + v * v > 1) continue;
      const lit = k > 0 && u >= edge * Math.sqrt(1 - v * v) - 0.001;
      dots.push(<circle key={`${x}-${y}`} cx={u} cy={v} r={r} className={lit ? "on" : ""} style={{ ["--i" as string]: x * n + y }} />);
    }
  }
  const ring: React.ReactNode[] = [];
  if (orbit) {
    const m = 48, done = orbitOf(streak);
    for (let j = 0; j < m; j++) {
      const a = -Math.PI / 2 + (j / m) * Math.PI * 2;
      ring.push(<circle key={`o${j}`} cx={Math.cos(a) * 1.34} cy={Math.sin(a) * 1.34} r={r * 0.8} className={j / m < done ? "on" : ""} />);
    }
  }
  const b = orbit ? 1.45 : 1.02;
  return (
    <svg className={`moon${className ? ` ${className}` : ""}`} viewBox={`${-b} ${-b} ${b * 2} ${b * 2}`} aria-hidden="true">
      {dots}
      {ring}
    </svg>
  );
}
