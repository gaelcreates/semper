"use client";

import { useEffect, useState } from "react";
import DotIcon from "../../DotIcon";
import Week from "../Week";
import Month from "../Month";
import { Kanban, List } from "../Board";
import { FilterPill, useNarrow } from "../ui";
import { DAYS, MONTHS, MONTHS_SHORT, addDays, dayKey, isoWeek, startOfWeek } from "../lib";
import { STATUS, statusOf, useData, type Content } from "../store";

type View = "calendrier" | "kanban" | "liste";
type Span = "semaine" | "mois";

// Un choix d'affichage retenu d'une visite à l'autre.
function usePref<T extends string>(key: string, init: T) {
  const [v, setV] = useState<T>(init);
  useEffect(() => { try { const s = localStorage.getItem(key); if (s) setV(s as T); } catch {} }, [key]);
  return [v, (x: T) => { setV(x); try { localStorage.setItem(key, x); } catch {} }] as const;
}

export default function Calendrier() {
  const d = useData()!;
  const narrow = useNarrow();
  const [view, setView] = usePref<View>("semper:view", "calendrier");
  const [span, setSpan] = usePref<Span>("semper:span", "semaine");
  const [anchor, setAnchor] = useState(() => new Date());
  const [q, setQ] = useState("");
  const [statuses, setStatuses] = useState<string[]>([]);
  const [picks, setPicks] = useState<Record<string, string[]>>({});

  const choice = d.fields.filter((f) => f.type === "choix" || f.type === "multi");
  const match = (c: Content) => {
    if (statuses.length && !statuses.includes(statusOf(c))) return false;
    for (const [fid, sel] of Object.entries(picks)) {
      if (!sel.length) continue;
      const v = c.values[fid];
      if (!(Array.isArray(v) ? v : v ? [v] : []).some((x) => sel.includes(x))) return false;
    }
    const t = q.trim().toLowerCase();
    return !t || [c.title, ...Object.values(c.values).flat(), ...Object.values(c.script?.parts ?? {})].join(" ").toLowerCase().includes(t);
  };
  const list = d.contents.filter(match);

  const ws = startOfWeek(anchor);
  const cal = view === "calendrier";
  const week = cal && span === "semaine";
  const move = (n: number) => setAnchor(week ? addDays(anchor, 7 * n) : new Date(anchor.getFullYear(), anchor.getMonth() + n, 1));
  const days = week ? (narrow ? [new Date(anchor.getFullYear(), anchor.getMonth(), anchor.getDate())] : Array.from({ length: 7 }, (_, i) => addDays(ws, i))) : [];

  const we = addDays(ws, 6);
  const title = !cal ? "Contenus"
    : week ? `${ws.getDate()}${ws.getMonth() === we.getMonth() ? "" : ` ${MONTHS_SHORT[ws.getMonth()]}`} au ${we.getDate()} ${MONTHS_SHORT[we.getMonth()]}`
    : `${MONTHS[anchor.getMonth()][0].toUpperCase()}${MONTHS[anchor.getMonth()].slice(1)} ${anchor.getFullYear()}`;
  const active = statuses.length + Object.values(picks).reduce((a, s) => a + s.length, 0) + (q ? 1 : 0);

  return (
    <div className="pl">
      <header className="pl-head">
        <div className="pl-title">
          <small className="lbl">{week ? `Semaine ${isoWeek(ws)}` : cal ? String(anchor.getFullYear()) : `${list.length} sur ${d.contents.length}`}</small>
          <h1>{title}</h1>
        </div>
        <div className="pl-ctrl">
          {cal && (
            <div className="pl-nav">
              <button type="button" onClick={() => move(-1)} aria-label="Précédent">‹</button>
              <button type="button" className="today" onClick={() => setAnchor(new Date())}>Aujourd&apos;hui</button>
              <button type="button" onClick={() => move(1)} aria-label="Suivant">›</button>
            </div>
          )}
          {cal && (
            <div className="seg" role="tablist" aria-label="Période">
              {(["semaine", "mois"] as Span[]).map((s) => <button key={s} role="tab" aria-selected={span === s} className={span === s ? "on" : ""} onClick={() => setSpan(s)}>{s === "semaine" ? "Semaine" : "Mois"}</button>)}
            </div>
          )}
          <div className="seg" role="tablist" aria-label="Vue">
            {(["calendrier", "kanban", "liste"] as View[]).map((v) => <button key={v} role="tab" aria-selected={view === v} className={view === v ? "on" : ""} onClick={() => setView(v)}>{v[0].toUpperCase() + v.slice(1)}</button>)}
          </div>
        </div>
      </header>

      <div className="pl-filters">
        <label className="search"><DotIcon name="loupe" /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Rechercher" aria-label="Rechercher" /></label>
        <FilterPill label="Statut" options={STATUS} selected={statuses} onChange={setStatuses} />
        {choice.map((f) => (
          <FilterPill key={f.id} label={f.label} options={f.options.map((o) => ({ key: o, label: o }))}
            selected={picks[f.id] ?? []} onChange={(s) => setPicks({ ...picks, [f.id]: s })} />
        ))}
        {active > 0 && <button type="button" className="link fclear" onClick={() => { setQ(""); setStatuses([]); setPicks({}); }}>Tout effacer</button>}
      </div>

      {week && narrow && (
        <div className="strip">
          {Array.from({ length: 7 }, (_, i) => addDays(ws, i)).map((x) => {
            const k = dayKey(x);
            const n = list.filter((c) => c.publishAt?.startsWith(k)).length;
            return (
              <button key={k} type="button" className={`${k === dayKey(anchor) ? "on" : ""}${k === dayKey(new Date()) ? " today" : ""}`} onClick={() => setAnchor(x)}>
                <small className="lbl">{DAYS[weekday(x)].slice(0, 3)}</small><b className="disp">{x.getDate()}</b><i className={n ? "has" : ""} />
              </button>
            );
          })}
        </div>
      )}

      <div className="pl-body">
        {week && <Week contents={list} days={days} dur={d.profile.durations} />}
        {cal && span === "mois" && <Month contents={list} anchor={anchor} narrow={narrow} onDay={(x) => { setAnchor(x); setSpan("semaine"); }} />}
        {view === "kanban" && <Kanban contents={list} fields={d.fields} />}
        {view === "liste" && <List contents={list} fields={d.fields} />}
      </div>
    </div>
  );
}

const weekday = (d: Date) => (d.getDay() + 6) % 7;
