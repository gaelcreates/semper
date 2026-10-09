import type { Metadata } from "next";
import Legal from "../../Legal";
import { site } from "../../site";

export const metadata: Metadata = { title: "Politique de confidentialité · Semper" };

export default function Page() {
  return (
    <Legal title="Politique de confidentialité" updated="8 octobre 2026">
      <h2>Qui est responsable</h2>
      <p>
        Le site trysemper.app et l&apos;application Semper sont édités par {site.owner}, {site.postalAddress}. Pour
        toute question sur tes données, écris à <a href={`mailto:${site.contactEmail}`}>{site.contactEmail}</a>.
      </p>

      <h2>La liste et la lettre</h2>
      <p>
        Quand tu laisses ton adresse e-mail dans un formulaire du site, nous la gardons pour te prévenir de
        l&apos;ouverture de Semper et t&apos;envoyer la lettre «&nbsp;Créer, toujours&nbsp;». Nous nous appuyons sur ton
        consentement. Chaque e-mail contient un lien de désabonnement&nbsp;: dès que tu l&apos;utilises, ton adresse
        sort de la liste d&apos;envoi.
      </p>

      <h2>Ton compte Semper</h2>
      <p>Quand tu crées un compte, nous gardons ce qu&apos;il faut pour que l&apos;outil fonctionne&nbsp;:</p>
      <ul>
        <li>ton prénom, ton adresse e-mail, ton pseudo Instagram et ta photo de profil si tu en ajoutes une&nbsp;;</li>
        <li>tes réponses aux questions de l&apos;inscription (pour quoi tu crées, ton rythme, ce qui te bloque)&nbsp;;</li>
        <li>tes contenus&nbsp;: titres, dates, étapes, fiches et scripts&nbsp;;</li>
        <li>les jours où tu ouvres Semper, pour calculer ta série et savoir si l&apos;outil t&apos;aide vraiment&nbsp;;</li>
        <li>pour te connecter, un code à six chiffres, gardé seulement sous forme chiffrée et effacé après usage ou au bout d&apos;une heure.</li>
      </ul>
      <p>
        Ces données servent à faire marcher ton espace, et à nous, pour comprendre qui utilise Semper et
        t&apos;écrire si nous pouvons t&apos;aider. Nous nous appuyons sur l&apos;exécution du service que tu as
        demandé. Nous ne les vendons ni ne les louons, et nous ne faisons pas de publicité.
      </p>

      <h2>Les chiffres Instagram</h2>
      <p>
        Si tu indiques ton pseudo, Semper relève une fois par jour les chiffres publics de ton compte
        professionnel ou créateur (abonnés, publications récentes, vues, mentions J&apos;aime, commentaires) par
        l&apos;interface officielle de Meta. Semper ne se connecte jamais à ton compte et ne publie rien. Un compte
        personnel ne renvoie rien. Retire ton pseudo pour arrêter le relevé.
      </p>

      <h2>Qui y a accès</h2>
      <p>
        Tes données de compte sont stockées chez Supabase, dans un centre de données à Zurich. Les e-mails partent
        par Resend, Inc. (États-Unis), et le site est hébergé par Vercel, Inc. (États-Unis). Les chiffres Instagram
        viennent de Meta Platforms, Inc. Ces prestataires traitent les données pour notre compte, sur instruction,
        avec des garanties contractuelles conformes au droit suisse et au droit européen.
      </p>

      <h2>Cookies et stockage</h2>
      <p>
        Pas de cookie publicitaire ni d&apos;outil de suivi tiers. Ton navigateur garde seulement ta session de
        connexion et ton choix de thème clair ou sombre.
      </p>

      <h2>Combien de temps</h2>
      <p>
        Les données de ton compte restent tant que ton compte existe. Depuis ton Profil, tu peux exporter tes
        contenus et supprimer ton compte&nbsp;: tout part immédiatement et définitivement, relevés Instagram compris.
        Ton adresse reste dans la liste de la lettre jusqu&apos;à ce que tu te désabonnes.
      </p>

      <h2>Tes droits</h2>
      <p>
        Tu peux demander l&apos;accès à tes données, leur correction, leur effacement ou leur transmission, ou
        t&apos;opposer à leur traitement, en écrivant à <a href={`mailto:${site.contactEmail}`}>{site.contactEmail}</a>.
        Nous répondons dans les trente jours. Ces droits découlent de la loi fédérale suisse sur la protection des
        données (LPD) et, si tu résides dans l&apos;Union européenne, du RGPD. Tu peux aussi saisir l&apos;autorité de
        contrôle de ton pays.
      </p>

      <h2>Modifications</h2>
      <p>
        Si cette politique change, la date en haut de page est mise à jour. Un changement important te sera
        annoncé par e-mail.
      </p>
    </Legal>
  );
}
