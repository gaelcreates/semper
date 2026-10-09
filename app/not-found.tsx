import type { Metadata } from "next";
import Link from "next/link";
import { TopBar } from "./Frame";

export const metadata: Metadata = { title: "Page introuvable · Semper" };

// Page introuvable : courte, et toujours une porte de sortie (accueil, connexion, waitlist).
export default function NotFound() {
  return (
    <>
      <TopBar />
      <main className="lost">
        <b className="disp lost-n">404</b>
        <h1>Cette page n&apos;existe pas.</h1>
        <Link href="/" className="btn">Retour à l&apos;accueil</Link>
      </main>
    </>
  );
}
