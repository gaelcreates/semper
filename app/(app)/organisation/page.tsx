"use client";

import { useEffect, useState } from "react";
import DotIcon from "../../DotIcon";
import { Stepper } from "../ui";
import Rythme from "../Rythme";
import { duration } from "../lib";
import { FIELD_TYPES, STEPS, setFields, setProfile, setStructures, structure, uid, useData, type Content, type Field, type FieldType, type Structure } from "../store";
import { FIELD_TPLS, SCRIPT_TPLS, fieldAdded, fieldLabel, scriptAdded, type FieldTpl, type ScriptTpl } from "../templates";

type Tab = "methode" | "scripts" | "templates";
const TABS: { key: Tab; label: string }[] = [
  { key: "methode", label: "Méthode" },
  { key: "scripts", label: "Scripts" },
  { key: "templates", label: "Templates" },
];
const tabOf = (hash: string): Tab => (hash === "#scripts" ? "scripts" : hash === "#templates" ? "templates" : "methode");
const n2 = (i: number) => String(i + 1).padStart(2, "0");
const swapParts = (x: Structure, i: number, j: number) => { const n = [...x.parts]; [n[i], n[j]] = [n[j], n[i]]; return { ...x, parts: n }; };

// Organisation : la façon de travailler. Méthode (rythme, temps par étape, fiche de contenu), Scripts (structures),
// Templates (champs et scripts prêts à ajouter). Chaque onglet a son adresse : /organisation#templates ouvre la galerie.
export default function Organisation() {
  const d = useData()!;
  const p = d.profile;
  const [tab, setTab] = useState<Tab>("methode");
  useEffect(() => {
    const read = () => setTab(tabOf(location.hash));
    read();
    // « Personnaliser la fiche » mène ici : on descend jusqu'à la fiche, sous le rythme et les temps.
    if (location.hash === "#fiche") document.getElementById("fiche")?.scrollIntoView({ block: "start", behavior: "instant" });
    window.addEventListener("hashchange", read);
    return () => window.removeEventListener("hashchange", read);
  }, []);
  const go = (t: Tab) => { setTab(t); history.replaceState(null, "", t === "methode" ? location.pathname : `#${t}`); };

  return (
    <div className="page wide org">
      <header className="page-head org-head">
        <h1>Organisation</h1>
        <div className="seg" role="tablist" aria-label="Organisation">
          {TABS.map((t) => (
            <button key={t.key} role="tab" aria-selected={tab === t.key} className={tab === t.key ? "on" : ""} onClick={() => go(t.key)}>{t.label}</button>
          ))}
        </div>
      </header>

      {tab === "methode" && (
        <>
          <div className="org-two">
            <section className="box pf">
              <h2>Rythme</h2>
              <div className="org-row org-rythme">
                <span>Vidéos</span>
                <Rythme />
              </div>
            </section>
            <section className="box pf">
              <h2>Temps par étape</h2>
              <ul className="org-rows">
                {STEPS.map(({ key, label }) => (
                  <li className="org-row" key={key}>
                    <span>{label}</span>
                    <Stepper label={label} value={p.durations[key]} min={5} max={480} step={5} format={duration}
                      onChange={(n) => setProfile({ durations: { ...p.durations, [key]: n } })} />
                  </li>
                ))}
              </ul>
            </section>
          </div>

          <section className="box pf" id="fiche">
            <h2>Fiche de contenu</h2>
            <FieldEditor fields={d.fields} />
          </section>
        </>
      )}

      {tab === "scripts" && (
        <section className="box pf">
          <h2>Structures de script</h2>
          <StructureEditor list={d.structures} contents={d.contents} />
        </section>
      )}

      {tab === "templates" && <Templates fields={d.fields} structures={d.structures} />}
    </div>
  );
}

// Un bouton rond à icône : monter, descendre, retirer. Armé, il s'élargit et dit ce qu'il va faire.
function IconBtn({ icon, label, armed, ...rest }: { icon: "fleche" | "bas" | "croix"; label: string; armed?: string } & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button type="button" className={`ib${armed ? " arm" : ""}`} aria-label={label} {...rest}>
      {armed ?? <DotIcon name={icon} />}
    </button>
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
              <IconBtn icon="fleche" label="Monter" onClick={() => swap(i, i - 1)} disabled={i === 0} />
              <IconBtn icon="bas" label="Descendre" onClick={() => swap(i, i + 1)} disabled={i === fields.length - 1} />
              <IconBtn icon="croix" label="Supprimer le champ" armed={arm === f.id ? "Supprimer" : undefined} onBlur={() => setArm(null)}
                onClick={() => (arm === f.id ? setFields(fields.filter((x) => x.id !== f.id)) : setArm(f.id))} />
            </span>
            {(f.type === "choix" || f.type === "multi") && <Options f={f} put={(p) => put(f.id, p)} />}
          </li>
        ))}
      </ul>
      <div className="fe-add">
        {FIELD_TYPES.map((t) => <button type="button" key={t.type} onClick={() => add(t.type)}><DotIcon name="plus" />{t.label}</button>)}
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
                <IconBtn icon="croix" label="Supprimer la structure" armed={arm === s.id ? `Supprimer${scripts(written(s.parts.map((p) => p.id)))}` : undefined}
                  onBlur={() => setArm(null)} onClick={() => (arm === s.id ? setStructures(list.filter((x) => x.id !== s.id)) : setArm(s.id))} />
              </span>
            </div>
            <ol className="se-parts">
              {s.parts.map((p, i) => (
                <li key={p.id}>
                  <span className="disp">{n2(i)}</span>
                  <input className="inp" value={p.label} placeholder="Partie" aria-label={`Partie ${i + 1}`}
                    onChange={(e) => put(s.id, (x) => ({ ...x, parts: x.parts.map((q) => (q.id === p.id ? { ...q, label: e.target.value } : q)) }))} />
                  <span className="fe-act">
                    <IconBtn icon="fleche" label="Monter" disabled={i === 0} onClick={() => put(s.id, (x) => swapParts(x, i, i - 1))} />
                    <IconBtn icon="bas" label="Descendre" disabled={i === s.parts.length - 1} onClick={() => put(s.id, (x) => swapParts(x, i, i + 1))} />
                    <IconBtn icon="croix" label="Retirer la partie" armed={arm === p.id ? `Retirer${scripts(written([p.id]))}` : undefined} onBlur={() => setArm(null)}
                      onClick={() => (arm === p.id || !written([p.id]) ? put(s.id, (x) => ({ ...x, parts: x.parts.filter((q) => q.id !== p.id) })) : setArm(p.id))} />
                  </span>
                </li>
              ))}
            </ol>
            <input className="opt-new se-new" placeholder="Ajouter une partie" aria-label="Ajouter une partie"
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
        <button type="button" onClick={() => setStructures([...list, structure("", ["Hook"])])}><DotIcon name="plus" />Nouvelle structure</button>
      </div>
    </>
  );
}

