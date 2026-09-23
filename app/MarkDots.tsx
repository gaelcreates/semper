// Le signe Semper en matrice de points : l'arc ouvert devient une suite de points,
// le point du signe reste plus gros, posé dans l'ouverture (à -45°, comme `Mark`).
export default function MarkDots({ spin = false, className = "" }: { spin?: boolean; className?: string }) {
  const n = 14;                                   // points sur l'arc
  const from = -Math.PI / 4 + 0.62;               // début de l'arc, juste après l'ouverture
  const to = -Math.PI / 4 - 0.62 + Math.PI * 2;   // fin de l'arc, juste avant l'ouverture
  const pts = Array.from({ length: n }, (_, i) => {
    const a = from + ((to - from) * i) / (n - 1);
    return { x: Math.cos(a), y: Math.sin(a) };
  });
  return (
    <svg className={`mark dots${spin ? " spin" : ""}${className ? ` ${className}` : ""}`} viewBox="-1.3 -1.3 2.6 2.6" aria-hidden="true">
      <g className="mark-g">
        {pts.map((p, i) => <circle key={i} cx={p.x.toFixed(3)} cy={p.y.toFixed(3)} r="0.085" fill="currentColor" style={{ ["--i" as string]: i }} />)}
        <circle cx="0.707" cy="-0.707" r="0.19" fill="currentColor" className="big" />
      </g>
    </svg>
  );
}
