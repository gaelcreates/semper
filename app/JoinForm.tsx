"use client";

import { useActionState, useId } from "react";
import { join, type JoinState } from "./actions";
import Mark from "./Mark";

export default function JoinForm({ label = "Rejoindre la liste", light = false }: { label?: string; light?: boolean }) {
  const [state, action, pending] = useActionState<JoinState, FormData>(join, null);
  const id = useId();

  if (state?.ok) {
    return (
      <p className={`form-done${light ? " on-light" : ""}`} role="status">
        <Mark className="mark-sm" /> {state.message}
      </p>
    );
  }

  return (
    <form className={`form${light ? " on-light" : ""}`} action={action} noValidate>
      <input className="trap" name="site" tabIndex={-1} autoComplete="off" aria-hidden="true" />
      <label className="sr" htmlFor={id}>Adresse e-mail</label>
      <input
        id={id}
        name="email"
        type="email"
        inputMode="email"
        autoComplete="email"
        placeholder="ton@email.com"
        required
        disabled={pending}
      />
      <button className="btn" type="submit" disabled={pending}>
        {pending ? <Mark spin className="mark-sm" /> : null}
        {pending ? "Un instant" : label}
      </button>
      {state && !state.ok && (
        <p className="form-msg" role="alert">{state.message}</p>
      )}
    </form>
  );
}
