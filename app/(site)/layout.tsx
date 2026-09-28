import Pointer from "../Pointer";
import Matrix from "../Matrix";

// Décor de la vitrine : trame qui s'allume au curseur, lune, barre de progression.
export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <div className="grid-bg" aria-hidden="true"><i className="g1" /><i className="g2" /><i className="g3" /><i className="g4" /><i className="spot" /></div>
      <Matrix />
      <i className="progress" aria-hidden="true" />
      {children}
      <Pointer />
    </>
  );
}
