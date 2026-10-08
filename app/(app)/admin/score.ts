// Le classement du CRM. Tout se règle ici : poids, seuils, étiquettes.
//
// Potentiel (0 à 100) : chance que la personne soit prête pour l'accompagnement (2 500 à 4 000 CHF).
//   Chaud dès 60, Tiède dès 35, Froid en dessous.
// Usage : où elle en est dans Semper (nouveau, actif, à relancer, endormi, jamais démarré).
// Profil : ce qu'elle cherche avec son contenu (business, métier, audience, passion).

export type Answers = Record<string, unknown>;
export type Signals = {
  last_active: string | null; active_days_30: number;
  ig_day: string | null; ig_followers: number | null; ig_followers_before: number | null;
  ig_avg_likes: number | null; ig_avg_comments: number | null; ig_media: number | null;
  ig_posts: { t: string; likes: number; comments: number; views: number | null; type: string }[] | null;
};
export type Temp = "chaud" | "tiede" | "froid";
export type Usage = "nouveau" | "actif" | "relancer" | "endormi" | "jamais";
export type Kind = "business" | "metier" | "audience" | "passion";

const list = (v: unknown) => (Array.isArray(v) ? v.map(String) : v ? [String(v)] : []);
const days = (from: string | null) => (from ? Math.floor((Date.now() - new Date(from).getTime()) / 864e5) : Infinity);

// Les chiffres Instagram utiles, quand Meta a répondu.
export function insta(s: Signals) {
  if (s.ig_followers == null) return null;
  const posts = s.ig_posts ?? [];
  const recent = posts.filter((p) => days(p.t) <= 28);
  const views = posts.map((p) => p.views).filter((v): v is number => v != null);
  const engagement = s.ig_followers > 0 ? ((Number(s.ig_avg_likes ?? 0) + Number(s.ig_avg_comments ?? 0)) / s.ig_followers) * 100 : 0;
  return {
    followers: s.ig_followers,
    growth: s.ig_followers_before ? s.ig_followers - s.ig_followers_before : null,
    perWeek: Math.round((recent.length / 4) * 10) / 10,
    views: views.length ? Math.round(views.reduce((a, b) => a + b, 0) / views.length) : null,
    engagement: Math.round(engagement * 10) / 10,
    reels: posts.length ? Math.round((posts.filter((p) => p.type === "reel").length / posts.length) * 100) : null,
  };
}

const OBJECTIF: Record<string, number> = {
  "Trouver mes premiers clients": 25, "Vivre de mon contenu": 25, "Lancer une offre": 25, "Faire grandir mon audience": 10, "Simplement être régulier": 0,
};
const INVESTI: Record<string, number> = {
  "Un coach ou un accompagnement": 25, "Une formation": 20, "Un outil ou un abonnement": 10, "Du matériel": 5, "Pas encore": 0,
};
const ABONNES: Record<string, number> = {
  "Moins de 1 000": 5, "1 000 à 10 000": 15, "10 000 à 50 000": 15, "50 000 à 100 000": 10, "Plus de 100 000": 5,
};
const POURQUOI_BUSINESS = ["Trouver des clients", "Vendre un produit ou une offre", "En faire mon métier"];

// Les abonnés réels, une fois Instagram relevé, remplacent la fourchette déclarée.
const abonnesPoints = (a: Answers, ig: ReturnType<typeof insta>) => {
  if (!ig) return ABONNES[String(a.abonnes ?? "")] ?? 0;
  const f = ig.followers;
  return f < 1000 ? 5 : f < 50000 ? 15 : f < 100000 ? 10 : 5;
};

export function classify(a: Answers, s: Signals, since: string, contents: number) {
  const ig = insta(s);
  const why: { label: string; pts: number }[] = [];
  const add = (label: string, pts: number) => pts > 0 && why.push({ label, pts });

  add(String(a.objectif ?? ""), OBJECTIF[String(a.objectif ?? "")] ?? 0);
  const inv = list(a.investi).sort((x, y) => (INVESTI[y] ?? 0) - (INVESTI[x] ?? 0))[0];
  if (inv) add(`A investi : ${inv.toLowerCase()}`, INVESTI[inv] ?? 0);
  const business = list(a.pourquoi).filter((p) => POURQUOI_BUSINESS.includes(p));
  if (business.length) add(business.join(", "), Math.min(20, business.length * 10));
  add(ig ? `${ig.followers.toLocaleString("fr-CH")} abonnés` : String(a.abonnes ?? ""), abonnesPoints(a, ig));
  if (a.blocage === "Savoir quoi dire pour vendre") add("Bloque sur la vente", 10);
  if (a.blocage === "Tenir le rythme") add("Bloque sur le rythme", 5);
  if (days(s.last_active) <= 7) add("Actif cette semaine", 10);
  if (ig && ig.perWeek >= 2) add(`${ig.perWeek} publications par semaine`, 5);

  const score = Math.min(100, why.reduce((t, w) => t + w.pts, 0));
  const temp: Temp = score >= 60 ? "chaud" : score >= 35 ? "tiede" : "froid";

  const age = days(since);
  const idle = days(s.last_active);
  const usage: Usage = age < 3 ? "nouveau" : contents === 0 ? "jamais" : age < 7 ? "nouveau" : idle <= 7 ? "actif" : idle <= 21 ? "relancer" : "endormi";

  const why2 = list(a.pourquoi).join(" ") + " " + String(a.objectif ?? "");
  const kind: Kind = /clients|Vendre|offre/.test(why2) ? "business" : /métier|Vivre/.test(why2) ? "metier" : /audience|marque/.test(why2) ? "audience" : "passion";

  return { score, temp, usage, kind, why: why.sort((x, y) => y.pts - x.pts), ig };
}

export const TEMPS: { key: Temp; label: string }[] = [
  { key: "chaud", label: "Chaud" }, { key: "tiede", label: "Tiède" }, { key: "froid", label: "Froid" },
];
export const USAGES: Record<Usage, string> = {
  nouveau: "Nouveau", actif: "Actif", relancer: "À relancer", endormi: "Endormi", jamais: "Jamais démarré",
};
export const KINDS: Record<Kind, string> = {
  business: "Business", metier: "En faire son métier", audience: "Audience", passion: "Passion",
};
