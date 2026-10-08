import Link from "next/link";
import Logo from "./Logo";

// Page introuvable : courte, et toujours une porte de sortie.
export default function NotFound() {
  return (
    <main className="lost">
      <Link href="/" aria-label="Semper"><Logo /></Link>
      <b className="disp lost-n">404</b>
      <h1>Cette page n&apos;existe pas.</h1>
      <Link href="/" className="btn">Retour à l&apos;accueil</Link>
    </main>
  );
}
