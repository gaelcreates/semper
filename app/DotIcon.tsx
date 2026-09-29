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
  insta:    ["0111110", "1000011", "1011101", "1010101", "1011101", "1000001", "0111110"],
  cadenas:  ["0011100", "0100010", "0100010", "1111111", "1110111", "1110111", "1111111"],
  orga:     ["0100000", "1111111", "0100000", "0000000", "0000010", "1111111", "0000010"],
};

// L'ordre dans lequel les points se rallument dit ce que fait l'icône :
// les jours qui passent, la lune qui se remplit, l'objectif qui s'ouvre, le plus qui grandit.
type Order = "lignes" | "colonnes" | "centre" | "tour";
const ORDER: Record<string, Order> = { cal: "lignes", lune: "colonnes", profil: "lignes", ajout: "centre", insta: "tour", cadenas: "lignes", orga: "lignes", agrandir: "centre", reduire: "centre" };
function rank(mode: Order, x: number, y: number, n: number) {
  const c = (n - 1) / 2;
  if (mode === "colonnes") return x * n + y;
  if (mode === "centre") return Math.max(Math.abs(x - c), Math.abs(y - c)) * n + Math.abs(x - c) + Math.abs(y - c);
  if (mode === "tour") return ((Math.atan2(y - c, x - c) + Math.PI * 2.5) % (Math.PI * 2)) * 10;
  return y * n + x;
}

export default function DotIcon({ name, className = "" }: { name: keyof typeof glyphs; className?: string }) {
  const rows = glyphs[name] ?? glyphs.point;
  const n = rows.length;
  const matrix = n > 5; // les icônes de l'espace montent leur grille éteinte, comme un afficheur
  const mode = ORDER[name] ?? "lignes";
  const lit = rows.flatMap((r, y) => r.split("").map((c, x) => ({ x, y, on: c === "1" }))).filter((d) => d.on);
  const order = new Map([...lit].sort((a, b) => rank(mode, a.x, a.y, n) - rank(mode, b.x, b.y, n)).map((d, i) => [`${d.x}-${d.y}`, i]));
  return (
    <svg className={`di${matrix ? " mx" : ""}${className ? ` ${className}` : ""}`} viewBox={`0 0 ${n} ${n}`} aria-hidden="true">
      {rows.flatMap((r, y) => r.split("").map((c, x) => c === "1"
        ? <circle key={`${x}${y}`} className="on" cx={x + 0.5} cy={y + 0.5} r={matrix ? 0.38 : 0.34} fill="currentColor" style={{ ["--i" as string]: order.get(`${x}-${y}`) }} />
        : matrix ? <circle key={`${x}${y}`} className="off" cx={x + 0.5} cy={y + 0.5} r="0.16" fill="currentColor" /> : null))}
    </svg>
  );
}
