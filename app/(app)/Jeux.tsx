"use client";

import { useEffect, useRef, useState } from "react";
import DotIcon from "../DotIcon";
import Lune from "./Lune";
import { addDays, dayKey } from "./lib";
import { REPAIR, gameInfo, moonDays, moonState, type GameId, type Lit } from "./jour";
import { addContent, deleteContent, movePublish, patchContent, play, useData, type Content } from "./store";

// Les mini-jeux du jour : deux minutes, et chacun fait avancer un contenu ou apprend un geste du métier.
// Le premier jeu du jour allume la lune ; trois jeux le lendemain d'un oubli la réparent.

const pick = <T,>(a: T[]) => a[Math.floor(Math.random() * a.length)];
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

const SUJETS = ["ton premier client", "ta routine du lundi", "un outil que tu utilises tous les jours", "une erreur de débutant", "ce que personne ne dit sur ton métier", "un chiffre de ta semaine", "la question qu'on te pose le plus", "ce que tu ferais différemment"];
const FORMATS = ["Erreur", "Histoire", "Tutoriel", "Coulisses", "Avis", "Astuce", "Témoignage", "Mythe", "Avant / après"];
const CONTRAINTES = ["en 15 secondes", "sans parler", "en une seule prise", "face caméra", "avec un objet du bureau", "en 3 étapes", "en marchant", "sans montage"];
const QUESTIONS = ["Quelle question tes clients te posent le plus souvent ?", "Qu'est-ce que tu as appris cette semaine que tu ne savais pas lundi ?", "Quelle croyance de ton domaine te semble fausse ?", "Quel est le meilleur conseil qu'on t'ait donné ?", "Qu'est-ce qui t'a fait perdre du temps cette semaine ?", "Qu'est-ce que tu referais exactement pareil ?", "Quel outil as-tu arrêté d'utiliser, et pourquoi ?"];
const DUELS = [
  { a: "Voici 3 conseils pour mieux organiser ton contenu.", b: "J'ai arrêté de publier tous les jours. Mes vues ont monté.", win: "b", why: "B crée une tension (une décision contre-intuitive) et promet un résultat. A annonce une liste sans enjeu." },
  { a: "Le jour où j'ai failli tout arrêter.", b: "Aujourd'hui je vais vous parler de motivation.", win: "a", why: "A ouvre une histoire avec un risque. B décrit le sujet au lieu de donner envie d'en savoir plus." },
  { a: "Tu perds 4 heures par semaine sans le savoir.", b: "Comment gagner du temps quand on crée du contenu.", win: "a", why: "A parle à la personne, avec un chiffre précis et une perte. B est un titre de blog." },
  { a: "Personne ne regarde tes vidéos jusqu'au bout. Voici pourquoi.", b: "Quelques astuces pour améliorer la rétention.", win: "a", why: "A pique et promet une explication. B reste vague : quelques astuces, pour qui, pour quoi ?" },
];
const LONGS = [
  { t: "Alors aujourd'hui j'avais vraiment envie de vous parler d'un sujet qui me tient à cœur et qui concerne la façon dont on organise son contenu chaque semaine.", hint: "Garde le cœur : l'organisation de la semaine. Coupe l'introduction." },
  { t: "Est-ce que vous aussi vous avez parfois l'impression que malgré tous vos efforts vous n'arrivez jamais à publier régulièrement sur Instagram ?", hint: "Une seule idée : publier régulièrement, malgré les efforts." },
  { t: "Dans cette vidéo je vais essayer de vous expliquer en quelques minutes pourquoi la plupart des gens abandonnent leur compte au bout de trois semaines.", hint: "Garde la promesse : pourquoi on abandonne au bout de trois semaines." },
];
const OBJECTIFS = [
  { t: "Mes 3 erreurs de débutant en montage", a: "Attirer", why: "Une erreur courante parle à tout le monde : on attire de nouvelles personnes." },
  { t: "Le jour où j'ai failli tout arrêter", a: "Attacher", why: "Une histoire personnelle crée du lien avec ceux qui te suivent déjà." },
  { t: "Comment je prépare un client en 3 étapes", a: "Convertir", why: "Montrer ta méthode donne envie de travailler avec toi." },
  { t: "Ce que je pense vraiment des tendances", a: "Attacher", why: "Ton avis montre qui tu es : c'est de l'attachement." },
  { t: "Avant / après d'un projet client", a: "Convertir", why: "Le résultat concret d'un client prouve ton offre." },
];
const SAMPLE_IDEAS = ["Ma routine de tournage du dimanche", "Ce que j'aurais aimé savoir à 100 abonnés", "Réagir à une vidéo de mon domaine", "Le jour où un client m'a dit non"];

