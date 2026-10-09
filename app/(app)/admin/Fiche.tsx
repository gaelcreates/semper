"use client";

import { Fragment, useEffect, useImperativeHandle, useMemo, useRef, useState, type Ref } from "react";
import DotIcon from "../../DotIcon";
import { announce } from "../store";
import { answer, KINDS, TEMPS, type Score } from "./score";
import { draft as makeDraft, HOLE, pickTpl, TPLS, type Tpl } from "./dm";
import {
  DELAI, LEAD_STATUS, NEXT, ago, igHandle, inDays, name, num, readEvents, relancesOf, stageLabel, suite, today, when,
  type Ev, type Gesture, type Lead, type LeadStatus, type NextAction, type Ops, type Person, type Raw, type Team,
} from "./model";

// La fiche d'une personne : l'action en haut (étape, suite, DM), le brouillon, ce qu'elle veut, ses chiffres, l'historique.

export type FicheApi = { dm: () => void; envoye: () => void; reponse: () => void; suite: () => void; fin: () => void };

const ICON: Record<Ev["kind"], Parameters<typeof DotIcon>[0]["name"]> = {
  etape: "fleche", dm: "insta", relance: "serie", reponse: "check", appel: "cal", note: "script",
};
const QUICK: [string, number][] = [["Aujourd'hui", 0], ["Demain", 1], ["+3 j", 3], ["+1 sem", 7]];
const ANSWERS: [string, string][] = [["frequence", "Publie"], ["usage", "Attend de Semper"], ["source", "Connu par"], ["abonnes", "Abonnés déclarés"]];

export function Face({ p, size }: { p: Raw; size: number }) {
  return (
    <span className="avatar" style={{ width: size, height: size, fontSize: size * 0.42 }} aria-hidden="true">
      {p.avatar_url ? <img src={p.avatar_url} alt="" width={size} height={size} referrerPolicy="no-referrer" /> : name(p).charAt(0).toUpperCase()}
    </span>
  );
}

// Le score : carré plein si Chaud, contour si Tiède, chiffre gris si Froid.
export function Mark({ c }: { c: Score }) {
  return <b className={`disp cr-mark ${c.temp}`} title={TEMPS.find((t) => t.key === c.temp)?.label}>{c.score}</b>;
}

// Copie dans le presse-papier ; l'ancienne méthode prend le relais quand le navigateur refuse la nouvelle.
async function copy(s: string) {
  try {
    await navigator.clipboard.writeText(s);
    return true;
  } catch {
    const back = document.activeElement as HTMLElement | null;
    const t = Object.assign(document.createElement("textarea"), { value: s });
    t.style.cssText = "position:fixed;opacity:0";
    document.body.append(t);
    t.select();
    const ok = document.execCommand("copy");
    t.remove();
    back?.focus({ preventScroll: true });
    return ok;
  }
}

