"use client";

import { useActionState, useId } from "react";
import { login, type LoginState } from "./actions";
import Mark from "./Mark";

// Formulaire de connexion : une adresse, un lien reçu par e-mail. Pas de mot de passe.
export default function LoginForm() {
  const [state, action, pending] = useActionState<LoginState, FormData>(login, null);
  const id = useId();

  if (state?.ok) {
    return (
      <p className="form-done" role="status">
        <Mark className="mark-sm" /> {state.message}
      </p>
    );
  }

  return (
    <form className="form" action={action} noValidate>
      <input className="trap" name="site" tabIndex={-1} autoComplete="off" aria-hidden="true" />
      <label className="sr" htmlFor={id}>Adresse e-mail</label>
      <input id={id} name="email" type="email" inputMode="email" autoComplete="email" placeholder="ton@email.com" required disabled={pending} />
      <button className="btn" type="submit" disabled={pending}>
        {pending ? <Mark spin className="mark-sm" /> : null}
        {pending ? "Un instant" : "Recevoir mon lien"}
      </button>
      {state && !state.ok && <p className="form-msg" role="alert">{state.message}</p>}
    </form>
  );
}
