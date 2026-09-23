import type { Metadata } from "next";
import Legal from "../Legal";
import { site } from "../site";

export const metadata: Metadata = { title: "Conditions d'utilisation · Semper" };

export default function Page() {
  return (
    <Legal title="Conditions d'utilisation" updated="22 septembre 2026">
      <h2>Ce que couvre ce texte</h2>
      <p>
        Ces conditions s&apos;appliquent au site sempr.app et à sa liste d&apos;attente. Les conditions de
        l&apos;application Semper elle-même te seront présentées à la création de ton compte, le jour de
        l&apos;ouverture.
      </p>

      <h2>La liste d&apos;attente</h2>
      <p>
        En laissant ton adresse e-mail, tu demandes à être prévenu de l&apos;ouverture de Semper et à recevoir la
        lettre « Créer, toujours ». L&apos;inscription est gratuite, sans engagement, et tu peux te désabonner à
        tout moment depuis n&apos;importe quel e-mail. Être inscrit ne garantit ni une date d&apos;ouverture ni
        l&apos;accès à une fonctionnalité précise : le produit évolue, et ce que nous annonçons peut changer.
      </p>

      <h2>Ce qui nous appartient</h2>
      <p>
        Le nom Semper, le signe, les textes, le design et le code du site sont la propriété de {site.owner}. Tu
        peux les citer, les partager et en parler librement. Tu ne peux pas les reproduire pour un autre service
        ni laisser entendre que Semper soutient une offre qui n&apos;est pas la nôtre.
      </p>

      <h2>Ce que nous ne garantissons pas</h2>
      <p>
        Le site est fourni tel quel. Nous faisons tout pour qu&apos;il soit disponible et exact, sans pouvoir
        promettre une disponibilité permanente. Dans les limites du droit applicable, notre responsabilité pour un
        dommage indirect lié à l&apos;usage de ce site est exclue.
      </p>

      <h2>Droit applicable</h2>
      <p>
        Ces conditions sont soumises au droit suisse. En cas de litige, les tribunaux du canton de Vaud sont
        compétents, sous réserve des dispositions impératives qui protègent les consommateurs de ton pays de
        résidence.
      </p>

      <h2>Contact</h2>
      <p>
        Une question ? Écris à <a href={`mailto:${site.contactEmail}`}>{site.contactEmail}</a>.
      </p>
    </Legal>
  );
}
