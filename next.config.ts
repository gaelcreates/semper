import type { NextConfig } from "next";

// Supabase : la connexion, les données et les photos de profil.
const supabase = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const dev = process.env.NODE_ENV === "development";

// Ce que le navigateur a le droit de charger. Next a besoin des scripts en ligne (thème, données des pages),
// React a besoin d'eval en développement seulement. Les vignettes Instagram viennent des serveurs de Meta.
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${dev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  `img-src 'self' data: blob: ${supabase} https://*.cdninstagram.com https://*.fbcdn.net`,
  "font-src 'self'",
  `connect-src 'self' ${supabase}`,
  "frame-src 'none'",
  "frame-ancestors 'none'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join("; ");

const nextConfig: NextConfig = {
  poweredByHeader: false,
  // next dev n'écrit plus son bloc de consignes dans CLAUDE.md.
  agentRules: false,
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "Content-Security-Policy", value: csp },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=(), usb=(), browsing-topics=()" },
        ],
      },
      // Le DMG n'a rien à faire dans les moteurs de recherche.
      { source: "/telecharger/:path*", headers: [{ key: "X-Robots-Tag", value: "noindex" }] },
    ];
  },
};

export default nextConfig;
