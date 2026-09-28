"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import DotIcon from "../DotIcon";
import { duration } from "./lib";
import { constance, titleOf } from "./stats";
import {
  STATUS, STEPS, announce, deleteContent, movePublish, openSheet, patchContent, statusOf, useData, withStatus,
  type Content, type Field, type Structure, type Value,
} from "./store";

// La fiche d'un contenu, ouverte sur le côté. Tout s'enregistre à la frappe.
// Une fiche fermée sans titre disparaît : un clic de trop dans le calendrier ne laisse pas de trace.
export default function Sheet({ id }: { id: string }) {
  const d = useData()!;
  const c = d.contents.find((x) => x.id === id);
  const dur = d.profile.durations;
  const [full, setFull] = useState(() => { try { return localStorage.getItem("semper:full") === "1"; } catch { return false; } });
  const toggleFull = () => { setFull(!full); try { localStorage.setItem("semper:full", full ? "0" : "1"); } catch {} };

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
              <FieldInput f={f} v={c.values[f.id]} onChange={(v) => set((c) => ({ ...c, values: { ...c.values, [f.id]: v } }))} />
            </section>
          ))}
          <Script c={c} structures={d.structures} set={set} />
        </div>
        </div>

        <footer className="sheet-foot">
          <Link href="/profil#fiche" className="link" onClick={close}>Personnaliser la fiche</Link>
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

function FieldInput({ f, v, onChange }: { f: Field; v: Value | undefined; onChange: (v: Value) => void }) {
  if (f.type === "texte") return <input className="inp" value={(v as string) ?? ""} onChange={(e) => onChange(e.target.value)} />;
  if (f.type === "long") return <textarea className="inp long" rows={4} value={(v as string) ?? ""} onChange={(e) => onChange(e.target.value)} />;
  const sel = Array.isArray(v) ? v : v ? [v] : [];
  const pick = (o: string) =>
    f.type === "choix"
      ? onChange(sel[0] === o ? "" : o)
      : onChange(sel.includes(o) ? sel.filter((x) => x !== o) : [...sel, o]);
  return (
    <div className="opts">
      {f.options.map((o) => (
        <button type="button" key={o} className={sel.includes(o) ? "on" : ""} aria-pressed={sel.includes(o)} onClick={() => pick(o)}>{o}</button>
      ))}
    </div>
  );
}
