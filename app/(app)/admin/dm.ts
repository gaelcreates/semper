import { answersOf } from "./score";
import { ageDays, type LeadStatus, type Person } from "./model";

// Le brouillon de DM, sans IA : un gabarit par moment de la prospection, rempli avec les réponses d'inscription.
// Une ligne saute quand la réponse manque. Le crochet se remplit à la main : on n'invente pas un compliment.

export type Tpl = "premier" | "relance1" | "relance2" | "appel";
export const TPLS: { key: Tpl; label: string }[] = [
  { key: "premier", label: "Premier message" }, { key: "relance1", label: "Relance 1" },
  { key: "relance2", label: "Relance 2" }, { key: "appel", label: "Vers l'appel" },
];
// Un crochet reste à remplir : rien ne se copie tant qu'il est là.
export const HOLE = /\[[^\]]*\]/;

const OBJ: Record<string, [string, string]> = { // [phrase, forme courte]
  "Trouver mes premiers clients": ["trouver tes premiers clients grâce à ton contenu", "tes premiers clients"],
  "Vivre de mon contenu": ["vivre de ton contenu", "vivre de ton contenu"],
  "Lancer une offre": ["lancer ton offre", "ton offre"],
  "Faire grandir mon audience": ["faire grandir ton audience", "ton audience"],
  "Simplement être régulier": ["être régulier", "ta régularité"],
};
const BLOC: Record<string, string> = {
  "Trouver des idées": "trouver des idées", "Tenir le rythme": "tenir le rythme", "Le temps": "trouver le temps",
  "Savoir quoi dire pour vendre": "savoir quoi dire pour vendre", "Le tournage ou le montage": "le tournage et le montage",
};
const QUI: Record<string, string> = { gael: "c'est Gael, je fais Semper", lou: "c'est Lou, de l'équipe Semper" };
const QUESTION: Record<Person["c"]["kind"], string> = {
  business: "Aujourd'hui, ton contenu t'amène déjà des demandes, ou pas encore ?",
  metier: "Aujourd'hui, ton contenu t'amène déjà des demandes, ou pas encore ?",
  audience: "Tu publies sur quoi en ce moment, et qu'est-ce qui marche le mieux ?",
  passion: "Tu tiens combien de vidéos par semaine en ce moment ?",
};
const own = <T,>(r: Record<string, T>, k: unknown) => (typeof k === "string" && Object.hasOwn(r, k) ? r[k] : undefined);
const DAYS = ["dimanche", "lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi"];

// Le gabarit qui va avec l'étape et le nombre de relances déjà envoyées.
export function pickTpl(status: LeadStatus, relances: number): Tpl {
  if (status === "contacte") return relances ? "relance2" : "relance1";
  if (status === "discussion" || status === "appel") return "appel";
  return "premier";
}

export function draft(t: Tpl, p: Person, author: string) {
  const a = answersOf(p.answers);
  const first = p.first_name.trim();
  const obj = own(OBJ, a.objectif);
  const bloc = own(BLOC, a.blocage);
  const to = first ? `, ${first}` : "";
  if (t === "relance1") return `Je remonte mon message${to}. Tu en es où avec ${obj ? obj[1] : "ton contenu"} ?`;
  if (t === "relance2") return `Dernier message de ma part${to}. Si tu veux en parler un jour, écris-moi ici.`;
  if (t === "appel") return "Merci pour ta réponse. Si tu veux, on en parle de vive voix cette semaine. Tu préfères quel jour ?";

  const me = author.trim();
  const qui = own(QUI, me.toLowerCase()) ?? (me ? `c'est ${me}, de l'équipe Semper` : "c'est l'équipe Semper");
  const said = obj && bloc ? ` Tu as dit vouloir ${obj[0]} d'ici 6 mois, et que le plus dur, c'est ${bloc}.`
    : obj ? ` Tu as dit vouloir ${obj[0]} d'ici 6 mois.`
    : bloc ? ` Tu as dit que le plus dur, c'est ${bloc}.` : "";
  const post = p.c.ig?.posts[0];
  const age = post ? ageDays(post.t) : Infinity;
  const seen = age < 14
    ? `J'ai vu ton dernier post (${age <= 0 ? "aujourd'hui" : age === 1 ? "hier" : age < 7 ? DAYS[new Date(post!.t).getDay()] : new Date(post!.t).toLocaleDateString("fr-CH", { day: "numeric", month: "short" })}). [ce qui t'a parlé]`
    : "";
  return [`Salut${first ? ` ${first}` : ""}, ${qui}.`, `Merci pour ton inscription sur Semper.${said}`, seen, QUESTION[p.c.kind]].filter(Boolean).join("\n");
}
