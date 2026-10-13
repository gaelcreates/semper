"use client";

import { useEffect, useState } from "react";
import { claudeCreate, claudeRevoke, claudeState } from "./actions";
import { sb } from "../supabase";

const token = async () => (await sb().auth.getSession()).data.session?.access_token ?? "";
const ago = (iso: string) => {
  const h = Math.floor((Date.now() - new Date(iso).getTime()) / 3600e3);
  return h < 1 ? "dans l'heure" : h < 24 ? `il y a ${h} h` : `il y a ${Math.floor(h / 24)} j`;
};

// Relier Semper à Claude : une adresse personnelle à coller dans Claude (connecteur personnalisé).
// Elle n'est montrée qu'à sa création ; en créer une nouvelle coupe l'ancienne.
export default function Claude() {
  const [state, setState] = useState<{ on: boolean; used: string | null } | null>(null);
  const [url, setUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [err, setErr] = useState(false);

  useEffect(() => { token().then(claudeState).then(setState).catch(() => setState({ on: false, used: null })); }, []);

  async function create() {
    setBusy(true); setErr(false);
    const u = await claudeCreate(await token()).catch(() => null);
    setBusy(false);
    if (!u) return setErr(true);
    setUrl(u); setState({ on: true, used: null }); setCopied(false);
  }
  async function revoke() {
    setBusy(true);
    const ok = await claudeRevoke(await token()).catch(() => false);
    setBusy(false);
    if (ok) { setUrl(""); setState({ on: false, used: null }); } else setErr(true);
  }
  async function copy() {
    try { await navigator.clipboard.writeText(url); setCopied(true); } catch { setCopied(false); }
  }

  return (
    <section className="box pf cl" id="claude">
      <h2>Claude</h2>
      <p className="muted">Relie Semper à Claude : il lit ta semaine, crée tes vidéos, écrit tes scripts et les fait avancer.</p>
      {url ? (
        <>
          <div className="pf-email">
            <input className="inp big cl-url" value={url} readOnly onFocus={(e) => e.target.select()} aria-label="Ton adresse Semper pour Claude" />
            <button type="button" className="btn btn-sm" onClick={copy}>{copied ? "Copiée" : "Copier"}</button>
          </div>
          <ol className="cl-steps">
            <li>Dans Claude : <b>Paramètres</b>, <b>Connecteurs</b>, <b>Ajouter un connecteur personnalisé</b>.</li>
            <li>Nom : Semper. Colle l&apos;adresse, puis <b>Ajouter</b>.</li>
          </ol>
          <small className="muted">Garde-la pour toi : elle ouvre ton calendrier. Elle ne s&apos;affiche qu&apos;une fois.</small>
        </>
      ) : state?.on ? (
        <div className="pf-row">
          <span><b>{state.used ? "Connecté" : "Adresse créée"}</b><small className="muted">{state.used ? `Utilisé ${ago(state.used)}` : "Pas encore utilisée par Claude"}</small></span>
          <span className="cl-act">
            <button type="button" className="link" onClick={create} disabled={busy}>Nouvelle adresse</button>
            <button type="button" className="link muted" onClick={revoke} disabled={busy}>Déconnecter</button>
          </span>
        </div>
      ) : (
        <div><button type="button" className="btn btn-sm" onClick={create} disabled={busy || !state}>{busy ? "Un instant" : "Connecter à Claude"}</button></div>
      )}
      {err && <small className="pf-err" role="alert">Ça n&apos;a pas marché. Réessaie.</small>}
    </section>
  );
}
