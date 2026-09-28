"use client";

import { useEffect, useState } from "react";
import Logo from "../Logo";
import { Stepper } from "./ui";
import { cleanHandle } from "./lib";
import { setProfile, type Value } from "./store";

// Le premier passage : une question par écran. Les réponses qualifient le profil dans l'admin.
// Un choix unique passe tout seul à la suite ; l'adresse e-mail vient en dernier.
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
  const q = QUESTIONS[step];
  const v = a[q.key];
  const last = step === QUESTIONS.length - 1;

  // Le champ de chaque question prend la main tout de suite.
  useEffect(() => { document.querySelector<HTMLInputElement>(".onb-q input")?.focus(); }, [step]);

  const ok =
    q.kind === "multi" ? Array.isArray(v) && v.length > 0
    : q.kind === "handle" ? !!cleanHandle(String(v ?? ""))
    : q.kind === "email" ? /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(v ?? "").trim())
    : q.kind === "rythme" ? true
    : !!String(v ?? "").trim();

  function finish(all: Record<string, Value | number>) {
    const { firstName, handle, email, rythme, ...answers } = all;
    setProfile({
      firstName: String(firstName).trim(), handle: cleanHandle(String(handle)), email: String(email).trim().toLowerCase(),
      rythme: Number(rythme), answers: answers as Record<string, Value>, onboarded: true,
    });
  }
  function next(all = a) {
    if (last) return finish(all);
    setStep(step + 1);
  }
  const set = (x: Value | number) => setA({ ...a, [q.key]: x });

  return (
    <div className="onb">
      <header className="onb-top">
        <Logo />
        <ol className="onb-dots" aria-label={`Question ${step + 1} sur ${QUESTIONS.length}`}>
          {QUESTIONS.map((x, i) => <li key={x.key} className={i < step ? "on" : i === step ? "now" : ""} />)}
        </ol>
      </header>

      <form className="onb-q" key={q.key} onSubmit={(e) => { e.preventDefault(); if (ok) next(); }}>
        <span className="lbl disp">{String(step + 1).padStart(2, "0")}</span>
        <h1>{q.title}</h1>

        {q.kind === "text" && <input className="onb-in" value={String(v ?? "")} onChange={(e) => set(e.target.value)} placeholder="Prénom" autoComplete="given-name" />}
        {q.kind === "email" && <input className="onb-in" type="email" inputMode="email" value={String(v ?? "")} onChange={(e) => set(e.target.value)} placeholder="ton@email.com" autoComplete="email" />}
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

        <div className="onb-nav">
          {step > 0 && <button type="button" className="link" onClick={() => setStep(step - 1)}>Retour</button>}
          {q.kind !== "one" && <button className="btn" type="submit" disabled={!ok}>{last ? "Créer mon espace" : "Continuer"}</button>}
        </div>
      </form>
    </div>
  );
}
