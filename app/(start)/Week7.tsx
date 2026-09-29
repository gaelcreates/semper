// Le rythme du premier passage, en grand : le chiffre en points d'afficheur (5×7 par chiffre)
// et la semaine qui se remplit, un point par vidéo, réparti sur les sept jours.
const DIGITS: Record<string, string[]> = {
  "0": ["01110", "10001", "10011", "10101", "11001", "10001", "01110"],
  "1": ["00100", "01100", "00100", "00100", "00100", "00100", "01110"],
  "2": ["01110", "10001", "00001", "00010", "00100", "01000", "11111"],
  "3": ["11111", "00010", "00100", "00010", "00001", "10001", "01110"],
  "4": ["00010", "00110", "01010", "10010", "11111", "00010", "00010"],
  "5": ["11111", "10000", "11110", "00001", "00001", "10001", "01110"],
  "6": ["00110", "01000", "10000", "11110", "10001", "10001", "01110"],
  "7": ["11111", "00001", "00010", "00100", "01000", "01000", "01000"],
  "8": ["01110", "10001", "10001", "01110", "10001", "10001", "01110"],
  "9": ["01110", "10001", "10001", "01111", "00001", "00010", "01100"],
};
const DAYS = ["L", "M", "M", "J", "V", "S", "D"];

export function BigDigits({ n }: { n: number }) {
  const s = String(n);
  const w = s.length * 6 - 1;
  return (
    <svg className="big-digits" viewBox={`0 0 ${w} 7`} key={s} aria-hidden="true">
      {s.split("").flatMap((ch, k) => DIGITS[ch].flatMap((row, y) => row.split("").map((c, x) => (
        <circle key={`${k}-${x}-${y}`} cx={k * 6 + x + 0.5} cy={y + 0.5} r={c === "1" ? 0.4 : 0.14}
          className={c === "1" ? "on" : "off"} style={{ ["--i" as string]: k * 5 + x }} />
      ))))}
    </svg>
  );
}

export function WeekDots({ n }: { n: number }) {
  const per = Array(7).fill(0);
  for (let i = 0; i < n; i++) per[Math.floor((i * 7) / n)]++;
  return (
    <div className="week-dots" aria-hidden="true">
      {per.map((c, d) => (
        <span key={d}>
          <i className={c >= 2 ? "on" : ""} /><i className={c >= 1 ? "on" : ""} />
          <b className="lbl">{DAYS[d]}</b>
        </span>
      ))}
    </div>
  );
}