// Les choix d'un champ. Toucher un choix ouvre ses sous-choix : ce qui ne s'affichera
// dans la fiche que si ce choix-là est coché.
function Options({ f, put }: { f: Field; put: (p: Partial<Field>) => void }) {
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
          <button type="button" className="opt-x" onClick={() => removeOpt(o)} aria-label={`Retirer ${o}`}><DotIcon name="croix" /></button>
        </span>
      ))}
      <input className="opt-new" placeholder="Ajouter un choix" aria-label="Ajouter un choix"
        onKeyDown={(e) => add(e, (v) => { if (!f.options.includes(v)) put({ options: [...f.options, v] }); })} />
      {open && f.options.includes(open) && (
        <div className="fe-sub">
          <span className="lbl">Si « {open} » est choisi</span>
          <div className="fe-sub-l">
            {(sub[open] ?? []).map((so) => (
              <span key={so} className="opt"><span className="opt-l">{so}</span>
                <button type="button" className="opt-x" onClick={() => put({ sub: { ...sub, [open]: sub[open].filter((x) => x !== so) } })} aria-label={`Retirer ${so}`}><DotIcon name="croix" /></button>
              </span>
            ))}
            <input className="opt-new" placeholder="Ajouter un sous-choix" aria-label="Ajouter un sous-choix" autoFocus
              onKeyDown={(e) => add(e, (v) => { if (!(sub[open] ?? []).includes(v)) put({ sub: { ...sub, [open]: [...(sub[open] ?? []), v] } }); })} />
          </div>
        </div>
      )}
    </div>
  );
}

// La galerie : des champs et des scripts prêts, ajoutés à la suite de ce qui existe. Rien n'est remplacé.
function Templates({ fields, structures }: { fields: Field[]; structures: Structure[] }) {
  const addField = (t: FieldTpl) =>
    setFields([...fields, { id: uid(), label: fieldLabel(t, fields), type: t.type, options: [...t.options], ...(t.sub ? { sub: structuredClone(t.sub) } : {}) }]);
  const addScript = (t: ScriptTpl) => setStructures([...structures, structure(t.name, t.parts)]);
  const type = (t: FieldType) => FIELD_TYPES.find((x) => x.type === t)!.label;

  return (
    <>
      <section className="tp-sec">
        <h2 className="tp-h">Champs</h2>
        <div className="tp-grid">
          {FIELD_TPLS.map((t) => (
            <Card key={t.name} name={t.name} meta={type(t.type)} done={fieldAdded(t, fields)} onAdd={() => addField(t)} wide={!!t.sub}>
              {t.sub ? (
                <div className="tp-groups">
                  {t.options.map((o) => (
                    <div className="tp-group" key={o}>
                      <i>{o}</i>
                      <div className="tp-pills">{(t.sub![o] ?? []).map((s) => <i key={s}>{s}</i>)}</div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="tp-pills">{t.options.map((o) => <i key={o}>{o}</i>)}</div>
              )}
            </Card>
          ))}
        </div>
      </section>

      <section className="tp-sec">
        <h2 className="tp-h">Scripts</h2>
        <div className="tp-grid">
          {SCRIPT_TPLS.map((t) => (
            <Card key={t.name} name={t.name} meta={`${t.parts.length} parties`} done={scriptAdded(t, structures)} onAdd={() => addScript(t)}>
              <ol className="tp-pills">{t.parts.map((p, i) => <li key={p}><span className="disp">{n2(i)}</span>{p}</li>)}</ol>
            </Card>
          ))}
        </div>
      </section>
    </>
  );
}

function Card({ name, meta, done, onAdd, wide = false, children }: { name: string; meta: string; done: boolean; onAdd: () => void; wide?: boolean; children: React.ReactNode }) {
  return (
    <article className={`tp-card${wide ? " wide" : ""}`}>
      <header>
        <span><h3>{name}</h3><span className="lbl">{meta}</span></span>
        <button type="button" className={`tp-add${done ? " done" : ""}`} onClick={onAdd} disabled={done}>
          {done ? "Ajouté" : <><DotIcon name="plus" />Ajouter</>}
        </button>
      </header>
      {children}
    </article>
  );
}
