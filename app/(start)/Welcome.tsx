"use client";

import { useEffect, useState } from "react";
import Logo from "../Logo";
import { Stepper } from "../(app)/ui";
import { cleanHandle } from "../(app)/lib";
import type { Value } from "../(app)/store";
import { refreshInstagram, syncSignup } from "../(app)/actions";
import { sb, sbReady } from "../supabase";
import Code from "./Code";
import { authError, suggest, validEmail } from "./auth";

// Le premier passage : une question par écran. Les réponses qualifient le profil dans l'admin.
// Un choix unique passe tout seul à la suite ; l'adresse e-mail vient en dernier, puis le code reçu.
// Les réponses partent avec la demande de code et remplissent le profil à la création du compte.
type Q = { key: string; title: string; kind: "text" | "handle" | "one" | "multi" | "rythme" | "email"; options?: string[] };

export const QUESTIONS: Q[] = [
  { key: "firstName", title: "Comment tu t'appelles ?", kind: "text" },
  { key: "handle", title: "Ton compte Instagram", kind: "handle" },
  { key: "pourquoi", title: "Tu crées pour quoi ?", kind: "multi", options: ["Faire grandir ma marque perso", "Trouver des clients", "Vendre un produit ou une offre", "En faire mon métier", "Partager une passion"] },
  { key: "abonnes", title: "Combien d'abonnés aujourd'hui ?", kind: "one", options: ["Moins de 1 000", "1 000 à 10 000", "10 000 à 50 000", "50 000 à 100 000", "Plus de 100 000"] },
  { key: "frequence", title: "Tu publies combien en ce moment ?", kind: "one", options: ["Presque jamais", "Une fois par semaine", "Deux à trois fois par semaine", "Presque tous les jours"] },
  { key: "usage", title: "Tu attends quoi de Semper ?", kind: "multi", options: ["Tenir un rythme", "M'organiser", "Ne plus manquer d'idées", "Voir ma progression"] },
  { key: "rythme", title: "Combien de vidéos par semaine tu veux tenir ?", kind: "rythme" },
  { key: "source", title: "Comment tu as connu Semper ?", kind: "one", options: ["Instagram", "TikTok", "YouTube", "Bouche à oreille", "La newsletter", "Autre"] },
  { key: "email", title: "Ton adresse e-mail", kind: "email" },
];

export default function Welcome() {
  const [step, setStep] = useState(0);
  const [a, setA] = useState<Record<string, Value | number>>({ rythme: 2 });
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const q = QUESTIONS[step];
  const v = a[q.key];
  const last = step === QUESTIONS.length - 1;

  // Le champ de chaque question prend la main tout de suite.
  useEffect(() => { document.querySelector<HTMLInputElement>(".onb-q input")?.focus(); }, [step]);

  const ok =
    q.kind === "multi" ? Array.isArray(v) && v.length > 0
    : q.kind === "handle" ? !!cleanHandle(String(v ?? ""))
    : q.kind === "email" ? validEmail(String(v ?? ""))
    : q.kind === "rythme" ? true
    : !!String(v ?? "").trim();

  const email = String(a.email ?? "").trim().toLowerCase();

  // Demande le code ; les réponses partent avec et remplissent le profil si le compte est nouveau.
  async function request(all = a) {
    const { firstName, handle, rythme, email: _e, ...answers } = all;
    const { error } = await sb().auth.signInWithOtp({
      email,
      options: { shouldCreateUser: true, data: { first_name: String(firstName).trim(), handle: cleanHandle(String(handle)), rythme: Number(rythme), answers } },
    });
    return error;
  }

  async function finish(all: Record<string, Value | number>) {
    if (!sbReady()) return setErr("Les inscriptions ouvrent bientôt.");
    setBusy(true); setErr("");
    const error = await request(all);
    setBusy(false);
    if (error) return setErr(authError(error));
    setSent(true);
  }

  function next(all = a) {
    if (last) return void finish(all);
    setStep(step + 1);
  }
  const set = (x: Value | number) => setA({ ...a, [q.key]: x });

  return (
    <div className="onb">
      <header className="onb-top">
        <Logo />
        <ol className="onb-dots" aria-label={`Question ${step + 1} sur ${QUESTIONS.length}`}>
          {QUESTIONS.map((x, i) => <li key={x.key} className={i < step || sent ? "on" : i === step ? "now" : ""} />)}
        </ol>
      </header>

      {sent ? (
        <Code email={email} resend={() => request()} onBack={() => setSent(false)}
          onDone={async (t) => { await Promise.all([syncSignup(t), refreshInstagram(t)]).catch(() => {}); location.replace("/calendrier"); }} />
      ) : (
      <form className="onb-q" key={q.key} onSubmit={(e) => { e.preventDefault(); if (ok) next(); }}>
        <span className="lbl disp">{String(step + 1).padStart(2, "0")}</span>
        <h1>{q.title}</h1>

        {q.kind === "text" && <input className="onb-in" value={String(v ?? "")} onChange={(e) => set(e.target.value)} placeholder="Prénom" autoComplete="given-name" />}
        {q.kind === "email" && (
          <>
            <input className="onb-in" type="email" inputMode="email" value={String(v ?? "")} onChange={(e) => set(e.target.value.replace(/\s/g, ""))} placeholder="ton@email.com" autoComplete="email" autoCapitalize="none" spellCheck={false} />
            {suggest(String(v ?? "")) && (
              <button type="button" className="onb-fix" onClick={() => set(suggest(String(v))!)}>Tu voulais dire <b>{suggest(String(v))}</b> ?</button>
            )}
            <p className="onb-sub">On t&apos;y envoie un code pour entrer. Pas de mot de passe.</p>
          </>
        )}
        {q.kind === "handle" && (
          <span className="onb-in at"><i>@</i><input value={String(v ?? "")} onChange={(e) => set(e.target.value.replace(/^@/, ""))} placeholder="pseudo" autoComplete="off" autoCapitalize="none" spellCheck={false} /></span>
        )}
        {q.kind === "rythme" && <Stepper label={q.title} value={Number(v)} onChange={set} min={1} max={14} format={(n) => `${n} / sem.`} />}
        {(q.kind === "one" || q.kind === "multi") && (
          <div className="onb-opts">
            {q.options!.map((o) => {
              const on = q.kind === "one" ? v === o : Array.isArray(v) && v.includes(o);
              return (
                <button type="button" key={o} className={on ? "on" : ""} aria-pressed={on}
                  onClick={() => {
                    if (q.kind === "one") { const all = { ...a, [q.key]: o }; setA(all); setTimeout(() => next(all), 180); }
                    else { const s = Array.isArray(v) ? v : []; set(on ? s.filter((x) => x !== o) : [...s, o]); }
                  }}>
                  <i />{o}
                </button>
              );
            })}
          </div>
        )}

        {err && <p className="onb-err" role="alert">{err}</p>}
        <div className="onb-nav">
          {step > 0 && <button type="button" className="link" onClick={() => setStep(step - 1)}>Retour</button>}
          {q.kind !== "one" && <button className="btn" type="submit" disabled={!ok || busy}>{busy ? "Un instant" : last ? "Recevoir mon code" : "Continuer"}</button>}
        </div>
      </form>
      )}
    </div>
  );
}
