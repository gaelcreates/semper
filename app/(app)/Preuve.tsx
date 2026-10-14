"use client";

import { useEffect, useState } from "react";
import DotIcon from "../DotIcon";
import { DAYS, MONTHS_SHORT, addDays, dayKey, parse } from "./lib";
import { candidate, proofOf, today, type IgPost, type Proof } from "./jour";
import { announce, applyRows, movePublish, openSheet, patchContent, setIg, useData, withStatus, type Content } from "./store";
import { igLink, igSync } from "./actions";
import { sb } from "../supabase";

// Une vidéo du calendrier et sa preuve de publication : vérifiée, à confirmer, non validée.
// Ce qu'on peut faire est sur la ligne : relier un post (même si la date ne colle pas), dire qu'elle n'est pas sortie.

const token = async () => (await sb().auth.getSession()).data.session?.access_token ?? "";
const day = (k: string) => { const d = parse(k); return `${DAYS[(d.getDay() + 6) % 7]} ${d.getDate()} ${MONTHS_SHORT[d.getMonth()]}`; };
// Fin de phrase après une date abrégée (« 8 oct. ») : pas de second point.
const dot = (t: string) => (t.endsWith(".") ? t : `${t}.`);
export function gap(planned: string, real: string) {
  const n = Math.round((parse(real.slice(0, 10)).getTime() - parse(planned.slice(0, 10)).getTime()) / 864e5);
  return n === 1 ? "un jour après" : n === -1 ? "un jour avant" : n > 0 ? `${n} jours après` : `${-n} jours avant`;
}

const CHIP: Record<Proof, [string, string]> = {
  ok: ["Vérifiée", "ok"], late: ["Reliée", "late"], today: ["Aujourd'hui", "today"], propose: ["À confirmer", "warn"], miss: ["Non validée", "miss"],
  decl: ["Déclarée", ""], nonv: ["Non vérifiée", ""], prevu: ["Prévue", ""], idee: ["Idée", ""],
};

export function ProofChip({ p }: { p: Proof }) {
  const [t, k] = CHIP[p];
  return <span className={`pf-chip${k ? ` ${k}` : ""}`}>{p === "ok" && <DotIcon name="check" />}{t}</span>;
}

// Relevé à la demande. Dit le résultat en une phrase.
export async function checkNow(c?: Content) {
  const r = await igSync(await token());
  if (r.link) setIg(r.link);
  if (r.rows?.length) applyRows(r.rows);
  if (r.state === "later") return announce("Déjà vérifié plusieurs fois cette heure. Réessaie plus tard.");
  if (r.state === "off") return announce("La vérification n'est pas encore ouverte.");
  if (r.state === "absent") return announce("Instagram ne répond pas pour ce compte. Réessaie plus tard.");
  if (c && r.rows?.some((x) => x.id === c.id)) return announce(`« ${c.title || "Sans titre"} » est vérifiée.`);
  if (c) announce("Pas encore trouvée. Si tu viens de publier, Instagram met parfois quelques minutes.");
}

