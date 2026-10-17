import AppDemo from "../AppDemo";
import { Footer, TopBar } from "../Frame";
import JoinForm from "../JoinForm";
import Loader from "../Loader";
import Mark from "../Mark";
import Curve from "../Curve";
import Stand from "../Stand";
import Orbit from "../Orbit";
import LaunchDate from "../Launch";
import { isOpen, site } from "../site";
import Link from "next/link";
import { FORMATS, lettres } from "./lettre/lettres";

const steps = ["Idée", "À écrire", "À tourner", "À monter", "Publié"];
const OPEN = "26 octobre";

const faqOf = (open: boolean) => [
  { q: "C'est vraiment gratuit\u00a0?", a: "Oui. Pour un créateur seul, sans limite de fiches et sans carte bancaire. Les espaces d'équipe arriveront plus tard dans une offre payante. Le créateur seul reste gratuit." },
  open
    ? { q: "C'est ouvert\u00a0?", a: "Oui, depuis le 26 octobre 2026. Crée ton compte en une minute, sans carte bancaire." }
    : { q: "Quand est-ce que ça ouvre\u00a0?", a: "Le 26 octobre 2026. Les inscrits sur la liste sont prévenus en premier et entrent en premier." },
  { q: "Ça marche sur mon téléphone\u00a0?", a: "Oui, dans ton navigateur, dès le premier jour. Pas de store, pas de téléchargement. Tu peux l'ajouter à ton écran d'accueil comme une application." },
  { q: "Semper marche avec Claude\u00a0?", a: "Oui. Dans ton Profil, tu crées ton adresse Semper et tu la colles dans Claude, rubrique Connecteurs. Claude lit ta semaine, crée tes vidéos, écrit tes scripts et les fait avancer. Il ne publie rien à ta place." },
  { q: "Est-ce que Semper publie à ma place\u00a0?", a: "Non. Semper organise, suit et compte. Tu publies toi-même sur tes plateformes, comme aujourd'hui. Aucune connexion à tes comptes n'est demandée." },
  { q: "Et mes données\u00a0?", a: "Chaque geste est sauvegardé immédiatement. Tes fiches t'appartiennent et tu peux demander leur suppression à tout moment, voir la page Confidentialité." },
  { q: "Pourquoi une série et pas des points\u00a0?", a: "Parce que ce qui fait grandir un compte, c'est la constance, pas le volume. Semper compte tes jours tenus et tes semaines à ton rythme, jamais le nombre de vidéos." },
];

