"use client";

import { useState } from "react";
import { Stepper } from "../ui";
import { cleanHandle, duration } from "../lib";
import { FIELD_TYPES, STEPS, setFields, setProfile, uid, useData, type Field, type FieldType } from "../store";

// Profil : le compte Instagram, la façon de travailler (durées, rythme) et la fiche de contenu.
export default function Profil() {
  const d = useData()!;
  const p = d.profile;
  const [handle, setHandle] = useState(p.handle);

  return (
    <div className="page">
      <header className="page-head"><h1>Profil</h1></header>

      <section className="box pf">
        <h2>Instagram</h2>
        <span className="at">
          <i>@</i>
          <input value={handle} onChange={(e) => setHandle(e.target.value.replace(/^@/, ""))} onBlur={() => { const h = cleanHandle(handle); setHandle(h); setProfile({ handle: h }); }}
            placeholder="pseudo" autoComplete="off" autoCapitalize="none" spellCheck={false} aria-label="Pseudo Instagram" />
        </span>
      </section>

      <section className="box pf">
        <h2>Temps par étape</h2>
        {STEPS.map(({ key, label }) => (
          <div className="pf-row" key={key}>
            <span>{label}</span>
            <Stepper label={label} value={p.durations[key]} min={5} max={480} step={5} format={duration}
              onChange={(n) => setProfile({ durations: { ...p.durations, [key]: n } })} />
          </div>
        ))}
      </section>

      <section className="box pf">
        <h2>Rythme</h2>
        <div className="pf-row">
          <span>Vidéos par semaine</span>
          <Stepper label="Vidéos par semaine" value={p.rythme} min={1} max={14} onChange={(rythme) => setProfile({ rythme })} />
        </div>
      </section>

      <section className="box pf" id="fiche">
        <h2>Fiche de contenu</h2>
        <FieldEditor fields={d.fields} />
      </section>
    </div>
  );
}

function FieldEditor({ fields }: { fields: Field[] }) {
  const [arm, setArm] = useState<string | null>(null);
  const put = (id: string, patch: Partial<Field>) => setFields(fields.map((f) => (f.id === id ? { ...f, ...patch } : f)));
  const swap = (i: number, j: number) => { const n = [...fields]; [n[i], n[j]] = [n[j], n[i]]; setFields(n); };
  const add = (type: FieldType) => setFields([...fields, { id: uid(), label: "", type, options: [] }]);

  return (
    <>
      <ul className="fe">
        <li className="fe-row fixed"><span className="fe-name">Titre</span><span className="muted">Texte court</span></li>
        {fields.map((f, i) => (
          <li className="fe-row" key={f.id}>
            <input className="inp fe-name" value={f.label} placeholder="Nom du champ" autoFocus={!f.label} onChange={(e) => put(f.id, { label: e.target.value })} aria-label="Nom du champ" />
            <select className="inp" value={f.type} onChange={(e) => put(f.id, { type: e.target.value as FieldType })} aria-label="Type">
              {FIELD_TYPES.map((t) => <option key={t.type} value={t.type}>{t.label}</option>)}
            </select>
            <span className="fe-act">
              <button type="button" onClick={() => swap(i, i - 1)} disabled={i === 0} aria-label="Monter">↑</button>
              <button type="button" onClick={() => swap(i, i + 1)} disabled={i === fields.length - 1} aria-label="Descendre">↓</button>
              <button type="button" className={arm === f.id ? "arm" : ""} onBlur={() => setArm(null)}
                onClick={() => (arm === f.id ? setFields(fields.filter((x) => x.id !== f.id)) : setArm(f.id))}
                aria-label="Supprimer le champ">{arm === f.id ? "Supprimer" : "×"}</button>
            </span>
            {(f.type === "choix" || f.type === "multi") && (
              <div className="fe-opts">
                {f.options.map((o) => (
                  <span key={o} className="opt">{o}<button type="button" onClick={() => put(f.id, { options: f.options.filter((x) => x !== o) })} aria-label={`Retirer ${o}`}>×</button></span>
                ))}
                <input className="opt-new" placeholder="Ajouter un choix" aria-label="Ajouter un choix"
                  onKeyDown={(e) => {
                    const v = e.currentTarget.value.trim();
                    if (e.key !== "Enter" || !v) return;
                    e.preventDefault();
                    if (!f.options.includes(v)) put(f.id, { options: [...f.options, v] });
                    e.currentTarget.value = "";
                  }} />
              </div>
            )}
          </li>
        ))}
      </ul>
      <div className="fe-add">
        {FIELD_TYPES.map((t) => <button type="button" key={t.type} onClick={() => add(t.type)}>+ {t.label}</button>)}
      </div>
    </>
  );
}