export default function ProofRow({ c, compact = false }: { c: Content; compact?: boolean }) {
  const d = useData()!;
  const [busy, setBusy] = useState(false);
  const [modal, setModal] = useState<"pick" | "skip" | null>(null);
  const k = today();
  const p = proofOf(c, d.ig, d.contents, k);
  const cand = p === "propose" ? candidate(c, d.ig, d.contents, k) : null;
  const post = c.igPost ?? cand;
  const at = c.publishAt ?? "";

  const run = async (f: () => Promise<unknown>) => { setBusy(true); try { await f(); } finally { setBusy(false); } };
  const link = (x: IgPost) => run(async () => {
    const row = await igLink(await token(), c.id, x.id);
    if (!row) return announce("Pas relié. Réessaie.");
    applyRows([row]);
    announce(x.at.slice(0, 10) === at.slice(0, 10) ? `« ${c.title || "Sans titre"} » est vérifiée.` : "Reliée. Elle compte pour ta semaine et tes trophées.");
  });

  let sub = "";
  let act: React.ReactNode = null;
  const see = post && <a className="link" href={post.link} target="_blank" rel="noreferrer">Voir le post</a>;
  switch (p) {
    case "ok": sub = `Publiée le ${day(post!.at)} à ${post!.at.slice(11, 16)}`; act = see; break;
    case "late": sub = `Prévue le ${day(at)}, publiée ${gap(at, post!.at)}`; act = see; break;
    case "today":
      sub = d.ig?.verified ? `Prévue à ${at.slice(11, 16)}. Semper vérifie au fil de la journée.` : `Prévue à ${at.slice(11, 16)}.`;
      act = d.ig?.verified
        ? <button type="button" className="btn btn-ghost btn-sm" disabled={busy} onClick={() => run(() => checkNow(c))}>{busy ? "Semper regarde…" : "Vérifier maintenant"}</button>
        : !c.publishedAt && <button type="button" className="btn btn-ghost btn-sm" onClick={() => patchContent(c.id, (x) => withStatus(x, "publie"))}>Marquer publiée</button>;
      break;
    case "propose":
      sub = `Trouvée le ${day(post!.at)} à ${post!.at.slice(11, 16)}, ${gap(at, post!.at)}. C'est elle ?`;
      act = <><button type="button" className="btn btn-ghost btn-sm" onClick={() => setModal("pick")}>Non</button><button type="button" className="btn btn-sm" disabled={busy} onClick={() => link(post!)}>Oui, relier</button></>;
      break;
    case "miss":
      sub = dot(`Pas trouvée sur Instagram le ${day(at)}`);
      act = <><button type="button" className="btn btn-ghost btn-sm" onClick={() => setModal("skip")}>Pas publiée</button><button type="button" className="btn btn-sm" onClick={() => setModal("pick")}>Relier un post</button></>;
      break;
    case "decl": sub = "Publiée selon toi. Relie Instagram pour la certifier."; break;
    case "nonv": sub = dot(`Prévue le ${day(at)}`); act = <button type="button" className="btn btn-ghost btn-sm" onClick={() => patchContent(c.id, (x) => withStatus(x, "publie"))}>Marquer publiée</button>; break;
    case "prevu": sub = `${day(at)} à ${at.slice(11, 16)}`; break;
    default: sub = "Idée";
  }

  const d0 = at ? parse(at) : null;
  return (
    <>
      <div className={`pr${compact ? " compact" : ""}${p === "today" ? " hot" : p === "propose" || p === "miss" ? " warn" : ""}`}>
        {!compact && d0 && <span className="pr-date"><small className="lbl">{DAYS[(d0.getDay() + 6) % 7]}</small><b className="disp">{d0.getDate()}</b></span>}
        <span className="pr-t">
          <span className="pr-top">{!compact && <button type="button" className="pr-title" onClick={() => openSheet(c.id)}>{c.title.trim() || "Sans titre"}</button>}<ProofChip p={p} /></span>
          <span className="pr-sub">{sub}</span>
        </span>
        {act && <span className="pr-act">{act}</span>}
      </div>
      {modal === "pick" && <Picker c={c} onClose={() => setModal(null)} onLink={(x) => { setModal(null); link(x); }} onNone={() => setModal("skip")} />}
      {modal === "skip" && <Skip c={c} onClose={() => setModal(null)} />}
    </>
  );
}

function Modal({ label, children, onClose }: { label: string; children: React.ReactNode; onClose: () => void }) {
  useEffect(() => {
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", esc);
    return () => window.removeEventListener("keydown", esc);
  }, [onClose]);
  return (
    <div className="veil jeu-veil" onPointerDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="jeu" role="dialog" aria-modal="true" aria-label={label}>
        <button type="button" className="x jeu-x" onClick={onClose} aria-label="Fermer"><DotIcon name="croix" /></button>
        {children}
      </div>
    </div>
  );
}

