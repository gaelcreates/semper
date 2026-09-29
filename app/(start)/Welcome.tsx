"use client";

import { useEffect, useState } from "react";
import Logo from "../Logo";
import { cleanHandle } from "../(app)/lib";
import type { Value } from "../(app)/store";
import { refreshInstagram } from "../(app)/actions";
import { sbReady } from "../supabase";
import Code from "./Code";
import { BigDigits, WeekDots } from "./Week7";
import { sendCode } from "./send";
import { sendError, suggest, validEmail } from "./auth";

// Le premier passage : qui tu es (prénom, Instagram, e-mail) sur un écran, puis une question par écran.
// Un choix unique passe tout seul à la suite ; le code part après la dernière réponse.
// Les réponses partent avec la demande de code et remplissent le profil à la création du compte.
type Q = { key: string; title: string; kind: "who" | "one" | "multi" | "rythme"; options?: string[]; alone?: string };

export const QUESTIONS: Q[] = [
  { key: "who", title: "Faisons connaissance", kind: "who" },
  { key: "pourquoi", title: "Tu crées pour quoi ?", kind: "multi", options: ["Faire grandir ma marque perso", "Trouver des clients", "Vendre un produit ou une offre", "En faire mon métier", "Partager une passion"] },
  { key: "objectif", title: "Où veux-tu en être dans 6 mois grâce à ton contenu ?", kind: "one", options: ["Trouver mes premiers clients", "Vivre de mon contenu", "Lancer une offre", "Faire grandir mon audience", "Simplement être régulier"] },
  { key: "abonnes", title: "Combien d'abonnés aujourd'hui ?", kind: "one", options: ["Moins de 1 000", "1 000 à 10 000", "10 000 à 50 000", "50 000 à 100 000", "Plus de 100 000"] },
  { key: "investi", title: "Tu as déjà investi pour progresser ?", kind: "multi", alone: "Pas encore", options: ["Pas encore", "Du matériel", "Un outil ou un abonnement", "Une formation", "Un coach ou un accompagnement"] },
  { key: "frequence", title: "Tu publies combien en ce moment ?", kind: "one", options: ["Presque jamais", "Une fois par semaine", "Deux à trois fois par semaine", "Presque tous les jours"] },
  { key: "blocage", title: "Qu'est-ce qui te bloque le plus ?", kind: "one", options: ["Trouver des idées", "Tenir le rythme", "Le temps", "Savoir quoi dire pour vendre", "Le tournage ou le montage"] },
  { key: "usage", title: "Tu attends quoi de Semper ?", kind: "multi", options: ["Tenir un rythme", "M'organiser", "Ne plus manquer d'idées", "Voir ma progression"] },
  { key: "rythme", title: "Combien de vidéos par semaine tu veux tenir ?", kind: "rythme" },
  { key: "source", title: "Comment tu as connu Semper ?", kind: "one", options: ["Instagram", "TikTok", "YouTube", "Bouche à oreille", "La newsletter", "Autre"] },
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
    : q.kind === "who" ? !!String(a.firstName ?? "").trim() && !!cleanHandle(String(a.handle ?? "")) && validEmail(String(a.email ?? ""))
    : q.kind === "rythme" ? true
    : !!String(v ?? "").trim();

  const email = String(a.email ?? "").trim().toLowerCase();

  // Demande le code ; les réponses partent avec et remplissent le profil si le compte est nouveau.
  async function request(all = a) {
    const { firstName, handle, rythme, email: _e, ...answers } = all;
    const r = await sendCode(email, { first_name: String(firstName).trim(), handle: cleanHandle(String(handle)), rythme: Number(rythme), answers });
    return r.ok ? "" : sendError(r.code);
  }

  async function finish(all: Record<string, Value | number>) {
    if (!sbReady()) return setErr("Les inscriptions ouvrent bientôt.");
    setBusy(true); setErr("");
    const error = await request(all);
    setBusy(false);
    if (error) return setErr(error);
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
          onDone={async (t) => { await refreshInstagram(t).catch(() => {}); location.replace("/calendrier"); }} />
      ) : (
      <form className="onb-q" key={q.key} onSubmit={(e) => { e.preventDefault(); if (ok) next(); }}>
        <span className="lbl disp">{String(step + 1).padStart(2, "0")}</span>
        <h1>{q.title}</h1>

        {q.kind === "who" && (
          <div className="onb-who">
            <label className="fld"><span className="lbl">Prénom</span>
              <input className="onb-in" value={String(a.firstName ?? "")} onChange={(e) => setA({ ...a, firstName: e.target.value })} placeholder="Ton prénom" autoComplete="given-name" />
            </label>
            <label className="fld"><span className="lbl">Instagram</span>
              <span className="onb-in at"><i>@</i><input value={String(a.handle ?? "")} onChange={(e) => setA({ ...a, handle: e.target.value.replace(/^@/, "") })} placeholder="pseudo" autoComplete="off" autoCapitalize="none" spellCheck={false} /></span>
            </label>
            <label className="fld"><span className="lbl">E-mail</span>
              <input className="onb-in" type="email" inputMode="email" value={String(a.email ?? "")} onChange={(e) => setA({ ...a, email: e.target.value.replace(/\s/g, "") })} placeholder="ton@email.com" autoComplete="email" autoCapitalize="none" spellCheck={false} />
            </label>
            {suggest(String(a.email ?? "")) && (
              <button type="button" className="onb-fix" onClick={() => setA({ ...a, email: suggest(String(a.email))! })}>Tu voulais dire <b>{suggest(String(a.email))}</b> ?</button>
            )}
            <p className="onb-sub">Ton code pour entrer partira à cette adresse à la fin.</p>
          </div>
        )}
        {q.kind === "rythme" && (
          <div className="onb-rythme">
            <div className="onb-dial">
              <button type="button" onClick={() => set(Math.max(1, Number(v) - 1))} disabled={Number(v) <= 1} aria-label="Moins">−</button>
              <BigDigits n={Number(v)} />
              <button type="button" onClick={() => set(Math.min(14, Number(v) + 1))} disabled={Number(v) >= 14} aria-label="Plus">+</button>
            </div>
            <span className="lbl onb-unit">{Number(v) > 1 ? "vidéos" : "vidéo"} par semaine</span>
            <WeekDots n={Number(v)} />
          </div>
        )}
        {(q.kind === "one" || q.kind === "multi") && (
          <div className="onb-opts">
            {q.options!.map((o) => {
              const on = q.kind === "one" ? v === o : Array.isArray(v) && v.includes(o);
              return (
                <button type="button" key={o} className={on ? "on" : ""} aria-pressed={on}
                  onClick={() => {
                    if (q.kind === "one") { const all = { ...a, [q.key]: o }; setA(all); setTimeout(() => next(all), 180); }
                    else {
                      // « Pas encore » exclut le reste, et inversement.
                      const s = (Array.isArray(v) ? v : []).filter((x) => (o === q.alone ? false : x !== q.alone));
                      set(on ? s.filter((x) => x !== o) : [...s, o]);
                    }
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
