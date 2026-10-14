"use client";

import { useState } from "react";
import Moon from "../Moon";
import Lune from "../Lune";
import Rythme from "../Rythme";
import ProofRow from "../Preuve";
import { TITLES, constance } from "../stats";
import { DAYS, MONTHS_SHORT, addDays, dayKey, startOfWeek } from "../lib";
import { STEPS, useData } from "../store";
import { lit, proofOf, today } from "../jour";

const WEEKS = 52;
const plural = (n: number, w: string) => `${w}${n > 1 ? "s" : ""}`;

// Constance : les chiffres, les trophées, chaque jour en trois anneaux, un an de publications, l'historique.
// Instagram relié : tout ce qui touche aux publications est certifié (seules les vidéos vérifiées comptent).
export default function Constance() {
  const d = useData()!;
  const s = constance(d);
  const g = d.game;
  const k = today();
  const verified = s.verified;
  const cur = startOfWeek(new Date());
  const weeks = Array.from({ length: WEEKS }, (_, i) => addDays(cur, -7 * (WEEKS - 1 - i)));
  const past = d.contents.filter((c) => c.publishAt && c.publishAt.slice(0, 10) <= k);
  const proofs = past.map((c) => proofOf(c, d.ig, d.contents, k));
  const ok = proofs.filter((p) => p === "ok").length, late = proofs.filter((p) => p === "late").length, miss = proofs.filter((p) => p === "miss" || p === "propose").length;
  const onTime = ok + late + miss ? Math.round((ok / (ok + late + miss)) * 100) : null;
  const history = [...past].sort((a, b) => b.publishAt!.localeCompare(a.publishAt!)).slice(0, 10);

  // Les trophées : les titres de la lune, gagnés en semaines tenues d'affilée, puis deux à part.
  const trophies = [
    ...TITLES.filter((t) => t.w > 0).map((t) => ({ name: t.name, need: t.w, have: s.record, unit: (n: number) => `${plural(n, "semaine")} ${plural(n, "tenue")} d'affilée`, icon: <Moon streak={t.w} n={9} orbit={t.w >= 13} />, cert: true })),
    { name: "Lune d'or", need: 28, have: g.best, unit: () => "jours de lune d'affilée", icon: <Lune n={28} state="lit" />, cert: false },
    { name: "Cinquantaine", need: 50, have: s.total, unit: () => "vidéos publiées", icon: <Moon streak={8} n={9} />, cert: true },
  ];

  return (
    <div className="page wide">
      <header className="page-head"><h1>Constance</h1><span className="count">{verified ? "Certifiée par Instagram" : "Déclarée"}</span></header>

      <div className="cs-stats four">
        <div className="box stat">
          <span className="lbl">Lune</span>
          <b className="disp">{g.broken ? 0 : g.moon}</b>
          <span className="unit">{plural(g.moon, "jour")} d&apos;affilée · record {g.best}</span>
        </div>
        <div className="box stat">
          <span className="lbl">Rythme</span>
          <b className="disp">{s.thisWeek}<i>/{s.rythme}</i></b>
          <span className="unit">{s.streak} {plural(s.streak, "semaine")} {plural(s.streak, "tenue")} d&apos;affilée</span>
          <Rythme compact />
        </div>
        <div className="box stat">
          <span className="lbl">Publiées</span>
          <b className="disp">{s.total}</b>
          <span className="unit">{plural(s.total, "vidéo")} {verified ? plural(s.total, "vérifiée") : plural(s.total, "déclarée")}</span>
        </div>
        <div className="box stat">
          <span className="lbl">À l&apos;heure</span>
          <b className="disp">{verified && onTime !== null ? <>{onTime}<i>%</i></> : "–"}</b>
          <span className="unit">{verified ? "publiées le jour prévu" : "Relie Instagram pour le savoir"}</span>
        </div>
      </div>

      <section className="box cs-tro">
        <header className="cs-h"><h2>Trophées</h2><span className="muted">{verified ? "Certifiés par tes publications Instagram." : "Relie Instagram pour qu'ils soient certifiés."}</span></header>
        <ol className="ladder trophies">
          {trophies.map((t) => {
            const got = t.have >= t.need;
            return (
              <li key={t.name} className={got ? "on" : ""}>
                {got && verified && t.cert && <span className="seal" title="Certifié par Instagram">✓</span>}
                {t.icon}
                <span className="lbl">{t.name}</span>
                <small className="muted">{got ? `${t.need} ${t.unit(t.need)}` : `${Math.min(t.have, t.need)} / ${t.need}`}</small>
              </li>
            );
          })}
        </ol>
      </section>

      <Rings />

      <section className="box hm" aria-label="Jours publiés sur un an">
        <div className="hm-wrap">
          <div className="hm-in">
            <div className="hm-months" aria-hidden="true">
              {weeks.map((w, i) => {
                const prev = weeks[i - 1];
                const show = !prev || prev.getMonth() !== w.getMonth();
                return <span key={dayKey(w)} className="lbl">{show && i < WEEKS - 2 ? MONTHS_SHORT[w.getMonth()].replace(".", "") : ""}</span>;
              })}
            </div>
            <div className="hm-grid">
              {weeks.flatMap((w) => {
                const streak = s.streakWeeks.has(dayKey(w));
                return Array.from({ length: 7 }, (_, j) => {
                  const day = addDays(w, j);
                  const key = dayKey(day);
                  const n = s.byDay.get(key) ?? 0;
                  const cls = [key > k ? "fut" : "", n ? (streak ? "g" : "on") : "", key === k ? "today" : ""].filter(Boolean).join(" ");
                  return <i key={key} className={cls} title={n ? `${day.getDate()} ${MONTHS_SHORT[day.getMonth()]} : ${n} ${plural(n, "vidéo")}` : undefined} />;
                });
              })}
            </div>
          </div>
        </div>
      </section>

      {history.length > 0 && (
        <section className="cs-hist">
          <h2 className="aj-sec">Historique des publications</h2>
          <div className="pr-list">{history.map((c) => <ProofRow key={c.id} c={c} />)}</div>
        </section>
      )}

      <section className="box advice">
        <span className="lbl">Conseil</span>
        <p>{s.advice}</p>
      </section>
    </div>
  );
}

