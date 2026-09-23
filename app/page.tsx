import AppView from "./AppView";
import { Footer, TopBar } from "./Frame";
import JoinForm from "./JoinForm";
import Loader from "./Loader";
import Mark from "./Mark";
import Curve from "./Curve";
import Stand from "./Stand";
import Tracker from "./Tracker";
import { site } from "./site";

const steps = ["Idée", "À écrire", "À tourner", "À monter", "Publié"];
const truths = ["Une fiche par vidéo", "Trois vues, une seule vérité", "Ta série compte les semaines", "Zéro configuration", "Sauvegarde immédiate", "Gratuit pour le créateur seul", "Sur ton téléphone"];

const faq = [
  { q: "C'est vraiment gratuit ?", a: "Oui. Pour un créateur seul, sans limite de fiches et sans carte bancaire. Les espaces d'équipe arriveront plus tard dans une offre payante. Le créateur seul reste gratuit." },
  { q: "Quand est-ce que ça ouvre ?", a: "Bientôt, sans date annoncée pour ne pas en promettre une fausse. Les inscrits sur la liste sont prévenus en premier et entrent en premier." },
  { q: "Ça marche sur mon téléphone ?", a: "Oui, dans ton navigateur, dès le premier jour. Pas de store, pas de téléchargement. Tu peux l'ajouter à ton écran d'accueil comme une application." },
  { q: "Est-ce que Semper publie à ma place ?", a: "Non. Semper organise, suit et compte. Tu publies toi-même sur tes plateformes, comme aujourd'hui. Aucune connexion à tes comptes n'est demandée." },
  { q: "Et mes données ?", a: "Chaque geste est sauvegardé immédiatement. Tes fiches t'appartiennent et tu peux demander leur suppression à tout moment, voir la page Confidentialité." },
  { q: "Pourquoi une série et pas des points ?", a: "Parce que ce qui fait grandir un compte, c'est la constance, pas le volume. Semper compte les semaines tenues à ton rythme, jamais le nombre de vidéos." },
];

// Données structurées pour Google, Bing et les assistants IA : qui est Semper, ce que c'est, et la FAQ.
const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    { "@type": "Organization", "@id": `${site.url}/#org`, name: "Semper", url: site.url, logo: `${site.url}/icon.svg`, email: site.contactEmail, address: { "@type": "PostalAddress", addressRegion: "Vaud", addressCountry: "CH" } },
    { "@type": "WebSite", "@id": `${site.url}/#site`, url: site.url, name: "Semper", inLanguage: "fr", publisher: { "@id": `${site.url}/#org` } },
    { "@type": "SoftwareApplication", name: "Semper", url: site.url, applicationCategory: "BusinessApplication", operatingSystem: "Web", inLanguage: "fr", description: site.description, offers: { "@type": "Offer", price: "0", priceCurrency: "CHF" }, publisher: { "@id": `${site.url}/#org` } },
    { "@type": "FAQPage", mainEntity: faq.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })) },
  ],
};

// Fil qui relie deux sections : la ligne se trace quand on arrive dessus.
function Join() {
  return (
    <div className="join" aria-hidden="true">
      <i className="join-line" />
      <i className="join-dot" />
    </div>
  );
}


