import type { MoonState } from "./jour";

// La lune du jour, en points : le disque se remplit en 7 jours, 28 points autour comptent les jours d'affilée
// (le prochain clignote tant que le jeu du jour n'est pas fait). Fissurée, ses points tombent.
// Les écarts de chute sont tirés une fois pour toutes (même graine) : la lune tombe toujours de la même façon.
const fall = (() => {
  let seed = 11;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  return Array.from({ length: 200 }, () => [rnd(), rnd(), rnd()]);
})();

export default function Lune({ n, state, breaking = false, className = "" }: { n: number; state: MoonState; breaking?: boolean; className?: string }) {
  const p = Math.min(n, 7) / 7;
  const dots: React.ReactNode[] = [];
  let k = 0;
  for (let y = 0; y < 11; y++) {
    for (let x = 0; x < 11; x++) {
      const u = (x - 5) / 5.3, v = (y - 5) / 5.3;
      if (u * u + v * v > 1) continue;
      const on = state !== "off" && p > 0 && u > Math.sqrt(1 - v * v) * (1 - 2 * p) - 0.001;
      const [a, b, c] = fall[k % fall.length];
      dots.push(<circle key={k} cx={x + 0.5} cy={y + 0.5} r={0.4} className={`d${on ? " on" : ""}`}
        style={{ ["--k" as string]: k++, ["--dx" as string]: `${((x - 5) * (0.5 + a) + (b - 0.5) * 2).toFixed(2)}px`, ["--dy" as string]: `${((y - 5) * 0.3 + 2 + c * 3.5).toFixed(2)}px` }} />);
    }
  }
  const lit = state === "off" ? 0 : Math.min(n, 28);
  for (let j = 0; j < 28; j++) {
    const ang = -Math.PI / 2 + (j / 28) * Math.PI * 2;
    const [a, b] = fall[k % fall.length];
    const cls = j < lit ? "on" : state === "wait" && j === lit ? "next" : "";
    dots.push(<circle key={k} cx={(5.5 + Math.cos(ang) * 8.2).toFixed(2)} cy={(5.5 + Math.sin(ang) * 8.2).toFixed(2)} r={0.3} className={cls}
      style={{ ["--k" as string]: k++, ["--dx" as string]: `${(Math.cos(ang) * 2 + (a - 0.5) * 2).toFixed(2)}px`, ["--dy" as string]: `${(3 + b * 4).toFixed(2)}px` }} />);
  }
  return (
    <svg className={`lune ${breaking ? "breaking" : state}${n >= 28 && state !== "off" ? " gold" : ""}${className ? ` ${className}` : ""}`} viewBox="-4 -4 19 19" aria-hidden="true">
      {dots}
    </svg>
  );
}
