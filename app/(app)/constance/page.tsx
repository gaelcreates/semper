"use client";

import Moon from "../Moon";
import { Stepper } from "../ui";
import { TITLES, constance, titleOf } from "../stats";
import { MONTHS_SHORT, addDays, dayKey, startOfWeek } from "../lib";
import { setProfile, useData } from "../store";

const WEEKS = 52;
const plural = (n: number, w: string) => `${w}${n > 1 ? "s" : ""}`;

// Constance : la lune de la série et son titre, les chiffres, un an de jours publiés, un conseil.
export default function Constance() {
  const d = useData()!;
  const s = constance(d);
  const t = titleOf(s.streak);
  const today = new Date();
  const cur = startOfWeek(today);
  const weeks = Array.from({ length: WEEKS }, (_, i) => addDays(cur, -7 * (WEEKS - 1 - i)));
  const tk = dayKey(today);

  return (
    <div className="page wide">
      <header className="page-head"><h1>Constance</h1></header>

      <section className="box hero">
        <div className="hero-top">
          <Moon streak={s.streak} n={19} orbit className="hero-moon" />
          <div className="hero-t">
            <span className="lbl"><i className="dot" /> Titre</span>
            <h2>{t.title}</h2>
            <p><b className="disp">{s.streak}</b> {plural(s.streak, "semaine")} {plural(s.streak, "tenue")}</p>
            {t.next && (
              <div className="hero-next">
                <span className="segs" aria-hidden="true">
                  {Array.from({ length: t.next.w - t.from }, (_, i) => <i key={i} className={i < s.streak - t.from ? "on" : ""} />)}
                </span>
                <span className="lbl">{t.next.name} dans {t.next.w - s.streak} sem.</span>
              </div>
            )}
          </div>
        </div>
        <ol className="ladder">
          {TITLES.map((x) => (
            <li key={x.name} className={`${s.streak >= x.w ? "on" : ""}${x.name === t.title ? " now" : ""}`}>
              <Moon streak={x.w} n={9} orbit={x.w >= 13} />
              <span className="lbl">{x.name}</span>
              <b className="disp">{x.w}</b>
            </li>
          ))}
        </ol>
      </section>

      <div className="cs-stats">
        <div className="box stat">
          <span className="lbl">Record</span>
          <b className="disp">{s.record}</b>
          <span className="unit">{plural(s.record, "semaine")}</span>
        </div>
        <div className="box stat">
          <span className="lbl">Cette semaine</span>
          <b className="disp">{s.thisWeek}<i>/{s.rythme}</i></b>
          <Stepper label="Rythme visé par semaine" value={d.profile.rythme} min={1} max={14} format={(n) => `${n} / sem.`} onChange={(rythme) => setProfile({ rythme })} />
        </div>
        <div className="box stat">
          <span className="lbl">Publiées</span>
          <b className="disp">{s.total}</b>
          <span className="unit">{plural(s.total, "vidéo")}</span>
        </div>
      </div>

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
                  const k = dayKey(day);
                  const n = s.byDay.get(k) ?? 0;
                  const cls = [k > tk ? "fut" : "", n ? (streak ? "g" : "on") : "", k === tk ? "today" : ""].filter(Boolean).join(" ");
                  return <i key={k} className={cls} title={n ? `${day.getDate()} ${MONTHS_SHORT[day.getMonth()]} : ${n} ${plural(n, "vidéo")}` : undefined} />;
                });
              })}
            </div>
          </div>
        </div>
      </section>

      <section className="box advice">
        <span className="lbl">Conseil</span>
        <p>{s.advice}</p>
      </section>
    </div>
  );
}
