import type { MetadataRoute } from "next";

// Semper s'installe comme une application (ordinateur et téléphone) : icône, fenêtre à part, ouverture sur le calendrier.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Semper",
    short_name: "Semper",
    description: "Le calendrier éditorial des créateurs.",
    lang: "fr",
    start_url: "/calendrier",
    scope: "/",
    display: "standalone",
    background_color: "#f5f5f5",
    theme_color: "#f5f5f5",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
