import { Footer, TopBar } from "./Frame";

// Gabarit des pages légales.
export default function Legal({ title, updated, children }: { title: string; updated: string; children: React.ReactNode }) {
  return (
    <>
      <TopBar cta={false} />
      <main className="legal">
        <div className="wrap narrow">
          <h1>{title}</h1>
          <p className="fine">Dernière mise à jour : {updated}</p>
          <div className="prose">{children}</div>
        </div>
      </main>
      <Footer />
    </>
  );
}
