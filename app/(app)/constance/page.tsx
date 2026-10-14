"use client";

import Moon from "../Moon";
import Lune from "../Lune";
import Rythme from "../Rythme";
import ProofRow from "../Preuve";
import { TITLES, constance } from "../stats";
import { MONTHS_SHORT, addDays, dayKey, startOfWeek } from "../lib";
import { useData } from "../store";
import { proofOf, today } from "../jour";

const WEEKS = 52;
const plural = (n: number, w: string) => `${w}${n > 1 ? "s" : ""}`;

// Constance : les chiffres, les trophées, un an de publications (les jours ratés en pointillés), l'historique.
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
  // Les jours où une vidéo prévue n'est pas sortie : pointillés dans l'année.
  const missed = new Set(past.filter((c, i) => ["miss", "propose", "nonv"].includes(proofs[i])).map((c) => c.publishAt!.slice(0, 10)));
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
                  const miss = !n && missed.has(key);
                  const cls = [key > k ? "fut" : "", n ? (streak ? "g" : "on") : miss ? "miss" : "", key === k ? "today" : ""].filter(Boolean).join(" ");
                  const tip = n ? `${day.getDate()} ${MONTHS_SHORT[day.getMonth()]} : ${n} ${plural(n, "vidéo")}` : miss ? `${day.getDate()} ${MONTHS_SHORT[day.getMonth()]} : vidéo prévue, pas publiée` : undefined;
                  return <i key={key} className={cls} title={tip} />;
                });
              })}
            </div>
          </div>
        </div>
        <div className="hm-legend"><span><i className="on" />Publiée</span><span><i className="g" />Semaine tenue</span><span><i className="miss" />Prévue, pas publiée</span></div>
      </section>

      {history.length > 0 && (
        <section className="cs-hist">
          <h2 className="aj-sec">Historique des publications</h2>
          <div className="pr-list">{history.map((c) => <ProofRow key={c.id} c={c} />)}</div>
        </section>
      )}

    </div>
  );
}
