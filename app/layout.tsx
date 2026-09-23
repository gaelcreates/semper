import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import "./globals.css";
import Pointer from "./Pointer";
import { site } from "./site";

// Identité Semper : Suisse Intl (Light, Bold, Black).
const intl = localFont({
  src: [
    { path: "./fonts/SuisseIntl-Light.woff2", weight: "300" },
    { path: "./fonts/SuisseIntl-Bold.woff2", weight: "700" },
    { path: "./fonts/SuisseIntl-Black.woff2", weight: "900" },
  ],
  variable: "--font-intl",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(site.url),
  title: site.title,
  description: site.description,
  openGraph: {
    title: site.title,
    description: site.description,
    url: site.url,
    siteName: "Semper",
    locale: "fr_CH",
    type: "website",
    images: [{ url: "/og.png", width: 1200, height: 630, alt: "Semper. Créer, toujours." }],
  },
  twitter: { card: "summary_large_image", title: site.title, description: site.description, images: ["/og.png"] },
};

export const viewport: Viewport = { themeColor: "#f5f5f5" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" className={intl.variable} suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `try{var t=localStorage.getItem("theme");if(t==="dark")document.documentElement.dataset.theme=t;}catch(e){}`,
          }}
        />
      </head>
      <body>
        <div className="grid-bg" aria-hidden="true"><i className="g1" /><i className="g2" /><i className="g3" /><i className="g4" /><i className="spot" /></div>
        <i className="progress" aria-hidden="true" />
        {children}
        <Pointer />
      </body>
    </html>
  );
}
