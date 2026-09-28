"use client";

import { useId, useState } from "react";
import Link from "next/link";
import Orbit from "./Orbit";
import { sb, sbReady } from "./supabase";

// Connexion : une adresse, puis le code reçu par e-mail. Pas de mot de passe.
// Le code marche même si l'e-mail est ouvert sur un autre appareil.
export default function LoginForm() {
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<React.ReactNode>("");
  const id = useId();

  async function send(e: React.FormEvent) {
    e.preventDefault();
    const m = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(m)) return setMsg("Vérifie ton adresse e-mail.");
    if (!sbReady()) return setMsg("L'espace Semper n'est pas encore ouvert.");
    setBusy(true); setMsg("");
    const { error } = await sb().auth.signInWithOtp({ email: m, options: { shouldCreateUser: false } });
    setBusy(false);
    if (error) return setMsg(<>Aucun compte avec cette adresse. <Link href="/commencer">Commencer</Link></>);
    setSent(true);
  }

  async function verify(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setMsg("");
    const { error } = await sb().auth.verifyOtp({ email: email.trim().toLowerCase(), token: code.trim(), type: "email" });
    if (error) { setBusy(false); return setMsg("Code incorrect ou expiré."); }
    location.replace("/calendrier");
  }

  return sent ? (
    <form className="form" onSubmit={verify} noValidate>
      <label className="sr" htmlFor={id}>Code reçu par e-mail</label>
      <input id={id} value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 8))} inputMode="numeric" autoComplete="one-time-code" placeholder="Code reçu" autoFocus disabled={busy} />
      <button className="btn" type="submit" disabled={busy || code.length < 6}>{busy ? <Orbit size={16} /> : null}{busy ? "Un instant" : "Entrer"}</button>
      {msg && <p className="form-msg" role="alert">{msg}</p>}
    </form>
  ) : (
    <form className="form" onSubmit={send} noValidate>
      <label className="sr" htmlFor={id}>Adresse e-mail</label>
      <input id={id} type="email" inputMode="email" autoComplete="email" placeholder="ton@email.com" value={email} onChange={(e) => setEmail(e.target.value)} disabled={busy} />
      <button className="btn" type="submit" disabled={busy}>{busy ? <Orbit size={16} /> : null}{busy ? "Un instant" : "Recevoir mon code"}</button>
      {msg && <p className="form-msg" role="alert">{msg}</p>}
    </form>
  );
}