type Done = (title: string, text: string) => void;
const idea = (title: string) => addContent({ title: title.trim().slice(0, 200) });

export default function Jeu({ id, onClose }: { id: GameId; onClose: () => void }) {
  const [win, setWin] = useState<{ event: Lit; title: string; text: string } | null>(null);
  const [key, setKey] = useState(0);
  const box = useRef<HTMLDivElement>(null);
  const g = gameInfo(id)!;

  useEffect(() => {
    const prev = document.activeElement as HTMLElement | null;
    box.current?.focus();
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", esc);
    return () => { window.removeEventListener("keydown", esc); prev?.focus?.(); };
  }, [onClose]);

  const done: Done = (title, text) => setWin({ event: play(id), title, text });

  return (
    <div className="veil jeu-veil" onPointerDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="jeu" role="dialog" aria-modal="true" aria-label={g.name} ref={box} tabIndex={-1}>
        <button type="button" className="x jeu-x" onClick={onClose} aria-label="Fermer"><DotIcon name="croix" /></button>
        {win ? <Win {...win} onClose={onClose} /> : (
          <div key={key}>
            {id === "hook" && <Hook done={done} again={() => setKey(key + 1)} />}
            {id === "coupe" && <Coupe done={done} />}
            {id === "duel" && <Duel done={done} />}
            {id === "tirage" && <Tirage done={done} />}
            {id === "question" && <Question done={done} />}
            {id === "recyclage" && <Recyclage done={done} />}
            {id === "tri" && <Tri done={done} />}
            {id === "script" && <Script done={done} />}
            {id === "objectif" && <Objectif done={done} />}
          </div>
        )}
      </div>
    </div>
  );
}

function Win({ event, title, text, onClose }: { event: Lit; title: string; text: string; onClose: () => void }) {
  const gm = useData()!.game;
  const left = REPAIR - gm.done.length;
  const msg = event === "repaired" ? `Lune réparée : ${gm.moon} jours` : event === "lit" ? `Lune allumée : ${gm.moon} ${gm.moon > 1 ? "jours" : "jour"}`
    : gm.broken ? `Encore ${left} jeu${left > 1 ? "x" : ""} pour la réparer` : title;
  return (
    <div className="jeu-win">
      <Lune n={moonDays(gm)} state={moonState(gm)} className={event ? "pop" : ""} />
      <h3>{msg}</h3>
      <p>{text}{event === "lit" ? " Reviens demain : elle grandit." : ""}</p>
      <button type="button" className="btn" onClick={onClose} autoFocus>{gm.broken ? "Jeu suivant" : "Continuer"}</button>
    </div>
  );
}

function Head({ label, title, sub }: { label: string; title: string; sub?: string }) {
  return <header className="jeu-head"><span className="lbl">{label}</span><h2>{title}</h2>{sub && <p>{sub}</p>}</header>;
}

// Un chrono qui part à la première lettre.
function useClock(total: number) {
  const [left, setLeft] = useState(total);
  const [on, setOn] = useState(false);
  useEffect(() => {
    if (!on) return;
    const t = setInterval(() => setLeft((l) => (l > 0 ? l - 1 : 0)), 1000);
    return () => clearInterval(t);
  }, [on]);
  return { left, start: () => setOn(true), bar: <div className="jeu-timer"><b className="disp">{left}</b><span className="jeu-bar"><i style={{ width: `${(left / total) * 100}%` }} /></span></div> };
}

function Hook({ done, again }: { done: Done; again: () => void }) {
  const [sujet] = useState(() => pick(SUJETS));
  const [t, setT] = useState("");
  const clock = useClock(30);
  return (
    <>
      <Head label="Hook en 30 secondes" title="La première phrase." sub="Écris l'accroche d'une vidéo sur ce sujet. Pas de perfection, du rythme." />
      <div className="jeu-stage">
        <div className="jeu-subject">{cap(sujet)}</div>
        {clock.bar}
        <textarea className="inp long" rows={3} autoFocus value={t} disabled={clock.left === 0} placeholder="Le chrono part à la première lettre."
          onChange={(e) => { setT(e.target.value); clock.start(); }} />
        <div className="jeu-act">
          <button type="button" className="btn btn-ghost" onClick={again}>Autre sujet</button>
          <button type="button" className="btn" disabled={!t.trim()} onClick={() => { idea(t); done("Hook gardé.", "Il est dans tes idées."); }}>Garder ce hook</button>
        </div>
      </div>
    </>
  );
}

