"use client";

import Link from "next/link";
import Logo from "./Logo";

// Une erreur inattendue : on le dit simplement, on propose de réessayer.
export default function Error({ reset }: { error: Error; reset: () => void }) {
  return (
    <main className="lost">
      <Link href="/" aria-label="Semper"><Logo /></Link>
      <b className="disp lost-n">Oups</b>
      <h1>Quelque chose a coincé.</h1>
      <p>Rien n&apos;est perdu : tes contenus sont enregistrés au fur et à mesure.</p>
      <span className="lost-act">
        <button type="button" className="btn" onClick={reset}>Réessayer</button>
        <Link href="/calendrier" className="link">Mon calendrier</Link>
      </span>
    </main>
  );
}
