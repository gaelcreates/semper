import type { MetadataRoute } from "next";
import { site } from "./site";

// Tous les robots sont bienvenus, y compris ceux des assistants IA (GPTBot, ClaudeBot, PerplexityBot, Google-Extended).
// Seule l'API est fermée. La connexion, l'inscription et l'espace restent lisibles pour que les robots y voient leur noindex.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/api/"] }],
    sitemap: `${site.url}/sitemap.xml`,
  };
}