// Chaque jour, trois anneaux : la lune (jeu du jour), les étapes faites, la publication.
function ring(r: number, p: number, cls: string) {
  const C = 2 * Math.PI * r;
  return (
    <>
      <circle cx="50" cy="50" r={r} className={`rg-track ${cls}`} />
      {p > 0 && <circle cx="50" cy="50" r={r} className={`rg ${cls}`} strokeDasharray={`${(C * Math.min(p, 1)).toFixed(1)} ${C.toFixed(1)}`} transform="rotate(-90 50 50)" />}
    </>
  );
}
function Rings() {
  const d = useData()!;
  const g = d.game;
  const [off, setOff] = useState(0);
  const k = today();
  const mon = addDays(startOfWeek(new Date()), off * 7);
  const days = Array.from({ length: 7 }, (_, i) => dayKey(addDays(mon, i)));
  const end = addDays(mon, 6);
  return (
    <section className="box cs-rings">
      <header className="cs-h">
        <h2>Semaine par semaine</h2>
        <span className="cs-nav">
          <button type="button" className="x" onClick={() => setOff(off - 1)} aria-label="Semaine précédente">‹</button>
          <span className="muted">{mon.getDate()} {MONTHS_SHORT[mon.getMonth()]} au {end.getDate()} {MONTHS_SHORT[end.getMonth()]}</span>
          <button type="button" className="x" onClick={() => setOff(off + 1)} disabled={off >= 0} aria-label="Semaine suivante">›</button>
        </span>
      </header>
      <div className="rg-week">
        {days.map((day, i) => {
          const fut = day > k;
          const h = day === k ? (lit(g) ? "on" : null) : g.hist[day];
          const lune = h === "on" ? 1 : h === "joker" ? 0.5 : 0;
          const steps = d.contents.flatMap((c) => STEPS.map((st) => c.steps[st.key])).filter((st) => st.at?.startsWith(day));
          const stepP = steps.length ? steps.filter((st) => st.done).length / steps.length : 0;
          const mine = d.contents.filter((c) => (c.igPost?.at ?? c.publishAt ?? "").startsWith(day));
          const pr = mine.map((c) => proofOf(c, d.ig, d.contents, k));
          const pub = pr.includes("ok") ? 1 : pr.includes("late") ? 0.6 : pr.includes("decl") ? 0.4 : 0;
          const missed = pr.some((p) => p === "miss" || p === "propose");
          return (
            <div key={day} className={`rg-day${day === k ? " today" : ""}`}>
              <svg viewBox="0 0 100 100" aria-hidden="true">{ring(44, fut ? 0 : lune, "a")}{ring(31, fut ? 0 : stepP, "b")}{ring(18, fut ? 0 : pub, "c")}</svg>
              <small className="lbl">{DAYS[i].charAt(0).toUpperCase()} {parseInt(day.slice(8), 10)}</small>
              <span className={`rg-pub${missed ? " r" : ""}`}>{pub === 1 ? "Vérifiée" : pub ? "Publiée" : missed ? "Non validée" : mine.length && fut ? "Prévue" : ""}</span>
            </div>
          );
        })}
      </div>
      <div className="rg-legend"><span><i className="a" />Lune (jeu du jour)</span><span><i className="b" />Étapes faites</span><span><i className="c" />Publication {d.ig?.verified ? "vérifiée" : "déclarée"}</span></div>
    </section>
  );
}
