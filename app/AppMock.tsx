// L'aperçu de la vue semaine, fidèle à l'outil : une colonne par jour, les heures, et pour chaque vidéo
// ses blocs écriture, tournage, montage (étape en toutes lettres ou en initiale, points : un, deux, trois)
// puis la publication en noir. Un bloc de tournage glisse au jour suivant en boucle, comme quand on le déplace.
const START = 9, END = 20, PX = 40 / 60;
type K = "ecriture" | "tournage" | "montage" | "pub";
type B = { d: number; k: K; at: string; t: string; done?: boolean; drag?: boolean };
const DUR: Record<K, number> = { ecriture: 30, tournage: 20, montage: 45, pub: 30 };
const LABEL: Record<Exclude<K, "pub">, string> = { ecriture: "Écriture", tournage: "Tournage", montage: "Montage" };
const F = "Ma semaine de fondateur", P = "Pourquoi tu t'arrêtes", E = "3 erreurs de calendrier", M = "Ma méthode en 3 blocs";
const BLOCKS: B[] = [
  { d: 0, k: "montage", at: "14:00", t: F, done: true }, { d: 0, k: "pub", at: "18:00", t: F, done: true },
  { d: 0, k: "ecriture", at: "09:30", t: P, done: true }, { d: 1, k: "tournage", at: "10:00", t: P, done: true },
  { d: 1, k: "montage", at: "16:00", t: P }, { d: 2, k: "pub", at: "18:00", t: P },
  { d: 2, k: "ecriture", at: "10:00", t: E }, { d: 3, k: "tournage", at: "09:30", t: E },
  { d: 3, k: "montage", at: "14:00", t: E }, { d: 4, k: "pub", at: "12:00", t: E },
  { d: 4, k: "ecriture", at: "10:00", t: M }, { d: 5, k: "tournage", at: "11:00", t: M, drag: true },
  { d: 5, k: "montage", at: "15:00", t: M }, { d: 6, k: "pub", at: "19:00", t: M },
];
const DAYS = [["LUN", 12], ["MAR", 13], ["MER", 14], ["JEU", 15], ["VEN", 16], ["SAM", 17], ["DIM", 18]] as const;
const min = (s: string) => { const [h, m] = s.split(":").map(Number); return h * 60 + m; };

export default function AppMock() {
  return (
    <div className="mwk" aria-hidden="true">
      <div className="mwk-head">
        <span className="lbl">S42</span>
        {DAYS.map(([n, d], i) => <span key={n} className={i === 1 ? "today" : ""}><small className="lbl">{n}</small><b className="disp">{d}</b></span>)}
      </div>
      <div className="mwk-body" style={{ height: (END - START) * 60 * PX }}>
        <div className="mwk-hours">{Array.from({ length: END - START }, (_, h) => <span key={h} className="disp" style={{ top: h * 60 * PX }}>{h ? String(START + h).padStart(2, "0") : ""}</span>)}</div>
        {DAYS.map(([n], i) => (
          <div key={n} className="mwk-col">
            {i === 1 && <i className="mwk-now" style={{ top: (11.5 * 60 - START * 60) * PX }} />}
            {BLOCKS.filter((b) => b.d === i).map((b) => {
              const tight = DUR[b.k] < 40;
              return (
                <span key={b.k + b.at} className={`mwk-b k-${b.k}${b.done ? " done" : ""}${b.drag ? " drag" : ""}${tight ? " tight" : ""}`}
                  style={{ top: (min(b.at) - START * 60) * PX, height: DUR[b.k] * PX - 2 }}>
                  {b.k === "pub" ? <><b className="disp">{b.at}</b><em>{b.t}</em></> : <><small className="lbl" data-i={LABEL[b.k][0]}>{tight ? LABEL[b.k][0] : LABEL[b.k]}</small><em>{b.t}</em></>}
                </span>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
