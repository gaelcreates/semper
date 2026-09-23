import type { MetadataRoute } from "next";
import { site } from "./site";

// Tous les robots sont bienvenus, y compris ceux des assistants IA (GPTBot, ClaudeBot, PerplexityBot, Google-Extended).
// Seules la connexion et l'API sont exclues : rien à y lire.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/connexion", "/api/"] }],
    sitemap: `${site.url}/sitemap.xml`,
    host: site.url,
  };
}
