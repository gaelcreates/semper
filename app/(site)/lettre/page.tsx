import type { Metadata } from "next";
import Link from "next/link";
import { Footer, TopBar } from "../../Frame";
import { site } from "../../site";
import Abonnement from "./Abonnement";
import { dateFr, lettres } from "./lettres";

const description = "Les lettres de Gael Fischer sur la constance des créateurs de contenu : des calendriers ouverts, des règles, des coulisses.";

export const metadata: Metadata = {
  title: "La lettre · Semper",
  description,
  alternates: { canonical: `${site.url}/lettre` },
  openGraph: { title: "La lettre · Semper", description, url: `${site.url}/lettre`, type: "website" },
};

export default function Page() {
  return (
    <>
      <TopBar cta={false} />
      <main className="lettres">
        <div className="wrap narrow">
          <p className="tagline dot-t"><span className="b">Créer,</span> <span className="w">toujours.</span></p>
          <h1>La lettre</h1>
          <p className="story">Ce qui fait tenir un créateur dans la durée.</p>

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
            <p className="lt-empty">La première lettre arrive bientôt.</p>
          )}

          <Abonnement />
        </div>
      </main>
      <Footer />
    </>
  );
}