export default function Page() {
  return (
    <>
      <Loader />
      <TopBar />

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <main>
        {/* ---------- 00 · Accueil */}
        <section className="hero" id="haut">
          <div className="wrap hero-in">
            <span className="pill fade"><i className="dot" /> Ouverture bientôt · Gratuit pour les créateurs</span>
            <h1 className="title">
              <span className="line"><span className="b">Reste régulier.</span></span>{" "}
              <span className="line"><span className="w">Pour de bon.</span></span>
            </h1>
            <p className="lead fade d1">
              Tu sais quoi filmer. Ce qui te fait décrocher, c&apos;est de tenir le rythme semaine après semaine.
              Semper suit chaque vidéo de l&apos;idée à la publication, et compte chaque semaine tenue.
            </p>
            <div className="hero-form fade d2" id="rejoindre">
              <JoinForm />
              <p className="fine">Gratuit · Sans carte bancaire · Tu seras prévenu à l&apos;ouverture</p>
            </div>
          </div>

          <div className="wrap mock-wrap">
            <AppView />
            <Stand />
          </div>
        </section>

        {/* ---------- 01 · Le vrai problème (bloc sombre, l'aperçu déborde dessus) */}
        <section className="s dark problem" id="probleme">
          <Curve />
          <div className="wrap center">
            <h2 data-reveal style={{ ["--i" as string]: 1 }}>Tu ne manques ni d&apos;idées, <span className="w">ni de motivation.</span></h2>
            <p className="story" data-reveal style={{ ["--i" as string]: 2 }}>
              Tu ne vois juste pas ton stock se vider. Une semaine chargée, un système bricolé dans les notes
              du téléphone, une pause « temporaire » qui s&apos;installe. Ce n&apos;est pas un problème de talent.
              C&apos;est un problème de rythme.
            </p>
            <ul className="stats">
              <li className="glass" data-spot data-reveal style={{ ["--i" as string]: 3 }}>
                <b><span data-count="75">75</span> %</b>
                <p>des créateurs se sentent pénalisés par les plateformes dès qu&apos;ils ralentissent.</p>
                <small>Patreon, State of Create, 2025</small>
              </li>
              <li className="glass" data-spot data-reveal style={{ ["--i" as string]: 4 }}>
                <b><span data-count="52">52</span> %</b>
                <p>ont déjà connu un burnout. Un sur trois envisage d&apos;arrêter.</p>
                <small>Billion Dollar Boy, juillet 2025, 1 000 créateurs</small>
              </li>
              <li className="glass" data-spot data-reveal style={{ ["--i" as string]: 5 }}>
                <b><span data-count="883">883</span></b>
                <p>calendriers bricolés en vente sur le seul Marketplace Notion, faute d&apos;outil pensé pour eux.</p>
                <small>Relevé du 24 août 2026</small>
              </li>
            </ul>
          </div>
        </section>

        {/* ---------- Ruban des statuts */}
        <div className="band" aria-hidden="true">
          <div className="band-track">
            {[0, 1, 2, 3].map((k) => (
              <div className="band-run" key={k}>
                {truths.map((t) => (
                  <span key={t}><Mark /> {t}</span>
                ))}
              </div>
            ))}
          </div>
        </div>

        {/* ---------- 02 · L'outil */}
        <section className="s" id="produit">
          <div className="wrap">
            <div className="head">
              <h2 data-reveal style={{ ["--i" as string]: 1 }}>Un calendrier qui tient ton rythme. <span className="w">Pas un logiciel de plus.</span></h2>
              <p className="story" data-reveal style={{ ["--i" as string]: 2 }}>
                Une fiche par vidéo, trois vues sur les mêmes fiches, et une série qui compte tes semaines. Rien à configurer.
              </p>
            </div>

            <div className="cards">
              <article className="card" data-spot data-reveal style={{ ["--i" as string]: 1 }}>
                <div className="cv cv-fiche">
                  <div className="fiche">
                    <div className="fiche-t">Pourquoi tu t&apos;arrêtes</div>
                    <div className="fiche-m"><span>Instagram</span><span>Lun 21 · 19 h</span></div>
                    <div className="fiche-steps">
                      {steps.map((s, i) => <span key={s} className={`chip st st${i}`}>{s}</span>)}
                    </div>
                  </div>
                </div>
                <h3>Une fiche par vidéo</h3>
                <p>Chaque contenu avance par statut, de l&apos;idée à la publication. La fiche et les statuts s&apos;adaptent à ta façon de travailler.</p>
              </article>

              <article className="card" data-spot data-reveal style={{ ["--i" as string]: 2 }}>
                <div className="cv cv-views">
                  <div className="vw v1"><i /><i /><i /><i /><i /><i /><i /></div>
                  <div className="vw v2"><i /><i /><i /></div>
                  <div className="vw v3"><i /><i /><i /><i /></div>
                  <div className="vw-tabs"><span>Calendrier</span><span>Kanban</span><span>Liste</span></div>
                </div>
                <h3>Trois vues, une seule vérité</h3>
                <p>Liste, kanban ou calendrier, sur les mêmes fiches. La semaine par défaut, parce que c&apos;est là que tu travailles.</p>
              </article>

              <article className="card gold" data-spot data-reveal style={{ ["--i" as string]: 3 }}>
                <div className="cv cv-serie">
                  <div className="serie-n"><b>7</b><span>semaines<br />tenues</span></div>
                  <div className="streak-row">
                    {Array.from({ length: 8 }).map((_, i) => <i key={i} className={i < 7 ? "on" : "now"} />)}
                  </div>
                </div>
                <h3>Ta série</h3>
                <p>Tu fixes ton rythme. Chaque semaine tenue compte. Semper ne récompense jamais le volume, seulement la constance.</p>
              </article>
            </div>

            <ul className="promises">
              <li data-reveal style={{ ["--i" as string]: 1 }}><Mark /><span>Gratuit, sans limite pour un créateur seul.</span></li>
              <li data-reveal style={{ ["--i" as string]: 2 }}><Mark /><span>Aucune perte de données. Chaque geste est sauvegardé immédiatement.</span></li>
              <li data-reveal style={{ ["--i" as string]: 3 }}><Mark /><span>Sur ton téléphone dès le premier jour, sans passer par un store.</span></li>
            </ul>
          </div>
        </section>

        <Join />

        {/* ---------- 03 · Comment ça marche */}
        <section className="s" id="methode">
          <div className="wrap">
            <div className="head">
              <h2 data-reveal style={{ ["--i" as string]: 1 }}>Trois gestes. <span className="w">Chaque semaine.</span></h2>
              <p className="story" data-reveal style={{ ["--i" as string]: 2 }}>
                Pas de formation, pas de réglages. Tu notes, tu fais avancer, tu tiens ta semaine.
              </p>
            </div>
            <ol className="steps">
              <li className="card" data-spot data-reveal style={{ ["--i" as string]: 1 }}>
                <span className="step-n">1</span>
                <h3>Note l&apos;idée</h3>
                <p>Une fiche en un geste, depuis ton téléphone ou ton ordinateur. Titre, plateforme, date. Le reste attendra.</p>
                <div className="step-v"><span className="chip s-idee">Idée</span><b>Le piège du volume</b></div>
              </li>
              <li className="card" data-spot data-reveal style={{ ["--i" as string]: 2 }}>
                <span className="step-n">2</span>
                <h3>Fais-la avancer</h3>
                <p>À écrire, à tourner, à monter, publié. Tu changes le statut, dans la vue que tu préfères. Rien d&apos;autre à faire.</p>
                <div className="step-v steps-v">{steps.map((st, i) => <span key={st} className={`chip st st${i}`}>{st}</span>)}</div>
              </li>
              <li className="card" data-spot data-reveal style={{ ["--i" as string]: 3 }}>
                <span className="step-n">3</span>
                <h3>Tiens ta semaine</h3>
                <p>Tu as fixé ton rythme. Chaque semaine tenue allonge ta série. Une semaine, jamais un volume.</p>
                <div className="step-v"><div className="streak-row">{Array.from({ length: 8 }).map((_, i) => <i key={i} className={i < 7 ? "on" : "now"} />)}</div><b>7 semaines</b></div>
              </li>
            </ol>
          </div>
        </section>

        <Join />

        {/* ---------- 04 · La mission (île sombre) */}
        <section className="s dark island" id="mission">
          <div className="wrap mission">
            <div className="mission-text">
              <h2 data-reveal style={{ ["--i" as string]: 1 }}>La régularité <span className="w">bat le volume.</span></h2>
              <p className="story strong" data-reveal style={{ ["--i" as string]: 2 }}>
                Semper vient du latin. Toujours. Le marché organise la publication pour des équipes marketing.
                Personne ne s&apos;occupe du créateur seul, du moment où l&apos;idée arrive au moment où la vidéo sort.
                C&apos;est là que tout se joue, et c&apos;est là que Semper commence.
              </p>
              <p className="story" data-reveal style={{ ["--i" as string]: 3 }}>
                Construit par un créateur, pour les créateurs. Pas de tableau de bord intimidant, pas de
                configuration, pas de récompense au volume. Un outil sobre, soigné, qui fait une chose et la fait bien.
              </p>
            </div>

            <ol className="roadmap">
              <li data-reveal style={{ ["--i" as string]: 1 }}>
                <span className="rm-now">Maintenant</span>
                <h3>Le calendrier et la série</h3>
                <p>Les fiches, les trois vues, ton rythme. Gratuit pour toujours pour le créateur seul.</p>
              </li>
              <li data-reveal style={{ ["--i" as string]: 2 }}>
                <span>Ensuite</span>
                <h3>Les structures de script</h3>
                <p>Des modèles de script prêts à l&apos;emploi, les tiens et ceux d&apos;autres créateurs, à dupliquer en un geste.</p>
              </li>
              <li data-reveal style={{ ["--i" as string]: 3 }}>
                <span>Ensuite</span>
                <h3>Le bilan de tes semaines</h3>
                <p>Le lien de ta publication, tes vues, et ce que ça dit de ton rythme. Sans usine à gaz.</p>
              </li>
              <li data-reveal style={{ ["--i" as string]: 4 }}>
                <span>Plus tard</span>
                <h3>Les espaces d&apos;équipe</h3>
                <p>Monteur, assistant, invité. La collaboration arrivera dans une offre payante. Le créateur seul reste gratuit.</p>
              </li>
            </ol>
          </div>
        </section>

        <Join />

        {/* ---------- 05 · Questions */}
        <section className="s" id="questions">
          <div className="wrap faq-wrap">
            <div className="faq-head">
              <h2 data-reveal style={{ ["--i" as string]: 1 }}>Ce qu&apos;on nous demande <span className="w">avant d&apos;entrer.</span></h2>
              <p className="story" data-reveal style={{ ["--i" as string]: 2 }}>Des réponses courtes et honnêtes. Le reste, tu le verras dedans.</p>
            </div>
            <div className="faq" data-reveal style={{ ["--i" as string]: 2 }}>
              {faq.map((q) => (
                <details key={q.q} className="qa">
                  <summary>{q.q}<i /></summary>
                  <p>{q.a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        <Join />

        {/* ---------- 06 · Dernier appel */}
        <section className="s final" id="rejoindre-2">
          <div className="wrap center">
            <Tracker />
            <h2 data-reveal style={{ ["--i" as string]: 1 }}>Ta prochaine série <span className="w">commence ici.</span></h2>
            <p className="story" data-reveal style={{ ["--i" as string]: 2 }}>
              Ouverture bientôt. Les premiers inscrits entrent en premier.
            </p>
            <div className="final-form" data-reveal style={{ ["--i" as string]: 3 }}>
              <JoinForm label="Me prévenir à l'ouverture" />
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
}
