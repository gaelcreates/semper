import type { MetadataRoute } from "next";
import { site } from "./site";
import { lettres } from "./(site)/lettre/lettres";

// Plan du site pour Google et Bing. La page de connexion n'y est pas : elle n'a rien à indexer.
export default function sitemap(): MetadataRoute.Sitemap {
  const updated = new Date("2026-09-23");
  return [
    { url: site.url, lastModified: updated, changeFrequency: "weekly", priority: 1 },
    { url: `${site.url}/lettre`, lastModified: lettres[0] ? new Date(lettres[0].date) : updated, changeFrequency: "weekly", priority: 0.7 },
    ...lettres.map((l) => ({ url: `${site.url}/lettre/${l.slug}`, lastModified: new Date(l.date), changeFrequency: "yearly" as const, priority: 0.6 })),
    { url: `${site.url}/confidentialite`, lastModified: updated, changeFrequency: "yearly", priority: 0.2 },
    { url: `${site.url}/conditions`, lastModified: updated, changeFrequency: "yearly", priority: 0.2 },
    { url: `${site.url}/mentions-legales`, lastModified: updated, changeFrequency: "yearly", priority: 0.2 },
  ];
}
