import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Footer, TopBar } from "../../../Frame";
import { site } from "../../../site";
import Abonnement from "../Abonnement";
import { dateFr, lettre, lettres, lire } from "../lettres";

// Une page par édition publiée, construite au déploiement. Une adresse inconnue donne 404.
export const dynamicParams = false;
export const generateStaticParams = () => lettres.map((l) => ({ slug: l.slug }));

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const l = lettre((await params).slug);
  if (!l) return {};
  const url = `${site.url}/lettre/${l.slug}`;
  return {
    title: `${l.titre} · Semper`,
    description: l.description,
    alternates: { canonical: url },
    openGraph: { title: l.titre, description: l.description, url, type: "article", publishedTime: l.date, images: [`${site.url}/newsletter/${l.banniere}.png`] },
  };
}

export default async function Page({ params }: Props) {
  const l = lettre((await params).slug);
  if (!l) notFound();
  const { chapo, blocs, ps } = lire(l.slug);
  let n = 0;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: l.titre,
    description: l.description,
    datePublished: l.date,
    inLanguage: "fr",
    image: `${site.url}/newsletter/${l.banniere}.png`,
    author: { "@type": "Person", name: site.owner, url: "https://gaelcreates.ch" },
    publisher: { "@type": "Organization", name: "Semper", url: site.url },
    mainEntityOfPage: `${site.url}/lettre/${l.slug}`,
  };

  return (
    <>
      <TopBar cta={false} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <main className="lettres">
        <article className="wrap narrow lt">
          <Link href="/lettre" className="link lt-back">La lettre</Link>
          <img className="lt-banner" src={`/newsletter/${l.banniere}.png`} alt="" width={1200} height={600} />
          <small className="disp lt-meta">{l.etiquette ? `${l.etiquette} · ` : ""}{dateFr(l.date)}</small>
          <h1>{l.titre}</h1>
          {chapo && <p className="lt-chapo">{chapo}</p>}

          <div className="lt-body">
            {blocs.map((b, i) => {
              switch (b.t) {
                case "h":
                  return <h2 key={i}><span className="disp">{String(++n).padStart(2, "0")}</span><span dangerouslySetInnerHTML={{ __html: b.html }} /></h2>;
                case "retenir":
                  return <p key={i} className="lt-retenir" dangerouslySetInnerHTML={{ __html: b.html }} />;
                case "etapes":
                  return <ol key={i} className="lt-etapes">{b.items.map((e, j) => <li key={j}><span className="disp">{String(j + 1).padStart(2, "0")}</span><span dangerouslySetInnerHTML={{ __html: e }} /></li>)}</ol>;
                case "bouton":
                  return <p key={i}><a className="btn" href={b.href}>{b.texte}</a></p>;
                case "img":
                  return <img key={i} className="lt-img" src={b.src} alt={b.alt} />;
                default:
                  return <p key={i} dangerouslySetInnerHTML={{ __html: b.html }} />;
              }
            })}
          </div>

          <footer className="lt-sign">
            <b>Gael</b>
            <small className="disp">Créer, toujours</small>
            {ps.map((p, i) => <p key={i} dangerouslySetInnerHTML={{ __html: p }} />)}
          </footer>

          <Abonnement />
        </article>
      </main>
      <Footer />
    </>
  );
}
