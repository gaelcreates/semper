"use client";

import { useEffect, useState } from "react";
import { sb } from "../supabase";
import { CODE_LEN, authError } from "./auth";

// L'écran du code, commun à l'inscription et à la connexion.
// Pensé pour ceux qui se perdent : où chercher l'e-mail, quel code prendre, renvoyer, changer d'adresse.
export default function Code({ email, resend, onBack, onDone }: {
  email: string;
  resend: () => Promise<string>; // message d'erreur, vide si le code est parti
  onBack: () => void;
  onDone: (token: string) => Promise<void> | void;
}) {
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [wait, setWait] = useState(60);
  const [again, setAgain] = useState(false);

  useEffect(() => {
    if (wait <= 0) return;
    const t = setTimeout(() => setWait(wait - 1), 1000);
    return () => clearTimeout(t);
  }, [wait]);

  async function verify(c = code) {
    if (c.length < CODE_LEN || busy) return;
    setBusy(true); setErr("");
    const { data, error } = await sb().auth.verifyOtp({ email, token: c, type: "email" });
    if (error || !data.session) { setBusy(false); setCode(""); return setErr(authError(error ?? { code: "otp_expired" })); }
    await onDone(data.session.access_token);
  }

  async function send() {
    setErr(""); setAgain(false);
    const e = await resend();
    if (e) return setErr(e);
    setWait(60); setCode(""); setAgain(true);
  }

  return (
    <form className="onb-q" onSubmit={(e) => { e.preventDefault(); verify(); }}>
      <span className="lbl">Code</span>
      <h1>Regarde tes e-mails</h1>
      <p className="onb-sub">Un code à {CODE_LEN} chiffres vient de partir à <b>{email}</b>.</p>
      <input className="onb-in code" value={code} autoFocus inputMode="numeric" autoComplete="one-time-code" placeholder={"0".repeat(CODE_LEN)}
        disabled={busy} aria-label="Code reçu par e-mail"
        onChange={(e) => {
          const c = e.target.value.replace(/\D/g, "").slice(0, CODE_LEN);
          setCode(c);
          if (c.length === CODE_LEN) verify(c);
        }} />
      {err && <p className="onb-err" role="alert">{err}</p>}
      {again && !err && <p className="onb-ok" role="status">Nouveau code envoyé. Seul le dernier marche.</p>}
      <ul className="onb-help">
        <li>Pas reçu ? Regarde dans les spams et l&apos;onglet Promotions.</li>
        <li>L&apos;e-mail vient de Semper, le code est écrit dans l&apos;objet.</li>
        <li>Garde cette page ouverte : le code se tape ici.</li>
      </ul>
      <div className="onb-nav">
        <button type="button" className="link" onClick={onBack}>Changer d&apos;adresse</button>
        <button type="button" className="link" onClick={send} disabled={wait > 0}>{wait > 0 ? `Renvoyer (${wait} s)` : "Renvoyer le code"}</button>
        <button className="btn" type="submit" disabled={busy || code.length < CODE_LEN}>{busy ? "Un instant" : "Entrer"}</button>
      </div>
    </form>
  );
}
