// Icônes de Semper : chaque glyphe est un bitmap 5×5, un point par case allumée.
// Même matrice que le fond et la série : le point est l'unité.
const glyphs: Record<string, string[]> = {
  semaine:  ["11111", "10001", "10101", "10001", "11111"],
  idee:     ["01110", "10001", "01010", "00100", "00100"],
  serie:    ["00000", "10101", "00000", "10101", "00000"],
  script:   ["11110", "10000", "11100", "10000", "11110"],
  reglages: ["00100", "01110", "11011", "01110", "00100"],
  plus:     ["00100", "00100", "11111", "00100", "00100"],
  check:    ["00000", "00001", "00010", "10100", "01000"],
  fleche:   ["00100", "01110", "10101", "00100", "00100"],
  point:    ["00000", "00000", "00100", "00000", "00000"],
};

export default function DotIcon({ name, className = "" }: { name: keyof typeof glyphs; className?: string }) {
  const rows = glyphs[name] ?? glyphs.point;
  return (
    <svg className={`di${className ? ` ${className}` : ""}`} viewBox="0 0 5 5" aria-hidden="true">
      {rows.flatMap((r, y) => r.split("").map((c, x) => c === "1"
        ? <circle key={`${x}${y}`} cx={x + 0.5} cy={y + 0.5} r="0.34" fill="currentColor" />
        : null))}
    </svg>
  );
}
