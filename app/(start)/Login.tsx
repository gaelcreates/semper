"use client";

import { useState } from "react";
import Link from "next/link";
import Logo from "../Logo";
import Code from "./Code";
import { sbReady } from "../supabase";
import { sendCode } from "./send";
import { sendError, suggest, validEmail } from "./auth";

// Connexion : une adresse, puis le code reçu par e-mail. Pas de mot de passe.
export default function Login() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const m = email.trim().toLowerCase();
  const fix = suggest(m);

  const request = async () => { const r = await sendCode(m); return r.ok ? "" : sendError(r.code); };

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!validEmail(m)) return setErr("Vérifie ton adresse : il manque quelque chose.");
    if (!sbReady()) return setErr("L'espace Semper n'est pas encore ouvert.");
    setBusy(true); setErr("");
    const error = await request();
    setBusy(false);
    if (error) return setErr(error);
    setSent(true);
  }

  return (
    <div className="onb">
      <header className="onb-top"><Link href="/" aria-label="Semper, accueil"><Logo /></Link></header>
      {sent ? (
        <Code email={m} resend={request} onBack={() => setSent(false)} onDone={() => location.replace("/calendrier")} />
      ) : (
        <form className="onb-q" onSubmit={submit} noValidate>
          <span className="lbl">Connexion</span>
          <h1>Content de te revoir.</h1>
          <input className="onb-in" type="email" inputMode="email" value={email} onChange={(e) => setEmail(e.target.value.replace(/\s/g, ""))}
            placeholder="ton@email.com" autoComplete="email" autoCapitalize="none" spellCheck={false} autoFocus aria-label="Adresse e-mail" />
          {fix && <button type="button" className="onb-fix" onClick={() => setEmail(fix)}>Tu voulais dire <b>{fix}</b> ?</button>}
          <p className="onb-sub">L&apos;adresse de ton inscription. On t&apos;y envoie un code, pas de mot de passe.</p>
          {err && <p className="onb-err" role="alert">{err} {err.startsWith("Aucun compte") && <Link href="/commencer">Créer mon espace</Link>}</p>}
          <div className="onb-nav">
            <Link href="/commencer" className="link">Pas encore de compte</Link>
            <button className="btn" type="submit" disabled={busy || !m}>{busy ? "Un instant" : "Recevoir mon code"}</button>
          </div>
        </form>
      )}
    </div>
  );
}
