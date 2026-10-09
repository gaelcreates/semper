import { QUESTIONS } from "../../(start)/Welcome";

// Le classement du CRM (v2). Tout se règle ici : poids, seuils, libellés courts.
//
// Score (0 à 100) : chance que la personne soit prête pour l'accompagnement (2 500 à 4 000 CHF).
//   Intention 40 · Capacité à investir 25 · Engagement dans Semper 25 · Audience 10, puis retraits.
//   Chaud dès 60, Tiède dès 35, Froid en dessous.
// Profil : ce qu'elle cherche avec son contenu (business, métier, audience, passion).

export type Temp = "chaud" | "tiede" | "froid";
export type Kind = "business" | "metier" | "audience" | "passion";
export type Post = { t: string; likes: number; comments: number; views: number | null; type: string; link: string; img: string | null; caption: string };

// Ce que le score lit d'une personne (une ligne de admin_people).
export type Signals = {
  answers: unknown; created_at: string; last_active: string | null; active_days_30: number;
  contents_total: number; contents_planned: number; contents_published: number;
  ig_followers: number | null; ig_followers_before: number | null; ig_avg_likes: number | null; ig_avg_comments: number | null; ig_posts: unknown;
};

// Les réponses d'inscription, lues sans jamais planter (une donnée écrite à la main par l'API peut avoir n'importe quelle forme).
export const answersOf = (a: unknown): Record<string, unknown> => (a && typeof a === "object" && !Array.isArray(a) ? (a as Record<string, unknown>) : {});
export const list = (v: unknown) => (Array.isArray(v) ? v.map(String) : v != null && v !== "" ? [String(v)] : []);
export const answer = (a: unknown, k: string) => list(answersOf(a)[k]).join(", ");
const days = (from: string | null) => (from ? Math.floor((Date.now() - new Date(from).getTime()) / 864e5) : Infinity);

// Chaque poids vise une réponse du parcours d'inscription (Welcome.tsx). Un libellé changé là-bas s'affiche ici en erreur.
const options = (key: string) => QUESTIONS.find((q) => q.key === key)?.options ?? [];
function check(key: string, labels: string[], all = true) {
  const opts = options(key);
  const off = [...labels.filter((l) => !opts.includes(l)), ...(all ? opts.filter((o) => !labels.includes(o)) : [])];
  if (off.length) console.error(`score.ts : réponses « ${key} » à revoir`, off);
}
function weights<T>(key: string, w: Record<string, T>) {
  check(key, Object.keys(w));
  return w;
}

// [points, libellé court]
const OBJECTIF = weights<[number, string]>("objectif", {
  "Trouver mes premiers clients": [20, "Premiers clients"], "Vivre de mon contenu": [20, "Vivre du contenu"],
  "Lancer une offre": [20, "Lancer une offre"], "Faire grandir mon audience": [8, "Audience"], "Simplement être régulier": [0, "Régularité"],
});
const INVESTI = weights<[number, string]>("investi", {
  "Un coach ou un accompagnement": [25, "Coach"], "Une formation": [18, "Formation"], "Un outil ou un abonnement": [8, "Outil"],
  "Du matériel": [4, "Matériel"], "Pas encore": [0, "–"],
});
// [points, fourchette courte, ordre de grandeur pour trier]
const ABONNES = weights<[number, string, number]>("abonnes", {
  "Moins de 1 000": [3, "< 1 k", 500], "1 000 à 10 000": [10, "1-10 k", 5000], "10 000 à 50 000": [10, "10-50 k", 30000],
  "50 000 à 100 000": [7, "50-100 k", 75000], "Plus de 100 000": [4, "> 100 k", 150000],
});
const POURQUOI_BUSINESS = ["Trouver des clients", "Vendre un produit ou une offre", "En faire mon métier"];
const VENDRE = "Savoir quoi dire pour vendre";
const RYTHME = "Tenir le rythme";
const REGULIER = "Simplement être régulier";
check("pourquoi", POURQUOI_BUSINESS, false);
check("blocage", [VENDRE, RYTHME], false);

// Lecture d'un poids sans tomber sur les propriétés d'objet (« constructor », « __proto__ »).
const pick = <T,>(r: Record<string, T>, k: unknown) => (typeof k === "string" && Object.hasOwn(r, k) ? r[k] : undefined);
const audience = (f: number) => (f < 1000 ? 3 : f <= 50000 ? 10 : f <= 100000 ? 7 : 4);

