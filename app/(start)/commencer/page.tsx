import type { Metadata } from "next";
import Link from "next/link";
import Logo from "../../Logo";
import Welcome from "../Welcome";

export const metadata: Metadata = { title: "Commencer · Semper" };

// Tant que l'outil n'est pas ouvert (SEMPER_OPEN différent de 1), l'inscription renvoie vers la waitlist.
export default function Page() {
  if (process.env.SEMPER_OPEN === "1") return <Welcome />;
  return (
    <div className="onb">
      <header className="onb-top"><Link href="/" aria-label="Semper, accueil"><Logo /></Link></header>
      <div className="onb-q">
        <span className="lbl">Bientôt</span>
        <h1>Semper ouvre bientôt.</h1>
        <p className="onb-sub">Rejoins la waitlist, tu seras prévenu le jour de l&apos;ouverture.</p>
        <div className="onb-nav">
          <Link href="/connexion" className="link">J&apos;ai déjà un compte</Link>
          <Link href="/#rejoindre" className="btn">Rejoindre la waitlist</Link>
        </div>
      </div>
    </div>
  );
}