function Coupe({ done }: { done: Done }) {
  const [l] = useState(() => pick(LONGS));
  const [t, setT] = useState("");
  const n = t.trim().split(/\s+/).filter(Boolean).length;
  const ok = n > 0 && n <= 12;
  return (
    <>
      <Head label="Coupe ! · t'entraîne" title="Moins de 12 mots." sub="Ce hook est trop long : on décroche avant la fin. Réécris-le sans perdre l'idée." />
      <div className="jeu-stage">
        <div className="jeu-subject light">{l.t}</div>
        <p className="muted">{l.hint}</p>
        <textarea className="inp long" rows={2} autoFocus value={t} onChange={(e) => setT(e.target.value)} placeholder="Ta version courte" />
        <div className="jeu-act between">
          <span className={`disp jeu-words${ok ? " ok" : ""}`}>{n} mot{n > 1 ? "s" : ""}</span>
          <button type="button" className="btn" disabled={!ok} onClick={() => { idea(t); done(`${n} mots.`, n <= 8 ? "Court et net : c'est ce qui retient le pouce." : "Bien. Sous 8 mots, c'est encore plus fort."); }}>Valider</button>
        </div>
      </div>
    </>
  );
}

function Duel({ done }: { done: Done }) {
  const [list] = useState(() => [...DUELS].sort(() => Math.random() - 0.5).slice(0, 3));
  const [i, setI] = useState(0);
  const [me, setMe] = useState<string | null>(null);
  const [good, setGood] = useState(0);
  const d = list[i];
  return (
    <>
      <Head label={`Duel de hooks · ${i + 1} / ${list.length}`} title="Lequel arrête le pouce ?" sub="Choisis l'accroche que tu regarderais jusqu'au bout." />
      <div className="jeu-stage">
        <div className="jeu-vs">
          {(["a", "b"] as const).map((k) => (
            <button type="button" key={k} className={`jeu-pick${me === k ? " me" : ""}${me && k === d.win ? " good" : ""}`}
              onClick={() => { if (me) return; setMe(k); if (k === d.win) setGood(good + 1); }}>{d[k]}</button>
          ))}
        </div>
        {me && <div className="jeu-why"><b>{me === d.win ? "Bien vu." : "Plutôt l'autre."}</b> {d.why}</div>}
        {me && (
          <div className="jeu-act">
            <button type="button" className="btn" onClick={() => {
              if (i < list.length - 1) { setI(i + 1); setMe(null); }
              else done(`${good} sur ${list.length}.`, "Une tension, une promesse, une personne à qui on parle : c'est ce qui arrête le pouce.");
            }}>{i < list.length - 1 ? "Duel suivant" : "Terminer"}</button>
          </div>
        )}
      </div>
    </>
  );
}

function Tirage({ done }: { done: Done }) {
  const lists = [FORMATS, SUJETS, CONTRAINTES];
  const [tries, setTries] = useState(3);
  const [res, setRes] = useState<string[] | null>(null);
  const [spin, setSpin] = useState<string[] | null>(null);
  const roll = () => {
    if (!tries || spin) return;
    setTries(tries - 1);
    const out = lists.map(pick);
    let n = 0;
    const t = setInterval(() => {
      n++;
      setSpin(lists.map((l, i) => (n > 6 + i * 5 ? out[i] : pick(l))));
      if (n > 16) { clearInterval(t); setSpin(null); setRes(out); }
    }, 70);
  };
  useEffect(roll, []); // eslint-disable-line react-hooks/exhaustive-deps
  const shown = spin ?? res ?? ["?", "?", "?"];
  const text = res ? `${res[0]} : ${res[1]}, ${res[2]}` : "";
  return (
    <>
      <Head label="La machine à idées" title="Trois rouleaux, une vidéo." sub="Format, sujet, contrainte. Trois tirages." />
      <div className="jeu-stage">
        <div className="jeu-reels">
          {["Format", "Sujet", "Contrainte"].map((l, i) => <div key={l} className={`jeu-reel${spin ? " spin" : ""}`}><small className="lbl">{l}</small><span>{cap(shown[i])}</span></div>)}
        </div>
        {res && !spin && <div className="jeu-idea">{text}.</div>}
        <div className="jeu-act">
          <button type="button" className="btn btn-ghost" disabled={!tries || !!spin} onClick={roll}>Tirer ({tries})</button>
          <button type="button" className="btn" disabled={!res || !!spin} onClick={() => { idea(text); done("Idée gardée.", "Elle t'attend dans tes idées."); }}>Garder l&apos;idée</button>
        </div>
      </div>
    </>
  );
}

