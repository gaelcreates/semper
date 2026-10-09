"use client";

import { useActionState, useEffect, useId, useRef, useState } from "react";
import { join, type JoinState } from "./actions";
import { suggest } from "./(start)/auth";
import Mark from "./Mark";
import Orbit from "./Orbit";

export default function JoinForm({ label = "Rejoindre la waitlist", light = false, done }: { label?: string; light?: boolean; done?: string }) {
  const [state, action, pending] = useActionState<JoinState, FormData>(join, null);
  // Champ contrôlé : l'adresse reste après une erreur, on corrige au lieu de retaper.
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState("");
  const input = useRef<HTMLInputElement>(null);
  const id = useId();
  const fix = suggest(email);

  // Arrivée par un lien vers le bloc du formulaire (#rejoindre, #recevoir) : le champ prend la main.
  useEffect(() => {
    const go = (hash: string) => {
      if (hash && document.getElementById(hash.slice(1))?.contains(input.current)) setTimeout(() => input.current?.focus({ preventScroll: true }), 400);
    };
    go(location.hash);
    const click = (e: MouseEvent) => {
      const a = (e.target as Element | null)?.closest?.("a");
      if (a?.hash && a.pathname === location.pathname) go(a.hash);
    };
    document.addEventListener("click", click);
    return () => document.removeEventListener("click", click);
  }, []);

  if (state?.ok) {
    return (
      <p className={`form-done${light ? " on-light" : ""}`} role="status">
        <Mark className="mark-sm" /> {done ?? state.message}
      </p>
    );
  }

  return (
    <form className={`form${light ? " on-light" : ""}`} action={action} onSubmit={() => setSent(email)} noValidate>
      <input className="trap" name="site" tabIndex={-1} autoComplete="off" aria-hidden="true" />
      <label className="sr" htmlFor={id}>Adresse e-mail</label>
      <input
        ref={input}
        id={id}
        name="email"
        type="email"
        inputMode="email"
        autoComplete="email"
        placeholder="ton@email.com"
        required
        disabled={pending}
        value={email}
        onChange={(e) => setEmail(e.target.value.replace(/\s/g, ""))}
      />
      <button className="btn" type="submit" disabled={pending}>
        {pending ? <Orbit size={16} /> : null}
        {pending ? "Un instant" : label}
      </button>
      {fix ? (
        <button type="button" className="form-msg form-fix" onClick={() => setEmail(fix)}>Tu voulais dire <b>{fix}</b>&nbsp;?</button>
      ) : state && !state.ok && email === sent && (
        <p className="form-msg" role="alert">{state.message}</p>
      )}
    </form>
  );
}
