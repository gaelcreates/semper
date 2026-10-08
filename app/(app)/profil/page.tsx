"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import Install from "../Install";
import InstagramStats from "../InstagramStats";
import Avatar from "../Avatar";
import { cleanHandle } from "../lib";
import { exportCsv, setAvatar, setEmail, setProfile, signOut, useData } from "../store";
import { confirmEmail, deleteAccount, requestEmail, type EmailStep } from "../actions";
import { sb } from "../../supabase";

const token = async () => (await sb().auth.getSession()).data.session?.access_token ?? "";

// Profil : le compte, les chiffres des réseaux, l'installation, tes données.
export default function Profil() {
  const d = useData()!;
  const p = d.profile;
  const [handle, setHandle] = useState(p.handle);
  const [name, setName] = useState(p.firstName);

  return (
    <div className="page wide">
      <header className="page-head"><h1>Profil</h1></header>

      <section className="box pf">
        <h2>Compte</h2>
        <Photo />
        <div className="acct">
          <label className="fld"><span className="lbl">Prénom</span>
            <input className="inp big" value={name} onChange={(e) => setName(e.target.value)} onBlur={() => setProfile({ firstName: name.trim() })} placeholder="Prénom" autoComplete="given-name" />
          </label>
          <label className="fld"><span className="lbl">Instagram</span>
            <span className="at">
              <i>@</i>
              <input value={handle} onChange={(e) => setHandle(e.target.value.replace(/^@/, ""))} onBlur={() => { const h = cleanHandle(handle); setHandle(h); setProfile({ handle: h }); }}
                placeholder="pseudo" autoComplete="off" autoCapitalize="none" spellCheck={false} />
            </span>
          </label>
          <Email current={p.email} />
        </div>
      </section>

      <InstagramStats />

      <section className="box pf">
        <h2>Tes données</h2>
        <div className="pf-row">
          <span><b>Exporter tes contenus</b><small className="muted">Un fichier CSV, lisible dans Excel ou Numbers.</small></span>
          <button type="button" className="btn btn-ghost" onClick={exportCsv} disabled={!d.contents.length}>Exporter</button>
        </div>
      </section>

      <Install className="pf-install" />

      <div className="pf-end">
        <button type="button" className="link out" onClick={signOut}>Se déconnecter</button>
        <Supprimer />
        <nav className="pf-legal">
          <Link href="/confidentialite">Confidentialité</Link>
          <Link href="/conditions">Conditions</Link>
          <a href="mailto:gaelcreates@gmail.com?subject=Semper">Contact</a>
        </nav>
      </div>
    </div>
  );
}

// La photo : un clic pour choisir une image, recadrée en carré. Retirable.
function Photo() {
  const p = useData()!.profile;
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  async function pick(f: File | null) {
    setBusy(true);
    await setAvatar(f);
    setBusy(false);
  }
  return (
    <div className="pf-photo">
      <button type="button" className="pf-photo-btn" onClick={() => input.current?.click()} disabled={busy} aria-label="Changer la photo">
        <Avatar size={72} />
      </button>
      <span>
        <button type="button" className="link" onClick={() => input.current?.click()} disabled={busy}>{busy ? "Envoi…" : p.avatar ? "Changer la photo" : "Ajouter une photo"}</button>
        {p.avatar && !busy && <button type="button" className="link muted" onClick={() => pick(null)}>Retirer</button>}
      </span>
      <input ref={input} type="file" accept="image/jpeg,image/png,image/webp,image/heic" hidden
        onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ""; if (f) pick(f); }} />
    </div>
  );
}

const EMAIL_MSG: Partial<Record<EmailStep, string>> = {
  invalid: "Vérifie l'adresse.",
  taken: "Cette adresse a déjà un compte.",
  wait: "Un code vient de partir. Attends une minute.",
  wrong: "Ce n'est pas le bon code.",
  expired: "Code expiré. Demande-en un nouveau.",
  too_many: "Trop d'essais. Demande un nouveau code.",
  error: "Ça n'a pas marché. Réessaie.",
};

// Changer d'adresse : nouvelle adresse, code reçu dessus, puis l'adresse change.
function Email({ current }: { current: string }) {
  const [step, setStep] = useState<"view" | "new" | "code">("view");
  const [email, setE] = useState("");
  const [code, setCode] = useState("");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  async function send() {
    setBusy(true); setMsg("");
    const r = await requestEmail(await token(), email);
    setBusy(false);
    if (r === "ok") setStep("code");
    else setMsg(EMAIL_MSG[r] ?? "");
  }
  async function check(c = code) {
    setBusy(true); setMsg("");
    const r = await confirmEmail(await token(), email, c);
    setBusy(false);
    if (r !== "ok") return setMsg(EMAIL_MSG[r] ?? "");
    await sb().auth.refreshSession();
    setEmail(email.trim().toLowerCase());
    setStep("view"); setE(""); setCode("");
  }
  const cancel = () => { setStep("view"); setE(""); setCode(""); setMsg(""); };

  return (
    <div className="fld">
      <span className="lbl">E-mail</span>
      {step === "view" && (
        <div className="pf-email">
          <input className="inp big" value={current} readOnly aria-readonly="true" />
          <button type="button" className="link" onClick={() => setStep("new")}>Changer</button>
        </div>
      )}
      {step === "new" && (
        <form className="pf-email" onSubmit={(e) => { e.preventDefault(); send(); }}>
          <input className="inp big" type="email" value={email} onChange={(e) => setE(e.target.value)} placeholder="nouvelle@adresse.com" autoFocus autoComplete="email" />
          <button type="submit" className="btn btn-sm" disabled={busy || !email}>{busy ? "Envoi…" : "Recevoir un code"}</button>
          <button type="button" className="link muted" onClick={cancel}>Annuler</button>
        </form>
      )}
      {step === "code" && (
        <form className="pf-email" onSubmit={(e) => { e.preventDefault(); check(); }}>
          <input className="inp big code" inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={code} autoFocus placeholder="000000"
            onChange={(e) => { const v = e.target.value.replace(/\D/g, "").slice(0, 6); setCode(v); if (v.length === 6) check(v); }} />
          <button type="submit" className="btn btn-sm" disabled={busy || code.length < 6}>{busy ? "Vérification…" : "Valider"}</button>
          <button type="button" className="link muted" onClick={cancel}>Annuler</button>
        </form>
      )}
      {step === "code" && !msg && <small className="muted">Code envoyé à {email}. Regarde aussi dans les spams.</small>}
      {msg && <small className="pf-err" role="alert">{msg}</small>}
    </div>
  );
}

// Deux temps : le premier clic arme, le second supprime. Rien n'est récupérable ensuite.
function Supprimer() {
  const [armed, setArmed] = useState(false);
  const [busy, setBusy] = useState(false);
  async function go() {
    if (!armed) return setArmed(true);
    setBusy(true);
    if (await deleteAccount(await token())) {
      await sb().auth.signOut();
      location.href = "/";
    } else setBusy(false);
  }
  return (
    <button type="button" className={`link del${armed ? " armed" : ""}`} onClick={go} onBlur={() => !busy && setArmed(false)} disabled={busy}>
      {busy ? "Suppression…" : armed ? "Confirmer : tout supprimer" : "Supprimer mon compte"}
    </button>
  );
}
