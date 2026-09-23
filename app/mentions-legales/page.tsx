import type { Metadata } from "next";
import Legal from "../Legal";
import { site } from "../site";

export const metadata: Metadata = { title: "Mentions légales · Semper" };

export default function Page() {
  return (
    <Legal title="Mentions légales" updated="22 septembre 2026">
      <h2>Éditeur</h2>
      <p>
        {site.owner}<br />
        {site.postalAddress}<br />
        <a href={`mailto:${site.contactEmail}`}>{site.contactEmail}</a>
      </p>

      <h2>Hébergement</h2>
      <p>
        Vercel, Inc.<br />
        440 N Barranca Ave #4133, Covina, CA 91723, États-Unis<br />
        vercel.com
      </p>

      <h2>Envoi des e-mails</h2>
      <p>
        Resend, Inc., États-Unis<br />
        resend.com
      </p>

      <h2>Propriété intellectuelle</h2>
      <p>
        Le nom Semper, le signe, les textes et le design de ce site sont la propriété de {site.owner}. Toute
        reproduction à des fins commerciales sans accord écrit est interdite.
      </p>
    </Legal>
  );
}
