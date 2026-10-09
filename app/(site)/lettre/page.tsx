import type { Metadata } from "next";
import Link from "next/link";
import { Footer, TopBar } from "../../Frame";
import JoinForm from "../../JoinForm";
import { site } from "../../site";
import Abonnement from "./Abonnement";
import { FORMATS, dateFr, lettres } from "./lettres";

const title = "Créer, toujours\u00a0: la newsletter des créateurs de contenu réguliers · Semper";
const description =
  "Chaque dimanche, une lettre gratuite sur la constance\u00a0: comment les créateurs organisent leurs idées, tiennent leur calendrier éditorial et ce qui les fait s'arrêter.";

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: `${site.url}/lettre` },
  openGraph: { title, description, url: `${site.url}/lettre`, type: "website", images: [`${site.url}/newsletter/le-calendrier-de.png`] },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "Blog",
  name: "Créer, toujours",
  description,
  url: `${site.url}/lettre`,
  inLanguage: "fr",
  author: { "@type": "Person", name: site.owner, url: "https://www.instagram.com/gaelcreates/" },
  publisher: { "@type": "Organization", name: "Semper", url: site.url },
  blogPost: lettres.map((l) => ({ "@type": "BlogPosting", headline: l.titre, description: l.description, datePublished: l.date, url: `${site.url}/lettre/${l.slug}` })),
};

export default function Page() {
  return (
    <>
      <TopBar />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      <main className="lettres">
        {/* L'en-tête : ce que c'est, et l'inscription tout de suite */}
        <header className="wrap lt-hero">
          <p className="tagline dot-t"><span className="b">Créer,</span> <span className="w">toujours.</span></p>
          <h1>La lettre des créateurs <span className="w">qui tiennent.</span></h1>
          <p className="lead">Chaque dimanche, un e-mail sur la constance&nbsp;: comment les créateurs organisent leurs idées, tiennent leur calendrier et ce qui les fait s&apos;arrêter.</p>
          <div className="lt-hero-form">
            <JoinForm label="Recevoir la lettre" done="C'est noté. La prochaine lettre arrive dans ta boîte." />
            <p className="fine">Gratuit · Un e-mail par semaine · Désinscription en un clic</p>
          </div>
        </header>

        {/* Les cinq formats */}
        <section className="wrap lt-sec" aria-labelledby="formats">
          <h2 id="formats">Cinq formats, <span className="w">une seule question&nbsp;: comment tenir.</span></h2>
          <ul className="lt-formats">
            {FORMATS.map((f) => (
              <li key={f.nom}>
                <img src={`/newsletter/${f.banniere}.png`} alt={`Bannière «\u00a0${f.nom}\u00a0»`} width={1200} height={600} loading="lazy" />
                <h3>{f.nom}</h3>
                <p>{f.texte}</p>
              </li>
            ))}
          </ul>
        </section>

        {/* Les lettres envoyées */}
        <section className="wrap lt-sec" aria-labelledby="archive">
          <h2 id="archive">Les lettres <span className="w">envoyées.</span></h2>
          {lettres.length ? (
            <ol className="lt-list">
              {lettres.map((l) => (
                <li key={l.slug}>
                  <Link href={`/lettre/${l.slug}`}>
                    <img src={`/newsletter/${l.banniere}.png`} alt="" width={1200} height={600} loading="lazy" />
                    <span>
                      <small className="disp">{l.etiquette ? `${l.etiquette} · ` : ""}{dateFr(l.date)}</small>
                      <b>{l.titre}</b>
                      <em>{l.description}</em>
                    </span>
                  </Link>
                </li>
              ))}
            </ol>
          ) : (
            <div className="lt-empty">
              <span className="disp">N° 01</span>
              <p>La première lettre arrive bientôt. Elle paraîtra ici après son envoi&nbsp;: inscris-toi pour la lire en premier.</p>
              <a href="#recevoir" className="link">S&apos;inscrire</a>
            </div>
          )}
        </section>

        <div className="wrap">
          <Abonnement />
        </div>
      </main>
      <Footer />
    </>
  );
}
