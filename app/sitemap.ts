import type { MetadataRoute } from "next";
import { site } from "./site";

// Plan du site pour Google et Bing. La page de connexion n'y est pas : elle n'a rien à indexer.
export default function sitemap(): MetadataRoute.Sitemap {
  const updated = new Date("2026-09-23");
  return [
    { url: site.url, lastModified: updated, changeFrequency: "weekly", priority: 1 },
    { url: `${site.url}/confidentialite`, lastModified: updated, changeFrequency: "yearly", priority: 0.2 },
    { url: `${site.url}/conditions`, lastModified: updated, changeFrequency: "yearly", priority: 0.2 },
    { url: `${site.url}/mentions-legales`, lastModified: updated, changeFrequency: "yearly", priority: 0.2 },
  ];
}
