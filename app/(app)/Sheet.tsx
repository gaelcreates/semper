"use client";

import { useEffect, useState } from "react";
import { flushSync } from "react-dom";
import Link from "next/link";
import DotIcon from "../DotIcon";
import { duration } from "./lib";
import { constance, titleOf } from "./stats";
import {
  SEP, STATUS, STEPS, announce, deleteContent, movePublish, openSheet, patchContent, statusOf, subKey, useData, withStatus,
  type Content, type Field, type Structure, type Value,
} from "./store";

// La fiche d'un contenu, ouverte sur le côté. Tout s'enregistre à la frappe.
// Une fiche fermée sans titre disparaît : un clic de trop dans le calendrier ne laisse pas de trace.
export default function Sheet({ id }: { id: string }) {
  const d = useData()!;
  const c = d.contents.find((x) => x.id === id);
  const dur = d.profile.durations;
  const [full, setFull] = useState(() => { try { return localStorage.getItem("semper:full") === "1"; } catch { return false; } });
  // Le cadre se déforme d'un format à l'autre (View Transitions) ; sans cette API, le changement est direct.
  const toggleFull = () => {
    try { localStorage.setItem("semper:full", full ? "0" : "1"); } catch {}
    const doc = document as Document & { startViewTransition?: (cb: () => void) => unknown };
    if (doc.startViewTransition && !matchMedia("(prefers-reduced-motion: reduce)").matches) doc.startViewTransition(() => flushSync(() => setFull(!full)));
    else setFull(!full);
  };

  const close = () => {
    if (c && !c.title.trim()) deleteContent(id);
    openSheet(null);
  };

  useEffect(() => {
    if (!c) openSheet(null);
    const esc = (e: KeyboardEvent) => e.key === "Escape" && close();
    window.addEventListener("keydown", esc);
    return () => window.removeEventListener("keydown", esc);
  });

  if (!c) return null;
  const set = (fn: (c: Content) => Content) => patchContent(id, fn);
  const st = statusOf(c);
  const date = c.publishAt?.slice(0, 10) ?? "";
  const time = c.publishAt?.slice(11, 16) ?? "";

  // Marquer publié : si la semaine devient tenue, on l'annonce, et le nouveau titre s'il change.
  function publish() {
    if (c!.publishedAt) return set((c) => ({ ...c, publishedAt: null }));
    const next = withStatus(c!, "publie");
    const before = constance(d).streak;
    const after = constance({ ...d, contents: d.contents.map((x) => (x.id === id ? next : x)) }).streak;
    set(() => next);
    if (after > before) {
      const t = titleOf(after).title;
      announce(t !== titleOf(before).title ? `Nouveau titre : ${t}` : after > 1 ? `Semaine tenue · ${after} d'affilée` : "Semaine tenue", after);
    }
  }

  return (
    <div className="veil sheet-veil" onPointerDown={(e) => e.target === e.currentTarget && close()}>
      <aside className={`sheet${full ? " full" : ""}`} role="dialog" aria-label="Fiche de contenu">
        <header className="sheet-head">
          <span className={`chip st-${st}`}>{STATUS.find((s) => s.key === st)!.label}</span>
          <span className="sheet-tools">
            <button type="button" className="x grow" onClick={toggleFull} aria-label={full ? "Réduire" : "Plein écran"}><DotIcon name={full ? "reduire" : "agrandir"} /></button>
            <button type="button" className="x" onClick={close} aria-label="Fermer">×</button>
          </span>
        </header>

        <div className="sheet-body">
        <textarea className="sheet-title" rows={1} placeholder="Titre" value={c.title} autoFocus={!c.title} ref={fit}
          onChange={(e) => set((c) => ({ ...c, title: e.target.value.replace(/\n/g, " ") }))} />

        <div className="sheet-side">
        <section className="sheet-sec">
          <span className="lbl">Publication</span>
          <div className="sheet-when">
            <input type="date" value={date} aria-label="Jour"
              onChange={(e) => set((c) => movePublish(c, e.target.value ? `${e.target.value}T${time || "18:00"}` : null, dur))} />
            <input type="time" step={900} value={time} disabled={!date} aria-label="Heure"
              onChange={(e) => e.target.value && set((c) => movePublish(c, `${date}T${e.target.value}`, dur))} />
          </div>
          <button type="button" className={`pub-btn${c.publishedAt ? " on" : ""}`} onClick={publish}>
            {c.publishedAt ? <><DotIcon name="check" /> Publié</> : "Marquer publié"}
          </button>
        </section>

        <section className="sheet-sec">
          <span className="lbl">Étapes</span>
          <ul className="steps-l">
            {STEPS.map(({ key, label }) => {
              const s = c.steps[key];
              return (
                <li key={key} className={s.done ? "done" : ""}>
                  <button type="button" className="chk" aria-pressed={s.done} aria-label={`${label} faite`}
                    onClick={() => set((c) => ({ ...c, steps: { ...c.steps, [key]: { ...s, done: !s.done } } }))}>
                    {s.done && <DotIcon name="check" />}
                  </button>
                  <span className="st-name">{label}</span>
                  <span className="st-dur disp">{duration(dur[key])}</span>
                  <input type="datetime-local" step={900} value={s.at ?? ""} aria-label={`${label} : quand`}
                    onChange={(e) => set((c) => ({ ...c, steps: { ...c.steps, [key]: { ...s, at: e.target.value || null } } }))} />
                </li>
              );
            })}
          </ul>
        </section>
        </div>

        <div className="sheet-main">
          {d.fields.map((f) => (
            <section className="sheet-sec" key={f.id}>
              <span className="lbl">{f.label}</span>
              <FieldInput f={f} values={c.values} onChange={(patch) => set((c) => ({ ...c, values: { ...c.values, ...patch } }))} />
            </section>
          ))}
          <Script c={c} structures={d.structures} set={set} />
        </div>
        </div>

        <footer className="sheet-foot">
          <Link href="/organisation#fiche" className="link" onClick={close}>Personnaliser la fiche</Link>
          <button type="button" className="link danger" onClick={() => { deleteContent(id); openSheet(null); }}>Supprimer</button>
        </footer>
      </aside>
    </div>
  );
}