function Question({ done }: { done: Done }) {
  const [q] = useState(() => QUESTIONS[new Date().getDate() % QUESTIONS.length]);
  const [t, setT] = useState("");
  return (
    <>
      <Head label="La question du jour" title={q} sub="Réponds comme à un ami. Ta réponse devient une idée de vidéo." />
      <div className="jeu-stage">
        <textarea className="inp long" rows={4} autoFocus value={t} onChange={(e) => setT(e.target.value)} placeholder="Ta réponse…" />
        <div className="jeu-act"><button type="button" className="btn" disabled={!t.trim()} onClick={() => { idea(t.slice(0, 120)); done("Réponse gardée.", "Elle est devenue une idée."); }}>Garder</button></div>
      </div>
    </>
  );
}

function Recyclage({ done }: { done: Done }) {
  const d = useData()!;
  const [src] = useState(() => {
    const pub = d.contents.filter((c) => c.publishedAt && c.title.trim());
    return pub.length ? pick(pub).title : "3 erreurs de calendrier";
  });
  const angles = [`La suite de « ${src} » : ce que je n'avais pas dit`, `Le contre-pied de « ${src} »`, `« ${src} », version 15 secondes`];
  return (
    <>
      <Head label="Recyclage" title={src} sub="Une de tes vidéos. Choisis un angle neuf." />
      <div className="jeu-stage">
        {angles.map((a) => <button type="button" key={a} className="jeu-pick" onClick={() => { idea(a); done("Angle gardé.", "Une nouvelle vidéo sans repartir de zéro."); }}>{a}</button>)}
      </div>
    </>
  );
}

function Tri({ done }: { done: Done }) {
  const d = useData()!;
  const [deck, setDeck] = useState<{ id: string | null; t: string }[]>(() => {
    const mine = d.contents.filter((c) => !c.publishAt && c.title.trim()).slice(0, 8).map((c) => ({ id: c.id, t: c.title }));
    return [...mine, ...SAMPLE_IDEAS.map((t) => ({ id: null, t }))].slice(0, Math.max(4, Math.min(8, mine.length)));
  });
  const [gone, setGone] = useState<string | null>(null);
  const [kept, setKept] = useState(0);
  const act = (a: "l" | "r" | "d") => {
    const top = deck[0];
    if (!top || gone) return;
    setGone(a);
    if (a === "r") { setKept(kept + 1); if (!top.id) idea(top.t); }
    if (a === "l" && top.id) deleteContent(top.id, true);
    setTimeout(() => {
      setGone(null);
      const rest = deck.slice(1);
      setDeck(rest);
      if (!rest.length) done("Tri fini.", `${kept + (a === "r" ? 1 : 0)} idée${kept + (a === "r" ? 1 : 0) > 1 ? "s" : ""} gardée${kept + (a === "r" ? 1 : 0) > 1 ? "s" : ""}.`);
    }, 260);
  };
  useEffect(() => {
    const k = (e: KeyboardEvent) => { const m = ({ ArrowRight: "r", ArrowLeft: "l", ArrowDown: "d" } as const)[e.key as "ArrowRight"]; if (m) { e.preventDefault(); act(m); } };
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  });
  return (
    <>
      <Head label="Tri express" title="Garder ou jeter ?" sub="Tes idées défilent. Flèches : droite garder, gauche jeter, bas plus tard." />
      <div className="jeu-stage">
        <div className="jeu-deck">
          {deck.slice(0, 3).reverse().map((c, i, a) => (
            <div key={`${c.id ?? c.t}`} className={`jeu-card${i === a.length - 1 && gone ? ` gone-${gone}` : ""}`} style={{ ["--n" as string]: a.length - 1 - i }}>
              <span className="lbl">Idée</span><b>{c.t}</b>
            </div>
          ))}
        </div>
        <div className="jeu-act center">
          <button type="button" className="btn btn-ghost" onClick={() => act("l")}>Jeter</button>
          <button type="button" className="btn btn-ghost" onClick={() => act("d")}>Plus tard</button>
          <button type="button" className="btn" onClick={() => act("r")}>Garder</button>
        </div>
        <p className="muted center">{deck.length} à trier</p>
      </div>
    </>
  );
}

