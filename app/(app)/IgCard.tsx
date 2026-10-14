"use client";

import { useState } from "react";
import DotIcon from "../DotIcon";
import { cleanHandle } from "./lib";
import { FOCUS, proofOf } from "./jour";
import { announce, applyRows, setGame, setIg, setProfile, useData } from "./store";
import { igCheck, igForget, igStart } from "./actions";
import { sb } from "../supabase";

const token = async () => (await sb().auth.getSession()).data.session?.access_token ?? "";

const SAY = {
  off: "La vérification n'est pas encore ouverte. Réessaie bientôt.",
  absent: "Instagram ne trouve pas ce compte. Vérifie le pseudo, et qu'il est professionnel ou créateur.",
  nocode: "Le code n'est pas encore dans ta bio. Instagram met parfois une minute à la mettre à jour.",
  later: "Trop d'essais. Réessaie dans une heure.",
  error: "Ça n'a pas marché. Réessaie.",
} as const;

// Relier Instagram, de A à Z : le pseudo, le code à coller dans la bio, la vérification. Ensuite Semper relève
// les publications et les relie au calendrier.
export default function IgCard() {
  const d = useData()!;
  const ig = d.ig;
  const [handle, setHandle] = useState(ig?.handle ?? d.profile.handle);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [help, setHelp] = useState(false);
  const step = !ig ? 1 : !ig.verified ? 2 : 3;
  const past = d.contents.filter((c) => c.publishAt && c.publishAt.slice(0, 10) < d.game.day);
  const n = (p: string[]) => past.filter((c) => p.includes(proofOf(c, ig, d.contents, d.game.day))).length;

  async function start() {
    const h = cleanHandle(handle);
    if (!h) return setMsg("Écris ton pseudo Instagram.");
    setBusy(true); setMsg("");
    const row = await igStart(await token(), h).catch(() => null);
    setBusy(false);
    if (!row) return setMsg(SAY.error);
    setIg(row);
    setProfile({ handle: h.toLowerCase() });
  }
  async function check() {
    setBusy(true); setMsg("");
    const r = await igCheck(await token()).catch(() => ({ state: "error" as const, link: null, rows: [] }));
    setBusy(false);
    if (r.state !== "ok") return setMsg(SAY[r.state]);
    if (r.link) setIg(r.link);
    if (r.rows?.length) applyRows(r.rows);
    announce(r.rows?.length ? `Compte vérifié. ${r.rows.length} vidéo${r.rows.length > 1 ? "s" : ""} retrouvée${r.rows.length > 1 ? "s" : ""} le jour prévu.` : "Compte vérifié.");
  }
  async function forget() {
    if (!(await igForget(await token()))) return setMsg(SAY.error);
    setIg(null);
  }

  return (
    <section className="box pf ig-card" id="instagram">
      <header className="ig-card-h"><h2>Vérifier mes publications</h2>{ig?.verified ? <span className="pf-chip ok"><DotIcon name="check" />@{ig.handle}</span> : <span className="muted">Compte professionnel ou créateur</span>}</header>
      <ol className="ig-steps">
        {["Ton pseudo", "Le code dans ta bio", "C'est vérifié"].map((t, i) => (
          <li key={t} className={i + 1 === step ? "on" : i + 1 < step || ig?.verified ? "ok" : ""}><i className="disp">{i + 1 < step || ig?.verified ? "✓" : i + 1}</i>{t}</li>
        ))}
      </ol>

      {step === 1 && (
        <>
          <form className="ig-in" onSubmit={(e) => { e.preventDefault(); start(); }}>
            <span className="at"><i>@</i><input value={handle} onChange={(e) => setHandle(e.target.value.replace(/^@/, ""))} placeholder="pseudo" autoComplete="off" autoCapitalize="none" spellCheck={false} /></span>
            <button type="submit" className="btn" disabled={busy}>Continuer</button>
          </form>
          <button type="button" className="link" onClick={() => setHelp(!help)}>Mon compte est personnel</button>
          {help && (
            <div className="ig-help">
              <b>Passe en compte créateur : c&apos;est gratuit et réversible.</b>
              <ol><li>Dans Instagram, ouvre ton profil puis le menu ☰.</li><li>Type de compte et outils, puis « Passer à un compte professionnel ».</li><li>Choisis « Créateur ». Tes abonnés ne voient aucune différence.</li></ol>
            </div>
          )}
        </>
      )}

      {step === 2 && (
        <>
          <div className="ig-code"><b className="disp">{ig!.code}</b>
            <button type="button" className="btn btn-sm" onClick={() => { navigator.clipboard?.writeText(ig!.code).catch(() => {}); announce("Code copié."); }}>Copier</button></div>
          <ol className="ig-how">
            <li>Ouvre Instagram, puis « Modifier le profil ».</li>
            <li>Colle le code n&apos;importe où dans ta bio et enregistre.</li>
            <li>Reviens ici et vérifie. Tu pourras retirer le code juste après.</li>
          </ol>
          <div className="ig-row">
            <button type="button" className="link" onClick={forget}>Changer de pseudo (@{ig!.handle})</button>
            <button type="button" className="btn" disabled={busy} onClick={check}>{busy ? "Semper lit ta bio…" : "Vérifier ma bio"}</button>
          </div>
        </>
      )}

      {step === 3 && (
        <>
          <p><b>@{ig!.handle} est bien à toi.</b> <span className="muted">Tu peux retirer le code de ta bio.</span></p>
          <div className="ig-found">
            <div><b className="disp">{n(["ok", "late"])}</b><small>vidéos vérifiées</small></div>
            <div><b className="disp">{n(["propose"])}</b><small>à confirmer</small></div>
            <div><b className="disp">{n(["miss"])}</b><small>non validées</small></div>
          </div>
          <div className="ig-row">
            <span className="muted">Semper relève tes publications et les relie au calendrier, chaque jour.</span>
            <button type="button" className="link muted" onClick={forget}>Délier</button>
          </div>
        </>
      )}
      {msg && <small className="pf-err" role="alert">{msg}</small>}
    </section>
  );
}

// Le jeu du jour : imposé par Semper ou choisi parmi trois, tiré de ce que la personne veut travailler.
export function JeuPrefs() {
  const g = useData()!.game;
  return (
    <section className="box pf">
      <header className="ig-card-h"><h2>Ton jeu du jour</h2>
        <div className="seg">{([["semper", "Semper choisit"], ["choix", "Je choisis"]] as const).map(([k, t]) => (
          <button type="button" key={k} className={g.mode === k ? "on" : ""} onClick={() => setGame((x) => ({ ...x, mode: k }))}>{t}</button>
        ))}</div>
      </header>
      <p className="muted">{g.mode === "semper" ? "Un jeu par jour, choisi dans tes priorités." : "Trois propositions par jour, tirées de tes priorités."}</p>
      <div className="aj-focus left">
        {FOCUS.map((f) => (
          <button type="button" key={f.key} className={g.focus.includes(f.key) ? "on" : ""}
            onClick={() => setGame((x) => ({ ...x, focus: x.focus.includes(f.key) ? (x.focus.length > 1 ? x.focus.filter((y) => y !== f.key) : x.focus) : [...x.focus, f.key] }))}>{f.label}</button>
        ))}
      </div>
    </section>
  );
}
