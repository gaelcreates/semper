"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Lune from "../Lune";
import Jeu from "../Jeux";
import ProofRow from "../Preuve";
import IdeaRow, { ideasOf } from "../Idees";
import { DAYS, MONTHS, addDays, dayKey, parse, startOfWeek } from "../lib";
import { constance } from "../stats";
import {
  FOCUS, GAMES, MAX_JOKERS, REPAIR, choices, dailyGame, lit, moonDays, moonState, phaseName, toFix,
  type Focus, type GameId, type GameInfo,
} from "../jour";
import { setGame, useData } from "../store";

// Aujourd'hui : la lune, le jeu du jour, la publication du jour et ce qui reste à vérifier.
export default function Aujourdhui() {
  const d = useData()!;
  const g = d.game;
  const [game, setOpen] = useState<GameId | null>(null);
  const [vac, setVac] = useState(false);
  const [breaking, setBreaking] = useState(false);
  const k = g.day;
  const st = moonState(g);
  const daily = dailyGame(g);
  const played = g.done.filter((x) => x !== "publication");
  const s = constance(d);
  const toNext = s.streakTo(dayKey(addDays(startOfWeek(new Date()), -7))) % 2;
  const todays = d.contents.filter((c) => c.publishAt?.startsWith(k)).sort((a, b) => a.publishAt!.localeCompare(b.publishAt!));
  const fix = toFix(d.contents, d.ig, k);
  const ideas = ideasOf(d.contents);

  // La lune vient de se fissurer : on la voit tomber une fois par jour.
  useEffect(() => {
    if (!g.broken) return;
    const key = `semper:fissure:${k}`;
    try { if (sessionStorage.getItem(key)) return; sessionStorage.setItem(key, "1"); } catch {}
    setBreaking(true);
    const t = setTimeout(() => setBreaking(false), 1400);
    return () => clearTimeout(t);
  }, [g.broken, k]);

  const title = g.broken ? "Ta lune s'est fissurée." : st === "lit" ? "Ta lune brille aujourd'hui." : st === "off" ? "Allume ta lune." : "Ta lune attend ton jeu du jour.";
  const sub = g.broken ? `${REPAIR} jeux aujourd'hui la réparent. Sinon, elle s'éteint.` : st === "lit" ? "Reviens demain : elle grandit d'un jour." : "Un jeu ou une publication vérifiée avant minuit.";
  const date = parse(k);

  return (
    <div className="page wide">
      <header className="page-head"><h1>Aujourd&apos;hui</h1><span className="count">{DAYS[(date.getDay() + 6) % 7].replace(".", "")} {date.getDate()} {MONTHS[date.getMonth()]}</span></header>

      <div className="aj-top">
        <section className={`box aj-hero${g.broken ? " broken" : ""}`}>
          <Lune n={moonDays(g)} state={st} breaking={breaking} />
          <div className="aj-hero-t">
            <p className="aj-n"><b className="disp">{moonDays(g)}</b><span>{moonDays(g) > 1 ? "jours d'affilée" : "jour d'affilée"}</span></p>
            <h2>{title}</h2>
            <p className="muted">{sub}</p>
            <Week />
            {g.broken ? (
              <div className="aj-repair">
                <b>Réparer la lune : {Math.min(g.done.length, REPAIR)} / {REPAIR}</b>
                <span>{Array.from({ length: REPAIR }, (_, i) => <i key={i} className={i < g.done.length ? "on" : ""} />)}</span>
              </div>
            ) : (
              <div className="aj-chips"><span className="chip">{phaseName(g.moon)}</span><span className="chip">Record <b className="disp">{g.best}</b></span></div>
            )}
          </div>
        </section>

        <section className="box aj-jokers">
          <header><h2>Tes jokers</h2><span className="lbl">{g.jokers} / {MAX_JOKERS}</span></header>
          <div className="aj-jk">{Array.from({ length: MAX_JOKERS }, (_, i) => <i key={i} className={`disp${i < g.jokers ? " on" : ""}`}>J</i>)}</div>
          <p className="muted">Un jour sans jeu utilise un joker au lieu de fissurer ta lune. Deux semaines tenues t&apos;en donnent un.</p>
          <div className="aj-prog"><span>Prochain joker</span><span className="muted">{toNext} / 2 semaines</span><span className="aj-bar"><i style={{ width: `${toNext * 50}%` }} /></span></div>
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => setVac(true)}>Partir en vacances</button>
        </section>
      </div>

      {g.mode === "semper" ? (
        <section className="box aj-daily">
          <span className="aj-badge disp">{daily.badge}</span>
          <div>
            <span className="lbl">Ton jeu du jour · {FOCUS.find((f) => f.key === daily.focus)?.label}</span>
            <h2>{daily.name}</h2>
            <p>{daily.desc}</p>
          </div>
          {g.done.includes(daily.id) ? <span className="aj-done">Fait. À demain.</span>
            : <button type="button" className="btn" onClick={() => setOpen(daily.id)}>Jouer</button>}
        </section>
      ) : (
        <>
          <h2 className="aj-sec">Choisis ton jeu du jour{played.length > 0 && <small className="muted">Fait. Les autres font monter tes compétences.</small>}</h2>
          <div className="aj-games">{choices(g).map((x) => <Card key={x.id} x={x} done={g.done.includes(x.id)} open={setOpen} />)}</div>
        </>
      )}

      {(g.broken || played.length > 0) && (
        <details className="aj-all" open={!!g.broken}>
          <summary>{g.broken ? "Répare avec n'importe quel jeu" : "Encore un jeu"}</summary>
          <div className="aj-games">{GAMES.map((x) => <Card key={x.id} x={x} done={g.done.includes(x.id)} open={setOpen} />)}</div>
        </details>
      )}

      <h2 className="aj-sec">Ta publication{!todays.length && <small className="muted">Rien de prévu aujourd&apos;hui.</small>}</h2>
      {todays.length > 0 && <div className="pr-list">{todays.map((c) => <ProofRow key={c.id} c={c} />)}</div>}
      {fix.length > 0 && (
        <>
          <h2 className="aj-sec">À vérifier<small className="muted">{fix.length === 1 ? "Une vidéo" : `${fix.length} vidéos`} sans publication le jour prévu.</small></h2>
          <div className="pr-list">{fix.map((c) => <ProofRow key={c.id} c={c} />)}</div>
        </>
      )}
      {!d.ig?.verified && (
        <div className="aj-callout">
          <span><b>Certifie tes publications</b><span className="muted">Relie Instagram : Semper vérifie que chaque vidéo sort le jour prévu.</span></span>
          <Link className="btn btn-sm" href="/profil#instagram">Relier Instagram</Link>
        </div>
      )}

      <h2 className="aj-sec">Tes idées{ideas.length > 0 && <Link className="link push" href="/idees">Toutes ({ideas.length})</Link>}</h2>
      {ideas.length ? <div className="ideas">{ideas.slice(0, 3).map((c) => <IdeaRow key={c.id} c={c} />)}</div>
        : <p className="muted">Aucune idée pour l&apos;instant. <Link className="link" href="/idees">En noter une</Link></p>}

      {game && <Jeu id={game} onClose={() => setOpen(null)} />}
      {vac && <Vacances onClose={() => setVac(false)} />}
      {!g.onboarded && <Accueil />}
    </div>
  );
}