// Le script suit une structure choisie dans le profil : une zone par partie, numérotée.
function Script({ c, structures, set }: { c: Content; structures: Structure[]; set: (fn: (c: Content) => Content) => void }) {
  const sc = c.script ?? { structureId: null, parts: {} };
  const st = structures.find((s) => s.id === sc.structureId);
  return (
    <section className="sheet-sec">
      <span className="lbl">Script</span>
      <div className="opts">
        {structures.map((s) => (
          <button type="button" key={s.id} className={s.id === sc.structureId ? "on" : ""} aria-pressed={s.id === sc.structureId}
            onClick={() => set((c) => ({ ...c, script: { ...sc, structureId: s.id === sc.structureId ? null : s.id } }))}>{s.name}</button>
        ))}
      </div>
      {st && (
        <ol className="parts">
          {st.parts.map((p, i) => (
            <li key={p.id}>
              <span className="disp">{String(i + 1).padStart(2, "0")}</span>
              <label>
                <span>{p.label}</span>
                <textarea className="inp long" rows={2} value={sc.parts[p.id] ?? ""}
                  onChange={(e) => set((c) => ({ ...c, script: { ...sc, parts: { ...sc.parts, [p.id]: e.target.value } } }))} />
              </label>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

// Le titre grandit avec son texte.
function fit(t: HTMLTextAreaElement | null) {
  if (!t) return;
  t.style.height = "auto";
  t.style.height = `${t.scrollHeight}px`;
}

function FieldInput({ f, values, onChange }: { f: Field; values: Record<string, Value>; onChange: (patch: Record<string, Value>) => void }) {
  const v = values[f.id];
  if (f.type === "texte") return <input className="inp" value={(v as string) ?? ""} onChange={(e) => onChange({ [f.id]: e.target.value })} />;
  if (f.type === "long") return <textarea className="inp long" rows={4} value={(v as string) ?? ""} onChange={(e) => onChange({ [f.id]: e.target.value })} />;
  const one = f.type === "choix";
  const sel = Array.isArray(v) ? v : v ? [v] : [];
  const sk = subKey(f);
  const subs = Array.isArray(values[sk]) ? (values[sk] as string[]) : values[sk] ? [values[sk] as string] : [];
  // Changer de choix retire les sous-choix qui ne lui appartiennent plus.
  const keep = (opts: string[]) => subs.filter((x) => opts.some((o) => x.startsWith(o + SEP)));
  const pick = (o: string) => {
    const next = one ? (sel[0] === o ? [] : [o]) : sel.includes(o) ? sel.filter((x) => x !== o) : [...sel, o];
    const k = keep(next);
    onChange({ [f.id]: one ? next[0] ?? "" : next, [sk]: one ? k[0] ?? "" : k });
  };
  const pickSub = (key: string) =>
    onChange({ [sk]: one ? (subs[0] === key ? "" : key) : subs.includes(key) ? subs.filter((x) => x !== key) : [...subs, key] });

  return (
    <>
      <div className="opts">
        {f.options.map((o) => (
          <button type="button" key={o} className={sel.includes(o) ? "on" : ""} aria-pressed={sel.includes(o)} onClick={() => pick(o)}>
            {o}{f.sub?.[o]?.length ? <i className="has-sub" aria-hidden="true" /> : null}
          </button>
        ))}
      </div>
      {sel.filter((o) => f.sub?.[o]?.length).map((o) => (
        <div className="subopts" key={o}>
          <span className="lbl">{o}</span>
          <div className="opts">
            {f.sub![o].map((so) => {
              const key = o + SEP + so;
              return <button type="button" key={key} className={subs.includes(key) ? "on" : ""} aria-pressed={subs.includes(key)} onClick={() => pickSub(key)}>{so}</button>;
            })}
          </div>
        </div>
      ))}
    </>
  );
}