// Données structurées pour Google, Bing et les assistants IA : qui est Semper, ce que c'est, et la FAQ.
const jsonLdOf = (faq: { q: string; a: string }[]) => ({
  "@context": "https://schema.org",
  "@graph": [
    { "@type": "Organization", "@id": `${site.url}/#org`, name: "Semper", url: site.url, logo: `${site.url}/icon.svg`, email: site.contactEmail, address: { "@type": "PostalAddress", addressRegion: "Vaud", addressCountry: "CH" } },
    { "@type": "WebSite", "@id": `${site.url}/#site`, url: site.url, name: "Semper", inLanguage: "fr", publisher: { "@id": `${site.url}/#org` } },
    { "@type": "SoftwareApplication", name: "Semper", url: site.url, applicationCategory: "BusinessApplication", operatingSystem: "Web", inLanguage: "fr", description: site.description, offers: { "@type": "Offer", price: "0", priceCurrency: "CHF" }, publisher: { "@id": `${site.url}/#org` } },
    { "@type": "FAQPage", mainEntity: faq.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })) },
  ],
});

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
  const open = isOpen();
  const faq = faqOf(open);
  const jsonLd = jsonLdOf(faq);
  return (
    <>
      <Loader />
      <TopBar home />

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />

      <main>
        {/* ---------- 00 · Accueil */}
        <section className="hero" id="haut">
          <div className="wrap hero-in">
            <LaunchDate open={open} />
            <h1 className="title">
              <span className="line"><span className="b">Reste régulier.</span></span>{" "}
              <span className="line"><span className="w">Pour de bon.</span></span>
            </h1>
            <p className="lead fade d1">
              Tu sais quoi filmer. Ce qui te fait décrocher, c&apos;est de tenir le rythme semaine après semaine.
              Semper suit chaque vidéo de l&apos;idée à la publication, et compte chaque jour tenu.
              Et c&apos;est entièrement gratuit.
            </p>
            {open ? (
              <div className="hero-form fade d2" id="rejoindre">
                <Link href="/commencer" className="btn btn-big">Créer mon compte</Link>
                <p className="fine">100 % gratuit · Sans carte bancaire · Prêt en une minute</p>
              </div>
            ) : (
              <div className="hero-form fade d2" id="rejoindre">
                <JoinForm />
                <p className="fine">100 % gratuit · Sans carte bancaire · Ouverture le {OPEN}</p>
              </div>
            )}
          </div>

          <div className="wrap mock-wrap">
            <AppDemo />
            <Stand />
          </div>
        </section>

        {/* ---------- 01 · Le vrai problème (bloc sombre, l'aperçu déborde dessus) */}
        <section className="s problem" id="probleme">
          <Curve />
          <div className="wrap center">
            <h2 data-reveal style={{ ["--i" as string]: 1 }}>Tu ne manques ni d&apos;idées, <span className="w">ni de motivation.</span></h2>
            <p className="story" data-reveal style={{ ["--i" as string]: 2 }}>
              Tu ne vois juste pas ton stock se vider. Une semaine chargée, un système bricolé dans les notes
              du téléphone, une pause «&nbsp;temporaire&nbsp;» qui s&apos;installe. Ce n&apos;est pas un problème de talent.
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


        <Join />

        {/* ---------- 03 · Comment ça marche */}
        <section className="s" id="methode">
          <div className="wrap">
            <div className="head">
              <h2 data-reveal style={{ ["--i" as string]: 1 }}>Trois gestes. <span className="w">Chaque semaine.</span></h2>
              <p className="story" data-reveal style={{ ["--i" as string]: 2 }}>
                Pas de formation, pas de réglages. Tu notes, tu fais avancer, tu tiens ton rythme.
              </p>
            </div>
            <ol className="steps">
              <li className="card" data-spot data-reveal style={{ ["--i" as string]: 1 }}>
                <span className="step-n">1</span>
                <h3>Note l&apos;idée</h3>
                <p>Une fiche en un geste, depuis ton téléphone ou ton ordinateur. Titre, objectif, date. Le reste attendra.</p>
                <div className="step-v"><span className="chip s-idee">Idée</span><b className="type">Le piège du volume</b></div>
              </li>
              <li className="card" data-spot data-reveal style={{ ["--i" as string]: 2 }}>
                <span className="step-n">2</span>
                <h3>Fais-la avancer</h3>
                <p>À écrire, à tourner, à monter, publié. Tu changes le statut, dans la vue que tu préfères. Rien d&apos;autre à faire.</p>
                <div className="step-v steps-v">{steps.map((st, i) => <span key={st} className={`chip st st${i}`}>{st}</span>)}</div>
              </li>
              <li className="card" data-spot data-reveal style={{ ["--i" as string]: 3 }}>
                <span className="step-n">3</span>
                <h3>Tiens ton rythme</h3>
                <p>Chaque jour tenu fait grandir ta lune. Un jour raté, un joker le couvre. Jamais un volume.</p>
                <div className="step-v"><div className="streak-row">{Array.from({ length: 8 }).map((_, i) => <i key={i} className={i < 7 ? "on" : "now"} />)}</div><b>7 jours</b></div>
              </li>
            </ol>
            <ul className="promises">
              <li data-reveal style={{ ["--i" as string]: 1 }}><Mark /><span>Gratuit, sans limite pour un créateur seul.</span></li>
              <li data-reveal style={{ ["--i" as string]: 2 }}><Mark /><span>Aucune perte de données. Chaque geste est sauvegardé immédiatement.</span></li>
              <li data-reveal style={{ ["--i" as string]: 3 }}><Mark /><span>Sur ton téléphone dès le premier jour, sans passer par un store.</span></li>
            </ul>
          </div>
        </section>

        <Join />

        {/* ---------- 03 bis · Claude */}
        <section className="s" id="claude">
          <div className="wrap claude">
            <div className="claude-text">
              <h2 data-reveal style={{ ["--i" as string]: 1 }}>Claude parle à Semper. <span className="w">Directement.</span></h2>
              <p className="story" data-reveal style={{ ["--i" as string]: 2 }}>
                Un connecteur intégré&nbsp;: ton adresse Semper se colle dans Claude, rubrique Connecteurs. Claude lit ta semaine,
                crée tes fiches, écrit tes scripts et les fait avancer. Il ne publie rien à ta place.
              </p>
            </div>
            <div className="cl-win" aria-hidden="true" data-reveal style={{ ["--i" as string]: 3 }}>
              <div className="cl-top"><span className="cl-dots"><i /><i /><i /></span><span>Claude</span></div>
              <div className="cl-body">
                <p className="cl-me">Qu&apos;est-ce qui sort cette semaine sur Semper&nbsp;?</p>
                <div className="cl-ai">
                  <span className="cl-tool"><i />Semper · lire_semaine</span>
                  <p>Une vidéo jeudi à 18&nbsp;h&nbsp;: «&nbsp;3 erreurs de calendrier&nbsp;». Le tournage est prévu demain à 9&nbsp;h, et le script n&apos;est pas encore écrit.</p>
                </div>
                <p className="cl-me">Écris-le en problème-solution.</p>
                <div className="cl-ai">
                  <span className="cl-tool"><i />Semper · modifier_contenu</span>
                  <p>C&apos;est fait. Le script est dans ta fiche, en trois parties&nbsp;: le problème, la solution, l&apos;appel à l&apos;action.</p>
                </div>
              </div>
              <div className="cl-input"><span>Répondre à Claude…</span><i /></div>
            </div>
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
                <span className="rm-now">Maintenant</span>
                <h3>Les structures de script</h3>
                <p>Tes modèles de script, reliés à ta fiche. Tu écris chaque vidéo en suivant ta structure.</p>
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

        {/* ---------- La lettre : l'inscription, puis l'accès à l'archive */}
        <section className="s lettre-sec" id="lettre">
          <div className="wrap lb">
            <div className="lb-text">
              <p className="tagline dot-t" data-reveal style={{ ["--i" as string]: 0 }}><span className="b">La</span> <span className="w">lettre.</span></p>
              <h2 data-reveal style={{ ["--i" as string]: 1 }}>Chaque dimanche, <span className="w">une lettre sur la constance.</span></h2>
              <p className="story" data-reveal style={{ ["--i" as string]: 2 }}>
                Le calendrier d&apos;un créateur ouvert, une règle à appliquer dans la semaine, les coulisses de Semper. Pour tenir, pas pour produire plus.
              </p>
              <div className="lb-form" data-reveal style={{ ["--i" as string]: 3 }}>
                <JoinForm label="Recevoir la lettre" done="C'est noté. La prochaine lettre arrive dans ta boîte." />
                <Link href="/lettre" className="link lb-more">
                  {lettres.length ? `Lire les lettres · dernière\u00a0: ${lettres[0].titre}` : "Découvrir la lettre"}
                </Link>
              </div>
            </div>
            <Link href="/lettre" className="lb-fan" aria-label="Découvrir la lettre" data-reveal style={{ ["--i" as string]: 2 }}>
              {FORMATS.slice(0, 4).map((f, i) => (
                <img key={f.nom} src={`/newsletter/${f.banniere}.png`} alt="" width={1200} height={600} loading="lazy" style={{ ["--k" as string]: i }} />
              ))}
            </Link>
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
            <span className="final-mark"><Orbit size={96} lap={6} trail={220} /></span>
            <h2 data-reveal style={{ ["--i" as string]: 1 }}>Ta prochaine série <span className="w">commence ici.</span></h2>
            <p className="story" data-reveal style={{ ["--i" as string]: 2 }}>
              {open ? "C'est ouvert. Ta première semaine commence aujourd'hui." : `Ouverture le ${OPEN}. Les premiers inscrits entrent en premier.`}
            </p>
            <div className="final-form" data-reveal style={{ ["--i" as string]: 3 }}>
              {open ? <Link href="/commencer" className="btn btn-big">Créer mon compte</Link> : <JoinForm label="Me prévenir à l'ouverture" />}
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
}
