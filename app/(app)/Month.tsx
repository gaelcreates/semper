"use client";

import { useState } from "react";
import { DAYS, addDays, dayKey, hhmm, parse, startOfWeek } from "./lib";
import { STEPS, createContent, movePublish, openSheet, patchContent, type Content } from "./store";

// Le mois : les publications en clair, les étapes en points. Sur téléphone, seulement les points ;
// toucher un jour ouvre sa semaine.
export default function Month({ contents, anchor, narrow, onDay }: { contents: Content[]; anchor: Date; narrow: boolean; onDay: (d: Date) => void }) {
  const [over, setOver] = useState<string | null>(null);
  const first = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
  const last = new Date(anchor.getFullYear(), anchor.getMonth() + 1, 0);
  const start = startOfWeek(first);
  const end = addDays(startOfWeek(last), 7);
  const cells: Date[] = [];
  for (let d = start; d < end; d = addDays(d, 1)) cells.push(d);
  const today = dayKey(new Date());

  const pubs = new Map<string, Content[]>();
  const dots = new Map<string, { k: string; done: boolean; pub: boolean }[]>();
  const add = <T,>(m: Map<string, T[]>, k: string, v: T) => m.set(k, [...(m.get(k) ?? []), v]);
  for (const c of contents) {
    if (c.publishAt) {
      add(pubs, c.publishAt.slice(0, 10), c);
      add(dots, c.publishAt.slice(0, 10), { k: `${c.id}p`, done: !!c.publishedAt, pub: true });
    }
    STEPS.forEach(({ key }) => { const s = c.steps[key]; if (s.at) add(dots, s.at.slice(0, 10), { k: c.id + key, done: s.done, pub: false }); });
  }
  pubs.forEach((l) => l.sort((a, b) => a.publishAt!.localeCompare(b.publishAt!)));

  function pick(e: React.MouseEvent, d: Date) {
    if ((e.target as HTMLElement).closest(".mo-pub")) return;
    if (narrow) return onDay(d);
    const at = new Date(d);
    at.setHours(18);
    openSheet(createContent(`${dayKey(at)}T18:00`));
  }
  function drop(e: React.DragEvent, d: Date) {
    e.preventDefault();
    setOver(null);
    const id = e.dataTransfer.getData("text/plain");
    patchContent(id, (c, data) => (c.publishAt ? movePublish(c, `${dayKey(d)}T${c.publishAt.slice(11, 16)}`, data.profile.durations) : c));
  }

  return (
    <div className="mo">
      <div className="mo-head">{DAYS.map((d) => <span key={d} className="lbl">{d.slice(0, 3)}</span>)}</div>
      <div className="mo-grid">
        {cells.map((d) => {
          const k = dayKey(d);
          const list = pubs.get(k) ?? [];
          const ds = dots.get(k) ?? [];
          return (
            <div key={k}
              className={`mo-cell${d.getMonth() !== anchor.getMonth() ? " out" : ""}${k === today ? " today" : ""}${over === k ? " over" : ""}`}
              onClick={(e) => pick(e, d)}
              onDragOver={(e) => { e.preventDefault(); setOver(k); }}
              onDragLeave={() => setOver((o) => (o === k ? null : o))}
              onDrop={(e) => drop(e, d)}>
              <b className="disp n">{d.getDate()}</b>
              {!narrow && list.slice(0, 3).map((c) => (
                <button type="button" key={c.id} draggable className={`mo-pub${c.publishedAt ? " done" : ""}`}
                  onDragStart={(e) => e.dataTransfer.setData("text/plain", c.id)}
                  onClick={() => openSheet(c.id)}>
                  <span className="disp">{hhmm(parse(c.publishAt!))}</span>{c.title || "Sans titre"}
                </button>
              ))}
              {!narrow && list.length > 3 && <span className="mo-more disp">+{list.length - 3}</span>}
              {ds.length > 0 && (
                <span className="mo-dots" aria-hidden="true">
                  {ds.filter((x) => narrow || !x.pub).map((x) => <i key={x.k} className={`${x.pub ? "p" : ""}${x.done ? " on" : ""}`} />)}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
