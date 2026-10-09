import Link from "next/link";
import Logo from "./Logo";
import ThemeToggle from "./ThemeToggle";
import Reveal from "./Reveal";

// Barre du haut et pied de page communs à toutes les pages.
// Partout : se connecter et rejoindre la waitlist. Le menu des sections n'existe que sur l'accueil.
export function TopBar({ home = false }: { home?: boolean }) {
  const join = <><span className="full">Rejoindre la waitlist</span><span className="short">Rejoindre</span></>;
  return (
    <header className="topbar">
      <div className="wrap nav">
        <Link href="/" className="brand" aria-label="Semper, accueil"><Logo /></Link>
        {home && (
          <nav className="menu" aria-label="Sections">
            <a href="#probleme">Le problème</a>
            <a href="#produit">L&apos;outil</a>
            <a href="#methode">Comment ça marche</a>
            <a href="#mission">La mission</a>
            <a href="#lettre">La lettre</a>
            <a href="#questions">Questions</a>
          </nav>
        )}
        <div className="nav-right">
          <ThemeToggle />
          <Link href="/connexion" prefetch={false} className="link nav-login"><span className="full">Se connecter</span><span className="short">Connexion</span></Link>
          {home ? <a href="#rejoindre" className="btn btn-sm">{join}</a> : <Link href="/#rejoindre" className="btn btn-sm">{join}</Link>}
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
          <p className="tagline dot-t"><span className="b">Créer,</span> <span className="w">toujours.</span></p>
        </div>
        <p className="about">Semper est un calendrier éditorial gratuit pour les créateurs de contenu, fait en Suisse. Il suit chaque vidéo de l&apos;idée à la publication et compte les semaines tenues.</p>
        <p className="lunar"><i className="dot" /> La lune a été le premier calendrier. On y comptait les nuits bien avant de compter les semaines. Elle ne brille pas plus quand on la regarde, elle revient, c&apos;est tout. Semper est dans cette lignée&nbsp;: il ne compte pas ce que tu produis, il compte ce que tu tiens.</p>
        <div className="footer-bottom">
          <nav className="fl" aria-label="Liens">
            <Link href="/lettre">La lettre</Link>
            <Link href="/confidentialite">Confidentialité</Link>
            <Link href="/conditions">Conditions</Link>
            <Link href="/mentions-legales">Mentions légales</Link>
            <Link href="/connexion" prefetch={false}>Se connecter</Link>
          </nav>
          <p className="fine">© {new Date().getFullYear()} Semper · Suisse</p>
        </div>
      </div>
      <Reveal />
    </footer>
  );
}
