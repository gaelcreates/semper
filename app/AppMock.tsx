// L'aperçu de la vue semaine, fidèle à l'outil : une colonne par jour, les heures, et pour chaque vidéo
// ses blocs écriture, tournage, montage (points : un, deux, trois) puis la publication en noir.
// Un bloc de tournage glisse d'un jour à l'autre en boucle, comme quand on le déplace.
const START = 10, END = 20, PX = 40 / 60;
type B = { d: number; k: "ecriture" | "tournage" | "montage" | "pub"; at: string; dur: number; t?: string; done?: boolean; drag?: boolean };
const BLOCKS: B[] = [
  { d: 0, k: "ecriture", at: "16:25", dur: 30, done: true }, { d: 0, k: "tournage", at: "16:55", dur: 20, done: true },
  { d: 0, k: "montage", at: "17:15", dur: 45, done: true }, { d: 0, k: "pub", at: "18:00", dur: 30, t: "Ma semaine de fondateur", done: true },
  { d: 1, k: "ecriture", at: "10:00", dur: 30, done: true }, { d: 1, k: "tournage", at: "11:00", dur: 20, done: true },
  { d: 1, k: "montage", at: "17:15", dur: 45 }, { d: 1, k: "pub", at: "18:00", dur: 30, t: "Pourquoi tu t'arrêtes" },
  { d: 3, k: "ecriture", at: "10:00", dur: 30, done: true }, { d: 3, k: "tournage", at: "14:00", dur: 20, drag: true },
  { d: 3, k: "montage", at: "11:15", dur: 45 }, { d: 3, k: "pub", at: "12:00", dur: 30, t: "3 erreurs de calendrier" },
  { d: 5, k: "ecriture", at: "17:25", dur: 30 }, { d: 5, k: "tournage", at: "17:55", dur: 20 },
  { d: 5, k: "montage", at: "18:15", dur: 45 }, { d: 5, k: "pub", at: "19:00", dur: 30, t: "Ma méthode en 3 blocs" },
];
const DAYS = [["LUN", 28], ["MAR", 29], ["MER", 30], ["JEU", 1], ["VEN", 2], ["SAM", 3], ["DIM", 4]] as const;
const min = (s: string) => { const [h, m] = s.split(":").map(Number); return h * 60 + m; };

export default function AppMock() {
  return (
    <div className="mwk" aria-hidden="true">
      <div className="mwk-head">
        <span className="lbl">S40</span>
        {DAYS.map(([n, d], i) => <span key={n} className={i === 1 ? "today" : ""}><small className="lbl">{n}</small><b className="disp">{d}</b></span>)}
      </div>
      <div className="mwk-body" style={{ height: (END - START) * 60 * PX }}>
        <div className="mwk-hours">{Array.from({ length: END - START }, (_, h) => <span key={h} className="disp" style={{ top: h * 60 * PX }}>{h ? START + h : ""}</span>)}</div>
        {DAYS.map(([n], i) => (
          <div key={n} className="mwk-col">
            {i === 1 && <i className="mwk-now" style={{ top: (15 * 60 - START * 60) * PX }} />}
            {BLOCKS.filter((b) => b.d === i).map((b) => (
              <span key={b.k + b.at} className={`mwk-b k-${b.k}${b.done ? " done" : ""}${b.drag ? " drag" : ""}`}
                style={{ top: (min(b.at) - START * 60) * PX, height: Math.max(b.dur * PX, 13) - 2 }}>
                {b.k === "pub" && <><b className="disp">{b.at}</b><em>{b.t}</em></>}
              </span>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
