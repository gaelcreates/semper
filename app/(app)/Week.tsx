"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { DAYS, addDays, dayKey, fmt, isoWeek, minutesOfDay, parse } from "./lib";
import { STEPS, createContent, movePublish, openSheet, patchContent, type Content, type StepKey } from "./store";

// La semaine : une colonne par jour, une ligne par heure. Chaque vidéo y pose ses blocs :
// écriture, tournage, montage (durée fixée dans le profil) et la publication.
// Un bloc se déplace, il ne se redimensionne pas. Déplacer la publication entraîne ses étapes.

const HOUR = 64;
const PX = HOUR / 60;
const SNAP = 15;
const MIN_H = 15; // hauteur visible minimale d'un bloc, en minutes ; le bloc suivant passe par-dessus
const PUB = 30; // la publication est un moment, affichée sur une demi-heure

type Item = { key: string; cid: string; kind: StepKey | "pub"; day: number; s: number; dur: number; done: boolean; title: string; label: string };
type Drag = { it: Item; x: number; y: number; colW: number; moved: boolean };
type Off = { key: string; cid: string; pub: boolean; days: number; mins: number; colW: number };

export default function Week({ contents, days, dur }: { contents: Content[]; days: Date[]; dur: Record<StepKey, number> }) {
  const scroller = useRef<HTMLDivElement>(null);
  const drag = useRef<Drag | null>(null);
  const [off, setOff] = useState<Off | null>(null);
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(t);
  }, []);

  // On ouvre juste avant le premier bloc de la période, sinon vers 7 h 30.
  const items = build(contents, days, dur);
  const first = items.length ? Math.min(...items.map((i) => i.s)) - 30 : 7.5 * 60;
  useLayoutEffect(() => {
    if (scroller.current) scroller.current.scrollTop = Math.max(0, first) * PX;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dayKey(days[0]), days.length]);

  const byDay = days.map((_, i) => lanes(items.filter((it) => it.day === i)));

  function offsets(g: Drag, e: { clientX: number; clientY: number }) {
    const days = shift(g, e.clientX);
    const s = clamp(g.it.s + Math.round((e.clientY - g.y) / PX / SNAP) * SNAP, 0, 24 * 60 - SNAP);
    return { days, mins: s - g.it.s };
  }
  const shift = (g: Drag, x: number) => clamp(g.it.day + Math.round((x - g.x) / g.colW), 0, days.length - 1) - g.it.day;

  function down(e: React.PointerEvent, it: Item) {
    if (e.button !== 0) return;
    e.stopPropagation();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    const col = scroller.current!.querySelector(".wk-col")!.getBoundingClientRect();
    drag.current = { it, x: e.clientX, y: e.clientY, colW: col.width, moved: false };
  }
  function move(e: React.PointerEvent) {
    const g = drag.current;
    if (!g) return;
    if (!g.moved && Math.abs(e.clientX - g.x) + Math.abs(e.clientY - g.y) < 5) return;
    g.moved = true;
    setOff({ key: g.it.key, cid: g.it.cid, pub: g.it.kind === "pub", colW: g.colW, ...offsets(g, e) });
  }
  function up(e: React.PointerEvent) {
    const g = drag.current;
    drag.current = null;
    setOff(null);
    if (!g) return;
    if (!g.moved) return openSheet(g.it.cid);
    const o = offsets(g, e);
    if (!o.days && !o.mins) return;
    const d = addDays(days[g.it.day], o.days);
    d.setMinutes(g.it.s + o.mins);
    const at = fmt(d);
    const kind = g.it.kind;
    if (kind === "pub") patchContent(g.it.cid, (c, data) => movePublish(c, at, data.profile.durations));
    else patchContent(g.it.cid, (c) => ({ ...c, steps: { ...c.steps, [kind]: { ...c.steps[kind], at } } }));
  }

  // Un clic sur un créneau vide pose une nouvelle vidéo à cette heure.
  function slot(e: React.MouseEvent<HTMLDivElement>, day: Date) {
    if (e.target !== e.currentTarget) return;
    const m = Math.floor(e.nativeEvent.offsetY / PX / 30) * 30;
    const d = new Date(day);
    d.setMinutes(clamp(m, 0, 23 * 60 + 30));
    openSheet(createContent(fmt(d)));
  }

  const today = dayKey(now);

  return (
    <div className="wk" ref={scroller} style={{ ["--n" as string]: days.length }}>
      <div className="wk-head">
        <span className="wk-gut lbl">{days.length > 1 ? `S${isoWeek(days[0])}` : ""}</span>
        {days.map((d) => (
          <span key={dayKey(d)} className={`wk-day${dayKey(d) === today ? " today" : ""}`}>
            <small className="lbl">{DAYS[(d.getDay() + 6) % 7].slice(0, 3)}</small>
            <b className="disp">{d.getDate()}</b>
          </span>
        ))}
      </div>
      <div className="wk-body">
        <div className="wk-hours" aria-hidden="true">
          {Array.from({ length: 24 }, (_, h) => <span key={h} className="disp" style={{ top: h * HOUR }}>{h ? String(h).padStart(2, "0") : ""}</span>)}
        </div>
        {days.map((d, i) => (
          <div key={dayKey(d)} className="wk-col" onClick={(e) => slot(e, d)}>
            {dayKey(d) === today && <i className="wk-now" style={{ top: minutesOfDay(now) * PX }} />}
            {byDay[i].map(({ it, lane, n }, z) => {
              const moving = off && (off.key === it.key || (off.pub && off.cid === it.cid));
              const h = Math.max(it.dur, MIN_H) * PX;
              return (
                <button
                  type="button"
                  key={it.key}
                  className={`blk k-${it.kind}${it.done ? " done" : ""}${h < 44 ? " tight" : ""}${moving ? " moving" : ""}`}
                  style={{
                    top: it.s * PX, height: h - 2, zIndex: moving ? 50 : 2 + z,
                    left: `calc(${(lane / n) * 100}% + 2px)`, width: `calc(${100 / n}% - 4px)`,
                    transform: moving ? `translate(${off.days * off.colW}px, ${off.mins * PX}px)` : undefined,
                  }}
                  onPointerDown={(e) => down(e, it)}
                  onPointerMove={move}
                  onPointerUp={up}
                  onPointerCancel={() => { drag.current = null; setOff(null); }}
                  onClick={(e) => e.stopPropagation()}
                  aria-label={`${it.label}, ${it.title || "sans titre"}, ${time(it.s)}`}
                >
                  {it.kind === "pub"
                    ? <><b className="disp">{time(it.s)}</b><span>{it.title || "Sans titre"}</span></>
                    : <><small className="lbl">{it.label}</small><span>{it.title || "Sans titre"}</span></>}
                </button>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

const clamp = (n: number, a: number, b: number) => Math.min(b, Math.max(a, n));
const time = (m: number) => `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;

function build(contents: Content[], days: Date[], dur: Record<StepKey, number>): Item[] {
  const idx = new Map(days.map((d, i) => [dayKey(d), i]));
  const out: Item[] = [];
  const push = (c: Content, kind: Item["kind"], at: string | null, d: number, done: boolean, label: string) => {
    if (!at) return;
    const day = idx.get(at.slice(0, 10));
    if (day === undefined) return;
    out.push({ key: `${c.id}:${kind}`, cid: c.id, kind, day, s: minutesOfDay(parse(at)), dur: d, done, title: c.title, label });
  };
  for (const c of contents) {
    STEPS.forEach(({ key, label }) => push(c, key, c.steps[key].at, dur[key], c.steps[key].done, label));
    push(c, "pub", c.publishAt, PUB, !!c.publishedAt, "Publication");
  }
  return out;
}

// Blocs qui se chevauchent : côte à côte, chacun dans son couloir.
function lanes(items: Item[]) {
  const sorted = [...items].sort((a, b) => a.s - b.s);
  const out: { it: Item; lane: number; n: number }[] = [];
  let group: { it: Item; lane: number; n: number }[] = [];
  let ends: number[] = [];
  let groupEnd = -1;
  const flush = () => { group.forEach((g) => (g.n = ends.length)); out.push(...group); group = []; ends = []; };
  for (const it of sorted) {
    if (it.s >= groupEnd) flush();
    const e = it.s + it.dur;
    let lane = ends.findIndex((x) => x <= it.s);
    if (lane < 0) { lane = ends.length; ends.push(e); } else ends[lane] = e;
    group.push({ it, lane, n: 0 });
    groupEnd = Math.max(groupEnd, e);
  }
  flush();
  return out;
}