// Le prochain soir libre (18 h) dans les deux semaines.
function nextSlot(contents: Content[]) {
  for (let i = 1; i < 15; i++) {
    const k = dayKey(addDays(new Date(), i));
    if (!contents.some((c) => c.publishAt?.startsWith(k))) return `${k}T18:00`;
  }
  return `${dayKey(addDays(new Date(), 15))}T18:00`;
}

function Script({ done }: { done: Done }) {
  const d = useData()!;
  const [src] = useState(() => d.contents.filter((c) => !c.publishAt && c.title.trim()).sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0] ?? null);
  const title = src?.title ?? "Ma routine du lundi en 15 secondes";
  const st = d.structures.find((s) => s.parts.length && s.parts.length <= 4) ?? d.structures[0];
  const parts = st?.parts ?? [];
  const [v, setV] = useState<Record<string, string>>({});
  const clock = useClock(90);
  const first = parts[0] ? (v[parts[0].id] ?? "").trim() : "";
  const full = parts.every((p) => (v[p.id] ?? "").trim());
  function create() {
    const at = nextSlot(d.contents);
    const script = { structureId: st?.id ?? null, parts: Object.fromEntries(parts.map((p) => [p.id, (v[p.id] ?? "").trim()])) };
    if (src) patchContent(src.id, (c, dd) => ({ ...movePublish(c, at, dd.profile.steps), script }));
    else addContent({ title, publishAt: at, script });
    const day = new Date(at);
    done("Contenu créé.", `Au calendrier le ${day.toLocaleDateString("fr-CH", { weekday: "long", day: "numeric", month: "long" })} à 18 h, avec son script.`);
  }
  return (
    <>
      <Head label="Script éclair" title={title} sub="90 secondes pour poser le script. Le contenu entre au calendrier." />
      <div className="jeu-stage">
        {clock.bar}
        {parts.map((p, i) => (
          <label key={p.id} className="fld"><span className="lbl">{p.label}</span>
            <textarea className="inp long" rows={i === 1 ? 2 : 1} autoFocus={i === 0} value={v[p.id] ?? ""} onChange={(e) => { setV({ ...v, [p.id]: e.target.value }); clock.start(); }} />
          </label>
        ))}
        <div className="jeu-act"><button type="button" className="btn" disabled={!first} onClick={create}>Créer le contenu</button></div>
      </div>
    </>
  );
}

function Objectif({ done }: { done: Done }) {
  const [i, setI] = useState(0);
  const [me, setMe] = useState<string | null>(null);
  const [good, setGood] = useState(0);
  const o = OBJECTIFS[i];
  return (
    <>
      <Head label={`Le bon objectif · ${i + 1} / ${OBJECTIFS.length}`} title={o.t} sub="Cette vidéo sert surtout à…" />
      <div className="jeu-stage">
        <div className="jeu-tri3">
          {["Attirer", "Attacher", "Convertir"].map((a) => (
            <button type="button" key={a} className={`jeu-pick center${me && a === o.a ? " good" : ""}${me === a && a !== o.a ? " bad" : ""}`}
              onClick={() => { if (me) return; setMe(a); if (a === o.a) setGood(good + 1); }}>{a}</button>
          ))}
        </div>
        {me && <div className="jeu-why"><b>{me === o.a ? "Juste." : `Plutôt ${o.a}.`}</b> {o.why}</div>}
        {me && (
          <div className="jeu-act">
            <button type="button" className="btn" onClick={() => {
              if (i < OBJECTIFS.length - 1) { setI(i + 1); setMe(null); }
              else done(`${good} sur ${OBJECTIFS.length}.`, "Savoir à quoi sert une vidéo, c'est choisir le bon format et le bon appel.");
            }}>{i < OBJECTIFS.length - 1 ? "Suivante" : "Terminer"}</button>
          </div>
        )}
      </div>
    </>
  );
}

