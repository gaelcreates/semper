import type { Metadata } from "next";
import { Footer, TopBar } from "../Frame";
import Mark from "../Mark";
import MarkDots from "../MarkDots";
import DotIcon from "../DotIcon";

export const metadata: Metadata = { title: "Système · Semper", robots: { index: false, follow: false } };

// Le système « Suisse matricielle » à plat : chaque règle, un exemple, une phrase.
// Page de travail, hors index. Le papier porte, la matrice compte.
export default function Page() {
  return (
    <>
      <TopBar cta={false} />
      <main className="sg">
        <div className="wrap">
          <header className="sg-head">
            <p className="lbl disp">Système · branche pixel</p>
            <h1>Suisse matricielle.</h1>
            <p className="story">Deux familles, une unité. Le papier suisse porte le sens : Suisse Intl, blanc cassé, coins ronds, mouvement fluide. La matrice compte : Doto, points, coins droits, mouvement par pas. Le point est l&apos;unité de tout.</p>
          </header>

          <section>
            <h2>La grille</h2>
            <p className="sg-rule">Unité de 8 px. Le fond bat au pas de 24 px, soit trois unités. Un point de série fait une unité. Tout espacement est un multiple de 8.</p>
            <div className="sg-row">
              <div className="sg-box"><div className="sg-grid"><i /></div><span className="lbl disp">Pas 24 · point 1,5 px · allumé 8 px</span></div>
            </div>
          </section>

          <section>
            <h2>Les couleurs</h2>
            <p className="sg-rule">Trois couleurs. L&apos;or est le seul signal et n&apos;apparaît qu&apos;une fois par écran : ce qui est allumé, ce qui compte maintenant.</p>
            <div className="sg-row">
              <div className="sg-box"><div className="sg-sw" style={{ background: "#f5f5f5" }} /><span className="lbl disp">Papier · F5F5F5</span></div>
              <div className="sg-box"><div className="sg-sw" style={{ background: "#0e0e0e" }} /><span className="lbl disp">Encre · 0E0E0E</span></div>
              <div className="sg-box"><div className="sg-sw" style={{ background: "#ffc508" }} /><span className="lbl disp">Or · FFC508 · allumé</span></div>
            </div>
          </section>

          <section className="sg-type">
            <h2>Le papier : Suisse Intl</h2>
            <p className="sg-rule">Tout ce qui se lit. Titres en Black, second mot en Light, corps en Light. Jamais de points dans une phrase.</p>
            <div className="sg-paper">
              <p style={{ fontSize: 56, fontWeight: 900, letterSpacing: "-0.035em", lineHeight: 1 }}>Reste régulier. <span className="w">Pour de bon.</span></p>
              <p style={{ fontSize: 34, fontWeight: 900, letterSpacing: "-0.03em" }}>Un calendrier qui tient ton rythme. <span className="w">Pas un logiciel de plus.</span></p>
              <p className="story">Tu sais quoi filmer. Ce qui te fait décrocher, c&apos;est de tenir le rythme semaine après semaine.</p>
            </div>
          </section>

          <section className="sg-type">
            <h2>La matrice : Doto</h2>
            <p className="sg-rule">Tout ce qui compte. Chiffres de 20 à 60 px, étiquettes de 12 px en capitales espacées. Jamais au-dessus de 60 px, jamais dans un titre. Doto est libre, sur Google Fonts, variable, points ronds à fond.</p>
            <div className="sg-row">
              <div className="sg-disp">
                <span className="disp sg-num">75 %</span>
                <span className="disp sg-num m">883</span>
                <span className="disp sg-num s">Lun 21 · 19 h</span>
                <span className="lbl disp">Série · 7 semaines</span>
              </div>
              <div className="sg-dark sg-disp">
                <span className="disp sg-num">52 %</span>
                <span className="lbl disp" style={{ color: "#ffc508" }}>Maintenant</span>
              </div>
            </div>
          </section>

          <section>
            <h2>Deux cartes</h2>
            <p className="sg-rule">Papier : coins de 20 px, ombre douce, texte. Afficheur : coins de 4 px, pas d&apos;ombre, chiffres et barres. On ne mélange pas les deux dans une même carte.</p>
            <div className="sg-row">
              <div className="sg-card paper"><h3 style={{ marginBottom: 6 }}>Une fiche par vidéo</h3><p className="story" style={{ fontSize: 15 }}>Chaque contenu avance par statut, de l&apos;idée à la publication.</p></div>
              <div className="sg-card disp"><span className="lbl disp">Série</span><span className="disp sg-num s">7 <span style={{ fontFamily: "var(--font-intl)", fontWeight: 300, fontSize: 13 }}>semaines</span></span><i className="bar"><i /></i></div>
            </div>
          </section>

          <section>
            <h2>La série</h2>
            <p className="sg-rule">Un point par semaine. Éteint, allumé en or, en cours en pointillé. Aucun chiffre de volume, seulement des semaines tenues.</p>
            <div className="weeks sg-weeks">
              {Array.from({ length: 12 }, (_, i) => <i key={i} className={i < 7 ? "on" : i === 7 ? "now" : ""} />)}
              <div className="weeks-l"><span>Semaine 32</span><span>Semaine 43</span></div>
            </div>
          </section>

          <section>
            <h2>Les icônes</h2>
            <p className="sg-rule">Chaque icône est un bitmap de cinq points sur cinq. Même point, même grille que le fond. Pas de traits, pas de contours.</p>
            <div className="sg-icons">
              {(["semaine", "idee", "serie", "script", "reglages", "plus", "check", "fleche"] as const).map((n) => <div key={n}><DotIcon name={n} /><span>{n}</span></div>)}
            </div>
          </section>

          <section>
            <h2>Le signe</h2>
            <p className="sg-rule">Le cercle ouvert et son point. En trait sur le papier (logo, barre, boutons). En points sur la matrice (chargement, dernier appel) : les points s&apos;allument à la suite.</p>
            <div className="sg-marks"><Mark /><MarkDots /><span style={{ color: "#ffc508" }}><MarkDots spin /></span></div>
          </section>

          <section>
            <h2>Le mouvement</h2>
            <p className="sg-rule">Le papier glisse, avec une courbe douce. La matrice s&apos;allume par pas de huit, comme un afficheur. Un chiffre qui monte, une barre qui se remplit, une semaine qui s&apos;allume : par pas.</p>
            <div className="sg-motion"><div className="paper"><i /></div><div className="disp"><i /></div></div>
          </section>

          <section>
            <h2>Ce qu&apos;on ne fait pas</h2>
            <ul className="sg-donts">
              <li>Des points dans un titre ou une phrase.</li>
              <li>De l&apos;or à deux endroits sur un même écran.</li>
              <li>Des pixels carrés, des scanlines, du néon, un effet CRT.</li>
              <li>Une police à points au-dessus de 60 px.</li>
              <li>Une carte qui mélange papier et afficheur.</li>
            </ul>
          </section>
        </div>
      </main>
      <Footer />
    </>
  );
}