function Card({ x, done, open }: { x: GameInfo; done: boolean; open: (id: GameId) => void }) {
  return (
    <button type="button" className={`aj-game${done ? " done" : ""}`} onClick={() => open(x.id)}>
      <span className="aj-badge disp">{x.badge}</span>
      <b>{x.name}</b>
      <span className="muted">{x.desc}</span>
      <span className="aj-meta"><span className={`lbl${x.kind === "cree" ? " c" : ""}`}>{x.kind === "cree" ? "Crée du contenu" : "T'entraîne"}</span><span className="muted">{x.time}</span></span>
    </button>
  );
}

// La semaine en cours, un point par jour : allumé, joker, raté, aujourd'hui.
function Week() {
  const g = useData()!.game;
  const mon = startOfWeek(parse(g.day));
  return (
    <div className="aj-week">
      {DAYS.map((l, i) => {
        const k = dayKey(addDays(mon, i));
        const h = g.hist[k];
        const cls = k === g.day ? `today${lit(g) ? " on" : ""}` : k > g.day ? (g.planned.includes(k) ? "joker" : "") : h ?? "";
        return <span key={k}><small className="lbl">{l.charAt(0).toUpperCase()}</small><i className={cls} /></span>;
      })}
    </div>
  );
}

// Poser ses jokers à l'avance : les jours choisis comptent comme tenus.
function Vacances({ onClose }: { onClose: () => void }) {
  const g = useData()!.game;
  const days = Array.from({ length: 14 }, (_, i) => dayKey(addDays(parse(g.day), i + 1)));
  const [sel, setSel] = useState(() => new Set(g.planned.filter((k) => days.includes(k))));
  const free = g.jokers + g.planned.filter((k) => days.includes(k)).length - sel.size;
  useEffect(() => {
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", esc);
    return () => window.removeEventListener("keydown", esc);
  }, [onClose]);
  function save() {
    setGame((x) => {
      const before = x.planned.filter((k) => days.includes(k)).length;
      return { ...x, planned: [...x.planned.filter((k) => !days.includes(k)), ...sel].sort(), jokers: x.jokers + before - sel.size };
    });
    onClose();
  }
  return (
    <div className="veil jeu-veil" onPointerDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="jeu" role="dialog" aria-modal="true" aria-label="Partir en vacances">
        <header className="jeu-head"><span className="lbl">Partir en vacances</span><h2>Pose tes jokers à l&apos;avance.</h2><p>Les jours choisis comptent comme tenus : ta lune t&apos;attend au retour.</p></header>
        <div className="jeu-stage">
          <div className="pr-days">
            {days.map((k) => {
              const x = parse(k), on = sel.has(k);
              return (
                <button type="button" key={k} className={on ? "on" : ""} disabled={!on && free <= 0}
                  onClick={() => { const n = new Set(sel); if (on) n.delete(k); else n.add(k); setSel(n); }}>
                  <span>{DAYS[(x.getDay() + 6) % 7]}</span><b className="disp">{x.getDate()}</b>
                </button>
              );
            })}
          </div>
          <p className="muted">{free} joker{free > 1 ? "s" : ""} restant{free > 1 ? "s" : ""}.{g.jokers === 0 && !sel.size ? " Tiens ton rythme deux semaines pour en gagner un." : ""}</p>
          <div className="jeu-act"><button type="button" className="btn btn-ghost" onClick={onClose}>Annuler</button><button type="button" className="btn" onClick={save}>Enregistrer</button></div>
        </div>
      </div>
    </div>
  );
}