export default function Fiche({ p, team, me, ops, tick, close, ref }: {
  p: Person; team: Team[]; me: { id: string; name: string }; ops: Ops; tick: number; close: () => void; ref?: Ref<FicheApi>;
}) {
  const box = useRef<HTMLElement>(null);
  const area = useRef<HTMLTextAreaElement>(null);
  const link = useRef<HTMLAnchorElement>(null);
  const [events, setEvents] = useState<Ev[] | null>(null);
  const [ask, setAsk] = useState<"envoye" | "relance" | "appel" | "cale" | null>(null);
  const [day, setDay] = useState(inDays(1));
  const [open, setOpen] = useState(false);
  const [tpl, setTpl] = useState<Tpl | null>(null);
  const [text, setText] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const h = igHandle(p.handle);
  const ig = p.c.ig;

  // Le focus entre dans la fiche (et la suit quand J/K change de personne).
  useEffect(() => { box.current?.focus({ preventScroll: true }); }, []);

  // L'historique se relit à chaque changement de la ligne (geste, étape, autre admin) et à chaque rechargement.
  useEffect(() => {
    let live = true;
    readEvents(p.user_id).then((e) => { if (live && e) setEvents(e); });
    return () => { live = false; };
  }, [p.user_id, p.status, p.stage_at, p.last_contact_at, p.next_action_at, tick]);

  // Une note tapée mais pas encore enregistrée part quand la fiche se ferme ou change de personne (Échap compris).
  const keep = useRef({ note, ops, id: p.user_id });
  useEffect(() => { keep.current = { note, ops, id: p.user_id }; });
  useEffect(() => () => {
    const k = keep.current;
    if (k.note.trim()) void k.ops.note(k.id, k.note.trim());
  }, []);

  // Les relances déjà envoyées depuis le dernier DM ou la dernière réponse (choix du gabarit).
  const relances = useMemo(() => relancesOf(events ?? []), [events]);
  const t = tpl ?? pickTpl(p.status, relances);
  const body = text ?? makeDraft(t, p, me.name);

  // Un crochet reste à remplir : on le sélectionne au lieu de copier.
  function hole() {
    const m = HOLE.exec(body);
    if (!m) return false;
    announce("Remplis le crochet.");
    area.current?.focus();
    area.current?.setSelectionRange(m.index, m.index + m[0].length);
    return true;
  }
  async function copyDraft() {
    if (hole()) return;
    announce((await copy(body)) ? "Copié." : "Copie impossible.");
  }
  // Un vrai lien (Instagram ou e-mail) : le navigateur et l'app Mac l'ouvrent. La copie part au même clic.
  const href = h ? `https://ig.me/m/${h}` : `mailto:${p.email}?subject=Semper&body=${encodeURIComponent(body)}`;
  function dm(e: React.MouseEvent) {
    if (hole()) return e.preventDefault();
    void copy(body).then((ok) => { if (!ok) announce("Copie impossible."); });
    setAsk("envoye");
  }

  const run = (g: Gesture, o?: { body?: string; date?: string; last?: boolean }) => ops.gesture(p, g, o);
  async function relance() {
    if ((await ops.relance(p)) === "fin") setAsk("relance");
  }
  // « Envoyé ? Oui » et la touche E : le premier DM, une relance, ou un message de plus dans la discussion.
  async function sent(b = body) {
    setAsk(null);
    const r = await ops.sent(p, b);
    if (r === "fin") setAsk("relance");
    if (!r) return;
    setText(null);
    setTpl(null);
  }
  async function appelFait() {
    if (await run("appelFait")) setAsk("appel");
  }
  async function addNote() {
    const b = note.trim();
    if (!b) return;
    setNote("");
    const ev = await ops.note(p.user_id, b);
    if (ev) setEvents((e) => [ev, ...(e ?? [])]);
    else setNote(b);
  }
  const fallback: NextAction = p.status === "contacte" ? "relancer" : p.status === "appel" ? "appel" : "ecrire";
  const setNext = (patch: Partial<Lead>) => ops.save(p.user_id, patch);

  useImperativeHandle(ref, () => ({
    dm: () => link.current?.click(),
    // Le brouillon n'est enregistré comme message que s'il vient d'être ouvert par « Écrire ».
    envoye: () => void sent(ask === "envoye" ? body : ""),
    reponse: () => void run("reponse"),
    suite: () => {
      setOpen(true);
      setTimeout(() => box.current?.querySelector<HTMLElement>(".cr-suite-pick button")?.focus());
    },
    fin: () => setAsk("relance"),
  }));

  const gestures: Partial<Record<LeadStatus, [string, () => void][]>> = {
    verifier: [["Envoyé", () => run("envoye")]],
    qualifie: [["Envoyé", () => run("envoye")]],
    contacte: [["Relancé", () => relance()], ["A répondu", () => run("reponse")]],
    discussion: [["Appel calé", () => setAsk("cale")], ["Relancé", () => relance()]],
    appel: [["Appel fait", appelFait]],
  };
  const s = suite(p);
  const who = (id: string | null) => (id === me.id ? "Moi" : team.find((x) => x.user_id === id)?.first_name ?? "");
  const title = (e: Ev) =>
    e.kind === "etape" ? (e.from_status ? `${stageLabel(e.from_status)} → ${stageLabel(e.to_status)}` : stageLabel(e.to_status))
    : e.kind === "dm" ? "DM envoyé" : e.kind === "relance" ? "Relancé" : e.kind === "reponse" ? "A répondu" : e.kind === "appel" ? "Appel fait" : "";

  return (
    <>
      <div className="cr-veil" onClick={close} />
      <aside className="cr-fiche" ref={box} tabIndex={-1} aria-label={`Fiche de ${name(p)}`}>
        <header className="cr-fh">
          <Face p={p} size={56} />
          <span className="cr-fh-id">
            <h2>{name(p)}</h2>
            {h && <a className="link" href={`https://www.instagram.com/${h}/`} target="_blank" rel="noreferrer">@{h}</a>}
            <button type="button" className="cr-mail" onClick={async () => announce((await copy(p.email)) ? "E-mail copié." : "Copie impossible.")}>{p.email}</button>
          </span>
          <Mark c={p.c} />
          <button type="button" className="x" onClick={close} aria-label="Fermer">×</button>
        </header>

        <section className="cr-act">
          <div className="cr-act-row">
            <select className="inp" value={p.status} onChange={(e) => ops.stage(p.user_id, e.target.value as LeadStatus)} aria-label="Étape">
              {LEAD_STATUS.map((l, i) => <option key={l.key} value={l.key}>{i + 1} · {l.label}</option>)}
            </select>
            {team.length > 1 && (
              <select className="inp cr-owner" value={p.owner ?? ""} onChange={(e) => ops.save(p.user_id, { owner: e.target.value || null })} aria-label="Responsable">
                <option value="">–</option>
                {team.map((x) => <option key={x.user_id} value={x.user_id}>{x.user_id === me.id ? "Moi" : x.first_name || x.email}</option>)}
              </select>
            )}
            <a ref={link} className="btn btn-sm cr-dm" href={href} target={h ? "_blank" : undefined} rel="noreferrer" onClick={dm}>{h ? "Écrire en DM" : "Écrire un e-mail"}</a>
          </div>

          <div className="cr-suite">
            <button type="button" className={`cr-suite-now${s?.late ? " cr-late" : ""}`} onClick={() => setOpen(!open)} aria-expanded={open}>
              <span className="lbl">Suite</span><span>{s ? s.text : p.status === "client" ? `${num(p.amount ?? 0)} CHF` : "Aucune"}</span>
            </button>
            {open && (
              <div className="cr-suite-pick">
                <div className="seg">
                  {NEXT.map((n) => (
                    <button type="button" key={n.key} className={p.next_action === n.key ? "on" : ""}
                      onClick={() => setNext({ next_action: n.key, next_action_at: p.next_action_at ?? today() })}>{n.label}</button>
                  ))}
                </div>
                <div className="seg">
                  {QUICK.map(([l, d]) => (
                    <button type="button" key={l} className={p.next_action_at === inDays(d) ? "on" : ""}
                      onClick={() => setNext({ next_action: p.next_action ?? fallback, next_action_at: inDays(d) })}>{l}</button>
                  ))}
                  <button type="button" className={!p.next_action_at ? "on" : ""} onClick={() => setNext({ next_action: null, next_action_at: null })}>Aucune</button>
                </div>
                <input type="date" className="inp cr-date" value={p.next_action_at ?? ""} aria-label="Date de la suite"
                  onChange={(e) => e.target.value && setNext({ next_action: p.next_action ?? fallback, next_action_at: e.target.value })} />
              </div>
            )}
          </div>

          {!!gestures[p.status]?.length && (
            <div className="cr-gest">
              {gestures[p.status]!.map(([l, f]) => <button type="button" key={l} className="cr-chip" onClick={f}>{l}</button>)}
            </div>
          )}

          {ask && (
            <div className="cr-ask-in" role="group">
              {ask === "envoye" && (<><span>Envoyé ?</span><button type="button" className="cr-chip on" onClick={() => sent()}>Oui</button><button type="button" className="cr-chip" onClick={() => setAsk(null)}>Non</button></>)}
              {ask === "relance" && (<>
                <button type="button" className="cr-chip" onClick={() => { setAsk(null); ops.save(p.user_id, { status: "non", lost_reason: "silence", next_action: null, next_action_at: null }); }}>Pas pour nous · Silence</button>
                <button type="button" className="cr-chip" onClick={() => { setAsk(null); run("plusTard"); }}>Plus tard</button>
              </>)}
              {ask === "appel" && (<>
                <button type="button" className="cr-chip" onClick={() => { setAsk(null); ops.stage(p.user_id, "client"); }}>Client</button>
                <button type="button" className="cr-chip" onClick={() => { setAsk(null); ops.stage(p.user_id, "non"); }}>Pas pour nous</button>
                <button type="button" className="cr-chip" onClick={() => { setAsk(null); setNext({ next_action: "relancer", next_action_at: inDays(DELAI.apresAppel) }); }}>Relancer</button>
              </>)}
              {ask === "cale" && (<>
                <input type="date" className="inp cr-date" value={day} min={today()} onChange={(e) => setDay(e.target.value)} aria-label="Date de l'appel" />
                <button type="button" className="cr-chip on" disabled={!day} onClick={async () => { if (await run("appelCale", { date: day })) setAsk(null); }}>OK</button>
              </>)}
            </div>
          )}
        </section>

        <section className="cr-sec">
          <div className="cr-sec-h">
            <h3 className="lbl">Brouillon</h3>
            <select className="inp cr-tpl" value={t} onChange={(e) => { setTpl(e.target.value as Tpl); setText(null); }} aria-label="Gabarit">
              {TPLS.map((x) => <option key={x.key} value={x.key}>{x.label}</option>)}
            </select>
            <button type="button" className="btn btn-ghost btn-sm" onClick={copyDraft}>Copier</button>
          </div>
          <textarea ref={area} className="inp long cr-draft" value={body} onChange={(e) => setText(e.target.value)} aria-label="Brouillon" />
        </section>

        <section className="cr-sec">
          <h3 className="lbl">Ce qu&apos;elle veut</h3>
          <dl className="cr-dl">
            <dt>Objectif</dt><dd><b>{answer(p.answers, "objectif") || "–"}</b></dd>
            <dt>Bloqué par</dt><dd>{answer(p.answers, "blocage") || "–"}</dd>
            <dt>A investi</dt><dd>{answer(p.answers, "investi") || "–"}</dd>
            <dt>Crée pour</dt><dd>{answer(p.answers, "pourquoi") || "–"}</dd>
          </dl>
        </section>

        <section className="cr-sec">
          <h3 className="lbl">Instagram</h3>
          {ig ? (
            <>
              <div className="cr-ig">
                <span><b className="disp">{num(ig.followers)}</b><small>abonnés{ig.growth != null && ` · ${ig.growth >= 0 ? "+" : ""}${num(ig.growth)} en 4 sem.`}</small></span>
                <span><b className="disp">{ig.perWeek.toLocaleString("fr-CH")}</b><small>par semaine</small></span>
                <span><b className="disp">{num(ig.views)}</b><small>vues moy.</small></span>
              </div>
              {ig.posts.length > 0 && (
                <ul className="cr-posts">
                  {ig.posts.slice(0, 3).map((x) => (
                    <li key={x.t}>
                      <a href={/^https:\/\//.test(x.link) ? x.link : undefined} target="_blank" rel="noreferrer">
                        {x.img && /^https:\/\//.test(x.img) ? <img src={x.img} alt="" width={56} height={56} referrerPolicy="no-referrer" /> : <span className="cr-thumb" />}
                        <span><small className="muted">{ago(x.t)}</small><span className="cr-clip">{x.caption || "–"}</span></span>
                      </a>
                    </li>
                  ))}
                </ul>
              )}
            </>
          ) : <p className="muted">Pas de relevé</p>}
        </section>

        <section className="cr-sec">
          <h3 className="lbl">Dans Semper</h3>
          <dl className="cr-dl">
            <dt>Inscription</dt><dd>{ago(p.created_at)}</dd>
            <dt>Dernière visite</dt><dd>{ago(p.last_active)}</dd>
            <dt>Rythme visé</dt><dd>{p.rythme} par semaine</dd>
            <dt>Semaines tenues</dt><dd>{p.weeks_held_4} sur 4</dd>
            <dt>Contenus</dt><dd>{p.contents_planned} planifié{p.contents_planned > 1 ? "s" : ""} · {p.contents_published} publié{p.contents_published > 1 ? "s" : ""}</dd>
          </dl>
        </section>

        <section className="cr-sec">
          <h3 className="lbl">Historique</h3>
          <textarea className="inp cr-note" rows={1} value={note} placeholder="Ajouter une note" aria-label="Ajouter une note"
            onChange={(e) => setNote(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); void addNote(); } }} />
          <ol className="cr-hist">
            {p.note && <li className="pin"><DotIcon name="script" /><span><p>{p.note}</p></span></li>}
            {events?.map((e) => (
              <li key={e.id} className={e.kind}>
                <DotIcon name={ICON[e.kind]} />
                <span>
                  {title(e) && <b>{title(e)}</b>}
                  {e.body && <p>{e.body}</p>}
                </span>
                <small className="muted">{[who(e.author), when(e.at)].filter(Boolean).join(" · ")}</small>
              </li>
            ))}
          </ol>
        </section>

        <details className="cr-more">
          <summary className="lbl">Pourquoi ce score</summary>
          <ul className="cr-why">
            {p.c.why.map((w) => <li key={w.label}><span>{w.label}</span><b className="disp">{w.pts > 0 ? "+" : ""}{w.pts}</b></li>)}
          </ul>
        </details>
        <details className="cr-more">
          <summary className="lbl">Toutes ses réponses</summary>
          <dl className="cr-dl">
            {ANSWERS.map(([k, l]) => <Fragment key={k}><dt>{l}</dt><dd>{answer(p.answers, k) || "–"}</dd></Fragment>)}
            <dt>Profil</dt><dd>{KINDS[p.c.kind]}</dd>
          </dl>
        </details>
      </aside>
    </>
  );
}
