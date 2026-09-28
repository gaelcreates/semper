"use client";

import { useState } from "react";
import { Stepper } from "../ui";
import Rythme from "../Rythme";
import { cleanHandle, duration } from "../lib";
import { FIELD_TYPES, STEPS, setFields, setProfile, setStructures, signOut, structure, uid, useData, type Field, type FieldType, type Structure } from "../store";


// Profil : le compte Instagram, la façon de travailler (durées, rythme) et la fiche de contenu.
export default function Profil() {
  const d = useData()!;
  const p = d.profile;
  const [handle, setHandle] = useState(p.handle);
  const [name, setName] = useState(p.firstName);

  return (
    <div className="page">
      <header className="page-head"><h1>Profil</h1></header>

      <section className="box pf">
        <h2>Compte</h2>
        <input className="inp big" value={name} onChange={(e) => setName(e.target.value)} onBlur={() => setProfile({ firstName: name.trim() })} placeholder="Prénom" aria-label="Prénom" />
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
          <Rythme />
        </div>
      </section>

      <section className="box pf" id="fiche">
        <h2>Fiche de contenu</h2>
        <FieldEditor fields={d.fields} />
      </section>

      <section className="box pf" id="structures">
        <h2>Structures de script</h2>
        <StructureEditor list={d.structures} />
      </section>

      <button type="button" className="link out" onClick={signOut}>Se déconnecter</button>
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

function StructureEditor({ list }: { list: Structure[] }) {
  const [arm, setArm] = useState<string | null>(null);
  const put = (id: string, fn: (s: Structure) => Structure) => setStructures(list.map((s) => (s.id === id ? fn(s) : s)));
  return (
    <>
      <div className="se">
        {list.map((s) => (
          <div className="se-card" key={s.id}>
            <div className="se-head">
              <input className="inp fe-name" value={s.name} placeholder="Nom de la structure" autoFocus={!s.name}
                onChange={(e) => put(s.id, (x) => ({ ...x, name: e.target.value }))} aria-label="Nom de la structure" />
              <span className="fe-act">
                <button type="button" className={arm === s.id ? "arm" : ""} onBlur={() => setArm(null)}
                  onClick={() => (arm === s.id ? setStructures(list.filter((x) => x.id !== s.id)) : setArm(s.id))}
                  aria-label="Supprimer la structure">{arm === s.id ? "Supprimer" : "×"}</button>
              </span>
            </div>
            <ol className="se-parts">
              {s.parts.map((p, i) => (
                <li key={p.id}>
                  <span className="disp">{String(i + 1).padStart(2, "0")}</span>
                  <input className="inp" value={p.label} placeholder="Partie" aria-label={`Partie ${i + 1}`}
                    onChange={(e) => put(s.id, (x) => ({ ...x, parts: x.parts.map((q) => (q.id === p.id ? { ...q, label: e.target.value } : q)) }))} />
                  <span className="fe-act">
                    <button type="button" disabled={i === 0} aria-label="Monter"
                      onClick={() => put(s.id, (x) => { const n = [...x.parts]; [n[i - 1], n[i]] = [n[i], n[i - 1]]; return { ...x, parts: n }; })}>↑</button>
                    <button type="button" aria-label="Retirer la partie"
                      onClick={() => put(s.id, (x) => ({ ...x, parts: x.parts.filter((q) => q.id !== p.id) }))}>×</button>
                  </span>
                </li>
              ))}
            </ol>
            <input className="opt-new" placeholder="Ajouter une partie" aria-label="Ajouter une partie"
              onKeyDown={(e) => {
                const v = e.currentTarget.value.trim();
                if (e.key !== "Enter" || !v) return;
                e.preventDefault();
                put(s.id, (x) => ({ ...x, parts: [...x.parts, { id: uid(), label: v }] }));
                e.currentTarget.value = "";
              }} />
          </div>
        ))}
      </div>
      <div className="fe-add">
        <button type="button" onClick={() => setStructures([...list, structure("", ["Hook"])])}>+ Nouvelle structure</button>
      </div>
    </>
  );
}
