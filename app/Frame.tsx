import Link from "next/link";
import Logo from "./Logo";
import ThemeToggle from "./ThemeToggle";
import Reveal from "./Reveal";

// Barre du haut et pied de page communs à toutes les pages.
export function TopBar({ cta = true }: { cta?: boolean }) {
  return (
    <header className="topbar">
      <div className="wrap nav">
        <Link href="/" className="brand" aria-label="Semper, accueil"><Logo /></Link>
        {cta && (
          <nav className="menu" aria-label="Sections">
            <a href="#probleme">Le problème</a>
            <a href="#produit">L&apos;outil</a>
            <a href="#methode">Comment ça marche</a>
            <a href="#mission">La mission</a>
            <a href="#questions">Questions</a>
          </nav>
        )}
        <div className="nav-right">
          <ThemeToggle />
          {cta ? (
            <>
              <Link href="/connexion" className="link nav-login">Se connecter</Link>
              <a href="#rejoindre" className="btn btn-sm"><span className="full">Rejoindre la liste</span><span className="short">Rejoindre</span></a>
            </>
          ) : (
            <Link href="/" className="link">Retour</Link>
          )}
        </div>
      </div>
    </header>
  );
}

export function Footer() {
  return (
    <footer className="footer">
      <div className="wrap">
        <div className="footer-top">
          <div className="brand"><Logo /></div>
          <p className="tagline"><span className="b">Créer,</span> <span className="w">toujours.</span></p>
        </div>
        <div className="footer-bottom">
          <nav className="fl" aria-label="Pages légales">
            <Link href="/confidentialite">Confidentialité</Link>
            <Link href="/conditions">Conditions</Link>
            <Link href="/mentions-legales">Mentions légales</Link>
          </nav>
          <p className="fine">© {new Date().getFullYear()} Semper · Suisse</p>
        </div>
      </div>
      <Reveal />
    </footer>
  );
}