// Relier un post : les publications autour de la date prévue. Une date différente demande une confirmation.
function Picker({ c, onClose, onLink, onNone }: { c: Content; onClose: () => void; onLink: (p: IgPost) => void; onNone: () => void }) {
  const d = useData()!;
  const [sure, setSure] = useState<IgPost | null>(null);
  const at = c.publishAt!.slice(0, 10);
  const taken = new Set(d.contents.map((x) => x.igPost?.id).filter(Boolean));
  const from = dayKey(addDays(parse(at), -7)), to = dayKey(addDays(parse(at), 14));
  const list = (d.ig?.posts ?? []).filter((p) => !taken.has(p.id) && p.at.slice(0, 10) >= from && p.at.slice(0, 10) <= to);
  if (sure) return (
    <Modal label="Date différente" onClose={onClose}>
      <header className="jeu-head"><span className="lbl">Date différente</span><h2>Publiée {gap(at, sure.at)}.</h2>
        <p>Prévue le {day(at)}, publiée le {dot(day(sure.at))} Elle compte pour ta semaine et tes trophées, pas pour « à l&apos;heure ».</p></header>
      <div className="jeu-stage">
        <PostLine p={sure} />
        <div className="jeu-act"><button type="button" className="btn btn-ghost" onClick={() => setSure(null)}>Retour</button><button type="button" className="btn" onClick={() => onLink(sure)}>Relier</button></div>
      </div>
    </Modal>
  );
  return (
    <Modal label="Relier un post" onClose={onClose}>
      <header className="jeu-head"><span className="lbl">Relier un post</span><h2>{c.title.trim() || "Sans titre"}</h2><p>{dot(`Prévue le ${day(at)}`)} Choisis la publication qui correspond.</p></header>
      <div className="jeu-stage">
        <div className="pr-posts">
          {list.length ? list.map((p) => (
            <button type="button" key={p.id} className="pr-post" onClick={() => (p.at.slice(0, 10) === at ? onLink(p) : setSure(p))}>
              <PostLine p={p} tag={p.at.slice(0, 10) === at ? "Le jour prévu" : gap(at, p.at)} />
            </button>
          )) : <p className="muted">Aucune publication autour de cette date sur @{d.ig?.handle}.</p>}
        </div>
        <div className="jeu-act"><button type="button" className="btn btn-ghost" onClick={onNone}>Je ne l&apos;ai pas publiée</button></div>
      </div>
    </Modal>
  );
}

function PostLine({ p, tag }: { p: IgPost; tag?: string }) {
  return (
    <span className="pr-pl">
      {p.img ? <img src={p.img} alt="" width={44} height={56} loading="lazy" referrerPolicy="no-referrer" /> : <i />}
      <span><b>{p.cap}</b><small>{day(p.at)} à {p.at.slice(11, 16)}</small></span>
      {tag && <small className="lbl">{tag}</small>}
    </span>
  );
}

// Pas publiée : elle ne compte pas cette fois. On la replace sur un autre jour, ou elle redevient une idée.
function Skip({ c, onClose }: { c: Content; onClose: () => void }) {
  const days = Array.from({ length: 7 }, (_, i) => addDays(new Date(), i));
  const time = c.publishAt?.slice(11, 16) || "18:00";
  return (
    <Modal label="Pas publiée" onClose={onClose}>
      <header className="jeu-head"><span className="lbl">Pas publiée</span><h2>Pas grave. On la replace ?</h2>
        <p>« {c.title.trim() || "Sans titre"} » ne compte pas cette fois. Choisis un nouveau jour, les étapes suivent.</p></header>
      <div className="jeu-stage">
        <div className="pr-days">
          {days.map((x) => (
            <button type="button" key={dayKey(x)} onClick={() => {
              patchContent(c.id, (y, dd) => ({ ...movePublish(y, `${dayKey(x)}T${time}`, dd.profile.durations), publishedAt: null }));
              onClose();
              announce(`Replacée ${dayKey(x) === today() ? "aujourd'hui" : `le ${day(dayKey(x))}`}.`);
            }}><span>{DAYS[(x.getDay() + 6) % 7]}</span><b className="disp">{x.getDate()}</b></button>
          ))}
        </div>
        <div className="jeu-act">
          <button type="button" className="btn btn-ghost" onClick={() => { patchContent(c.id, (y) => withStatus(y, "idee")); onClose(); announce("Remise dans tes idées."); }}>La remettre dans les idées</button>
        </div>
      </div>
    </Modal>
  );
}