// Les chiffres Instagram utiles, quand Meta a répondu.
export function insta(s: Signals) {
  if (s.ig_followers == null) return null;
  const posts = (Array.isArray(s.ig_posts) ? s.ig_posts : [])
    .filter((p): p is Post => !!p && typeof p === "object" && typeof (p as Post).t === "string")
    .sort((a, b) => b.t.localeCompare(a.t));
  const recent = posts.filter((p) => days(p.t) <= 28);
  const views = posts.map((p) => p.views).filter((v): v is number => typeof v === "number");
  return {
    followers: s.ig_followers,
    growth: s.ig_followers_before ? s.ig_followers - s.ig_followers_before : null,
    perWeek: Math.round((recent.length / 4) * 10) / 10,
    views: views.length ? Math.round(views.reduce((a, b) => a + b, 0) / views.length) : null,
    posts,
  };
}
export type Insta = NonNullable<ReturnType<typeof insta>>;

export type Score = {
  score: number; temp: Temp; kind: Kind; why: { label: string; pts: number }[]; ig: Insta | null;
  goal: string; invest: string; investPts: number; followers: number | null; range: string;
};
// Une ligne illisible reçoit ce score neutre au lieu d'arrêter toute la liste.
export const BLANK: Score = { score: 0, temp: "froid", kind: "passion", why: [], ig: null, goal: "", invest: "–", investPts: 0, followers: null, range: "" };

export function classify(s: Signals): Score {
  const a = answersOf(s.answers);
  const ig = insta(s);
  const why: { label: string; pts: number }[] = [];
  const add = (label: string, pts: number) => pts !== 0 && why.push({ label, pts });

  // Intention (40)
  const obj = pick(OBJECTIF, a.objectif);
  if (obj) add(String(a.objectif), obj[0]);
  const business = list(a.pourquoi).some((p) => POURQUOI_BUSINESS.includes(p));
  if (business) add("Crée pour vendre", 10);
  if (a.blocage === VENDRE) add("Bloque sur la vente", 10);
  if (a.blocage === RYTHME) add("Bloque sur le rythme", 5);

  // Capacité à investir (25) : la plus haute
  const inv = list(a.investi).map((x) => pick(INVESTI, x)).filter((x): x is [number, string] => !!x).sort((x, y) => y[0] - x[0])[0];
  if (inv) add(`A investi : ${inv[1].toLowerCase()}`, inv[0]);

  // Engagement dans Semper (25)
  if (days(s.last_active) <= 7) add("Venu cette semaine", 10);
  if (s.active_days_30 >= 8) add(`${s.active_days_30} jours actifs sur 30`, 5);
  if (s.contents_planned + s.contents_published > 0) add("A planifié", 5);
  if (s.contents_published > 0) add("A publié", 5);

  // Audience (10) : abonnés relevés, sinon fourchette déclarée
  const range = pick(ABONNES, a.abonnes);
  if (ig) add(`${ig.followers.toLocaleString("fr-CH")} abonnés`, audience(ig.followers));
  else if (range) add(`${a.abonnes} abonnés`, range[0]);

  // Retraits
  const age = days(s.created_at);
  if (age >= 7 && s.contents_total === 0) add("Rien créé en 7 j", -15);
  if (days(s.last_active ?? s.created_at) >= 21) add("Pas venu depuis 21 j", -10);

  let score = why.reduce((t, w) => t + w.pts, 0);
  // Plafond : qui veut seulement être régulier, sans visée business, reste Froid.
  if (a.objectif === REGULIER && !business && score > 34) { add("Régularité seule", 34 - score); score = 34; }
  score = Math.max(0, Math.min(100, score));
  const temp: Temp = score >= 60 ? "chaud" : score >= 35 ? "tiede" : "froid";

  const all = list(a.pourquoi).join(" ") + " " + String(a.objectif ?? "");
  const kind: Kind = /clients|Vendre|offre/.test(all) ? "business" : /métier|Vivre/.test(all) ? "metier" : /audience|marque/.test(all) ? "audience" : "passion";

  return {
    score, temp, kind, why: why.sort((x, y) => y.pts - x.pts), ig,
    goal: obj?.[1] ?? "", invest: inv?.[1] ?? "–", investPts: inv?.[0] ?? -1,
    followers: ig ? ig.followers : range ? range[2] : null, range: range?.[1] ?? "",
  };
}

export const TEMPS: { key: Temp; label: string }[] = [
  { key: "chaud", label: "Chaud" }, { key: "tiede", label: "Tiède" }, { key: "froid", label: "Froid" },
];
export const KINDS: Record<Kind, string> = {
  business: "Business", metier: "En faire son métier", audience: "Audience", passion: "Passion",
};
