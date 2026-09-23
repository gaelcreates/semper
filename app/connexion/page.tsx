import type { Metadata } from "next";
import Link from "next/link";
import { Footer, TopBar } from "../Frame";
import LoginForm from "../LoginForm";
import Mark from "../Mark";

export const metadata: Metadata = { title: "Connexion · Semper", robots: { index: false, follow: false } };

// Entrée de l'espace membre. Connexion par lien e-mail, sans mot de passe.
export default function Page() {
  return (
    <>
      <TopBar cta={false} />
      <main className="auth">
        <div className="wrap" style={{ display: "grid", justifyItems: "center" }}>
          <div className="auth-card">
            <Mark />
            <h1>Content de te <span className="w">revoir.</span></h1>
            <p className="story">Entre ton adresse, tu reçois un lien. Pas de mot de passe à retenir.</p>
            <LoginForm />
            <p className="fine">Pas encore de compte ? <Link href="/#rejoindre">Rejoins la liste</Link>, tu seras prévenu à l&apos;ouverture.</p>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
