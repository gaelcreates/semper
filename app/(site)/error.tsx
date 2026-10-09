"use client";

import Link from "next/link";
import Logo from "../Logo";

// Une erreur sur la vitrine : on propose de réessayer ou de revenir à l'accueil.
export default function Error({ reset }: { error: Error; reset: () => void }) {
  return (
    <main className="lost">
      <Link href="/" aria-label="Semper, accueil"><Logo /></Link>
      <b className="disp lost-n">Oups</b>
      <h1>Quelque chose a coincé.</h1>
      <span className="lost-act">
        <button type="button" className="btn" onClick={reset}>Réessayer</button>
        <Link href="/" className="link">Retour à l&apos;accueil</Link>
      </span>
    </main>
  );
}
