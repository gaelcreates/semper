import type { Metadata } from "next";
import Legal from "../../Legal";
import { site } from "../../site";

export const metadata: Metadata = { title: "Conditions d'utilisation · Semper" };

export default function Page() {
  return (
    <Legal title="Conditions d'utilisation" updated="8 octobre 2026">
      <h2>Ce que couvre ce texte</h2>
      <p>
        Ces conditions s&apos;appliquent au site trysemper.app, à sa liste d&apos;attente et à l&apos;application
        Semper. En créant un compte, tu les acceptes.
      </p>

      <h2>La liste d&apos;attente</h2>
      <p>
        En laissant ton adresse e-mail, tu demandes à être prévenu de l&apos;ouverture de Semper et à recevoir la
        lettre «&nbsp;Créer, toujours&nbsp;». L&apos;inscription est gratuite, sans engagement, et tu peux te désabonner à
        tout moment depuis n&apos;importe quel e-mail. Être inscrit ne garantit ni une date d&apos;ouverture ni
        l&apos;accès à une fonctionnalité précise&nbsp;: le produit évolue, et ce que nous annonçons peut changer.
      </p>

      <h2>Ton compte</h2>
      <p>
        Semper est gratuit pour un créateur seul. Un compte est personnel&nbsp;: tu te connectes avec un code envoyé à
        ton adresse, sans mot de passe, et tu es responsable de l&apos;accès à cette adresse. Tu peux exporter tes
        contenus et supprimer ton compte à tout moment depuis ton Profil.
      </p>

      <h2>Tes contenus</h2>
      <p>
        Ce que tu écris dans Semper t&apos;appartient. Nous l&apos;enregistrons et l&apos;affichons seulement pour faire
        fonctionner ton espace. Tu t&apos;engages à ne pas y déposer de contenu illégal et à ne pas utiliser Semper
        pour nuire au service ou à d&apos;autres personnes. En cas d&apos;abus, nous pouvons suspendre le compte
        concerné.
      </p>

      <h2>Le service</h2>
      <p>
        Semper évolue&nbsp;: des fonctions peuvent être ajoutées, changées ou retirées. Si une offre payante arrive,
        elle sera annoncée à l&apos;avance et ne changera rien sans ton accord pour le créateur seul. Si nous devions
        arrêter Semper, nous te préviendrions au moins trente jours avant, le temps d&apos;exporter tes contenus.
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
        Une question&nbsp;? Écris à <a href={`mailto:${site.contactEmail}`}>{site.contactEmail}</a>.
      </p>
    </Legal>
  );
}
