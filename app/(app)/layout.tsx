import type { Metadata } from "next";
import Shell from "./Shell";
import "./app.css";

// L'installation (manifeste, écran d'accueil iPhone) n'existe que dans l'espace, jamais sur la vitrine.
export const metadata: Metadata = {
  title: "Semper",
  robots: { index: false, follow: false },
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, title: "Semper", statusBarStyle: "default" },
};

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return <Shell>{children}</Shell>;
}