// Premier passage : la lune, ce qu'on veut travailler, qui choisit le jeu du jour.
function Accueil() {
  const g = useData()!.game;
  const [step, setStep] = useState(0);
  const [focus, setFocus] = useState<Focus[]>(g.focus);
  const [mode, setMode] = useState(g.mode);
  const [n, setN] = useState(1);
  useEffect(() => {
    if (step) return;
    const t = setInterval(() => setN((x) => (x >= 9 ? 1 : x + 1)), 380);
    return () => clearInterval(t);
  }, [step]);
  const finish = () => setGame((x) => ({ ...x, focus, mode, onboarded: true }));
  return (
    <div className="veil jeu-veil">
      <div className="jeu aj-onb" role="dialog" aria-modal="true" aria-label="Ta lune">
        {step === 0 && (
          <>
            <Lune n={n} state="lit" />
            <h2>Voici ta lune.</h2>
            <p className="muted">Un jeu de deux minutes par jour l&apos;allume.</p>
            <ul className="aj-rules">
              <li><i />Chaque jour d&apos;affilée, elle grandit.</li>
              <li><i className="r" />Un jour raté, elle se fissure. Trois jeux le lendemain la réparent.</li>
              <li><i className="k" />Tenir ton rythme de publication te donne des jokers.</li>
            </ul>
          </>
        )}
        {step === 1 && (
          <>
            <h2>Qu&apos;est-ce que tu veux travailler ?</h2>
            <p className="muted">Ton jeu du jour viendra de là. Tu changes quand tu veux, dans ton profil.</p>
            <div className="aj-focus">
              {FOCUS.map((f) => (
                <button type="button" key={f.key} className={focus.includes(f.key) ? "on" : ""}
                  onClick={() => setFocus(focus.includes(f.key) ? focus.filter((x) => x !== f.key) : [...focus, f.key])}>{f.label}</button>
              ))}
            </div>
          </>
        )}
        {step === 2 && (
          <>
            <h2>Ton jeu du jour</h2>
            <p className="muted">Qui choisit chaque matin ?</p>
            <div className="aj-modes">
              {([["semper", "Semper choisit", "Un jeu, rien à décider."], ["choix", "Je choisis", "Trois propositions par jour."]] as const).map(([k, t, s]) => (
                <button type="button" key={k} className={mode === k ? "on" : ""} onClick={() => setMode(k)}><b>{t}</b><span className="muted">{s}</span></button>
              ))}
            </div>
          </>
        )}
        <button type="button" className="btn" disabled={step === 1 && !focus.length} onClick={() => (step < 2 ? setStep(step + 1) : finish())}>{step < 2 ? "Suivant" : "C'est parti"}</button>
        <span className="aj-dots">{[0, 1, 2].map((i) => <i key={i} className={i === step ? "on" : ""} />)}</span>
      </div>
    </div>
  );
}
