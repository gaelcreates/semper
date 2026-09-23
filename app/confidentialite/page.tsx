import type { Metadata } from "next";
import Legal from "../Legal";
import { site } from "../site";

export const metadata: Metadata = { title: "Politique de confidentialité · Semper" };

export default function Page() {
  return (
    <Legal title="Politique de confidentialité" updated="22 septembre 2026">
      <h2>Qui est responsable</h2>
      <p>
        Le site trysemper.app est édité par {site.owner}, {site.postalAddress}. Pour toute question sur tes données,
        écris à <a href={`mailto:${site.contactEmail}`}>{site.contactEmail}</a>.
      </p>

      <h2>Ce que nous collectons</h2>
      <p>
        Une seule donnée : ton adresse e-mail, quand tu la saisis toi-même dans le formulaire de la liste
        d&apos;attente. Nous n&apos;utilisons ni cookies publicitaires ni outil de suivi tiers sur ce site.
      </p>

      <h2>Pourquoi</h2>
      <p>
        Pour te prévenir de l&apos;ouverture de Semper et t&apos;envoyer la lettre « Créer, toujours », qui parle de
        rythme de publication et de ce que nous construisons. Nous nous appuyons sur ton consentement, donné au
        moment de l&apos;inscription. Tu peux le retirer à tout moment.
      </p>

      <h2>Qui y a accès</h2>
      <p>
        Ton adresse est stockée chez Resend, Inc. (États-Unis), le service qui envoie nos e-mails, et le site est
        hébergé par Vercel, Inc. (États-Unis). Ces deux prestataires traitent tes données pour notre compte, sur
        instruction, avec des garanties contractuelles conformes au droit suisse et au droit européen. Nous ne
        vendons ni ne louons aucune donnée.
      </p>

      <h2>Combien de temps</h2>
      <p>
        Tant que tu restes inscrit. Chaque e-mail contient un lien de désabonnement. Dès que tu l&apos;utilises,
        ton adresse est retirée de la liste d&apos;envoi.
      </p>

      <h2>Tes droits</h2>
      <p>
        Tu peux demander l&apos;accès à tes données, leur correction, leur effacement, ou t&apos;opposer à leur
        traitement, en écrivant à <a href={`mailto:${site.contactEmail}`}>{site.contactEmail}</a>. Nous répondons
        dans les trente jours. Ces droits découlent de la loi fédérale suisse sur la protection des données (LPD)
        et, si tu résides dans l&apos;Union européenne, du RGPD. Tu peux aussi saisir l&apos;autorité de contrôle de
        ton pays.
      </p>

      <h2>Modifications</h2>
      <p>
        Si cette politique change, la date en haut de page est mise à jour. Un changement important te sera
        annoncé par e-mail.
      </p>
    </Legal>
  );
}
