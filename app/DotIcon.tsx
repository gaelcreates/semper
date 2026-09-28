// Icônes de Semper : chaque glyphe est un bitmap (5×5 sur la vitrine, 7×7 dans l'espace), un point par case allumée.
// Même matrice que le fond et la série : le point est l'unité. Chaque point porte son rang (--i) pour s'allumer à la suite.
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
  loupe:    ["01100", "10010", "10010", "01110", "00001"],
  cal:      ["0100010", "1111111", "1000001", "1010101", "1000001", "1010101", "1111111"],
  lune:     ["0011100", "0100110", "1000111", "1000111", "1000111", "0100110", "0011100"],
  profil:   ["0011100", "0100010", "0100010", "0011100", "0000000", "0111110", "1000001"],
  ajout:    ["0001000", "0001000", "0001000", "1111111", "0001000", "0001000", "0001000"],
  agrandir: ["1100011", "1000001", "0000000", "0000000", "0000000", "1000001", "1100011"],
  reduire:  ["0100010", "1100011", "0000000", "0000000", "0000000", "1100011", "0100010"],
};

export default function DotIcon({ name, className = "" }: { name: keyof typeof glyphs; className?: string }) {
  const rows = glyphs[name] ?? glyphs.point;
  const n = rows.length;
  let i = 0;
  return (
    <svg className={`di${className ? ` ${className}` : ""}`} viewBox={`0 0 ${n} ${n}`} aria-hidden="true">
      {rows.flatMap((r, y) => r.split("").map((c, x) => c === "1"
        ? <circle key={`${x}${y}`} cx={x + 0.5} cy={y + 0.5} r={n > 5 ? 0.36 : 0.34} fill="currentColor" style={{ ["--i" as string]: i++ }} />
        : null))}
    </svg>
  );
}
