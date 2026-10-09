"use client";

import { useEffect, useState } from "react";
import { Stepper } from "../ui";
import Rythme from "../Rythme";
import { duration } from "../lib";
import { FIELD_TYPES, STEPS, setFields, setProfile, setStructures, structure, uid, useData, type Content, type Field, type FieldType, type Structure } from "../store";

type Tab = "methode" | "scripts";

// Organisation : la façon de travailler. Onglet Méthode (temps par étape, rythme, fiche de contenu),
// onglet Scripts (structures). Chaque onglet a son adresse : /organisation#scripts ouvre directement les scripts.
export default function Organisation() {
  const d = useData()!;
  const p = d.profile;
  const [tab, setTab] = useState<Tab>("methode");
  useEffect(() => {
    const read = () => setTab(location.hash === "#scripts" ? "scripts" : "methode");
    read();
    window.addEventListener("hashchange", read);
    return () => window.removeEventListener("hashchange", read);
  }, []);
  const go = (t: Tab) => { setTab(t); history.replaceState(null, "", t === "scripts" ? "#scripts" : location.pathname); };

  return (
    <div className="page">
      <header className="page-head org-head">
        <h1>Organisation</h1>
        <div className="seg" role="tablist" aria-label="Organisation">
          <button role="tab" aria-selected={tab === "methode"} className={tab === "methode" ? "on" : ""} onClick={() => go("methode")}>Méthode</button>
          <button role="tab" aria-selected={tab === "scripts"} className={tab === "scripts" ? "on" : ""} onClick={() => go("scripts")}>Scripts</button>
        </div>
      </header>

      {tab === "methode" ? (
        <>
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
        </>
      ) : (
        <section className="box pf">
          <h2>Structures de script</h2>
          <StructureEditor list={d.structures} contents={d.contents} />
        </section>
      )}
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
            {(f.type === "choix" || f.type === "multi") && <Options f={f} put={(p) => put(f.id, p)} hint={f.id === fields.find((x) => x.type === "choix" || x.type === "multi")?.id} />}
          </li>
        ))}
      </ul>
      <div className="fe-add">
        {FIELD_TYPES.map((t) => <button type="button" key={t.type} onClick={() => add(t.type)}>+ {t.label}</button>)}
      </div>
    </>
  );
}

// Retirer une structure ou une partie déjà écrite demande une confirmation, avec le nombre de scripts touchés.
// Les textes restent dans les fiches (« Ancienne structure »), rien n'est effacé.
function StructureEditor({ list, contents }: { list: Structure[]; contents: Content[] }) {
  const [arm, setArm] = useState<string | null>(null);
  const put = (id: string, fn: (s: Structure) => Structure) => setStructures(list.map((s) => (s.id === id ? fn(s) : s)));
  const written = (ids: string[]) => contents.filter((c) => ids.some((k) => c.script?.parts[k]?.trim())).length;
  const scripts = (n: number) => (n ? `, ${n} script${n > 1 ? "s" : ""}` : "");
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
                  aria-label="Supprimer la structure">{arm === s.id ? `Supprimer${scripts(written(s.parts.map((p) => p.id)))}` : "×"}</button>
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
                    <button type="button" aria-label="Retirer la partie" className={arm === p.id ? "arm" : ""} onBlur={() => setArm(null)}
                      onClick={() => (arm === p.id || !written([p.id]) ? put(s.id, (x) => ({ ...x, parts: x.parts.filter((q) => q.id !== p.id) })) : setArm(p.id))}>
                      {arm === p.id ? `Retirer${scripts(written([p.id]))}` : "×"}
                    </button>
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

// Les choix d'un champ. Toucher un choix ouvre ses sous-choix : ce qui ne s'affichera
// dans la fiche que si ce choix-là est coché.
function Options({ f, put, hint }: { f: Field; put: (p: Partial<Field>) => void; hint: boolean }) {
  const [open, setOpen] = useState<string | null>(null);
  const sub = f.sub ?? {};
  const add = (e: React.KeyboardEvent<HTMLInputElement>, fn: (v: string) => void) => {
    const v = e.currentTarget.value.trim();
    if (e.key !== "Enter" || !v) return;
    e.preventDefault();
    fn(v);
    e.currentTarget.value = "";
  };
  const removeOpt = (o: string) => { const { [o]: _, ...rest } = sub; put({ options: f.options.filter((x) => x !== o), sub: rest }); if (open === o) setOpen(null); };

  return (
    <div className="fe-opts">
      {f.options.map((o) => (
        <span key={o} className={`opt${open === o ? " open" : ""}`}>
          <button type="button" className="opt-l" onClick={() => setOpen(open === o ? null : o)} aria-expanded={open === o}>
            {o}{sub[o]?.length ? <b className="disp">{sub[o].length}</b> : null}
          </button>
          <button type="button" onClick={() => removeOpt(o)} aria-label={`Retirer ${o}`}>×</button>
        </span>
      ))}
      <input className="opt-new" placeholder="Ajouter un choix" aria-label="Ajouter un choix"
        onKeyDown={(e) => add(e, (v) => { if (!f.options.includes(v)) put({ options: [...f.options, v] }); })} />
      {open && f.options.includes(open) && (
        <div className="fe-sub">
          <span className="lbl">Si « {open} » est choisi</span>
          <div className="fe-sub-l">
            {(sub[open] ?? []).map((so) => (
              <span key={so} className="opt">{so}
                <button type="button" onClick={() => put({ sub: { ...sub, [open]: sub[open].filter((x) => x !== so) } })} aria-label={`Retirer ${so}`}>×</button>
              </span>
            ))}
            <input className="opt-new" placeholder="Ajouter un sous-choix" aria-label="Ajouter un sous-choix" autoFocus
              onKeyDown={(e) => add(e, (v) => { if (!(sub[open] ?? []).includes(v)) put({ sub: { ...sub, [open]: [...(sub[open] ?? []), v] } }); })} />
          </div>
        </div>
      )}
      {hint && !open && f.options.length > 0 && <span className="fe-hint">Touche un choix pour lui donner des sous-choix.</span>}
    </div>
  );
}
