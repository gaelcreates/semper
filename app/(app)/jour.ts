import { addDays, dayKey, parse, startOfWeek } from "./lib";
import type { Content } from "./store";

// La lune du jour et la vérification des publications : des règles pures, sans navigateur ni base.
//
// La lune : un jeu du jour (ou une publication vérifiée) l'allume. Elle se remplit en 7 jours ; 28 points autour
// comptent les jours d'affilée. Un jour sans rien : un joker la protège, sinon elle se fissure. Trois jeux le
// lendemain la réparent ; passé ce jour, elle s'éteint. Les jokers se gagnent en tenant son rythme de publication.

export type SkillKey = "idees" | "accroche" | "structure" | "constance";
export type Hist = "on" | "joker" | "miss";
export type Game = {
  day: string;                    // dernier jour réglé (AAAA-MM-JJ), heure locale
  done: string[];                 // les gestes de ce jour (jeux, « publication »)
  moon: number;                   // jours d'affilée
  best: number;
  jokers: number;
  broken: { prev: number } | null; // fissurée : à réparer aujourd'hui
  hist: Record<string, Hist>;     // les 120 derniers jours
  planned: string[];              // jours de vacances couverts d'avance par un joker
  skills: Record<SkillKey, number>;
  mode: "semper" | "choix";       // le jeu du jour : imposé, ou trois propositions
  focus: SkillKey[];              // ce que la personne veut travailler
  onboarded: boolean;
};

export const REPAIR = 3;
export const MAX_JOKERS = 3;

export const today = (d = new Date()) => dayKey(d);
const nextDay = (k: string) => dayKey(addDays(parse(k), 1));

export function newGame(day = today()): Game {
  return {
    day, done: [], moon: 0, best: 0, jokers: 0, broken: null, hist: {}, planned: [],
    skills: { idees: 0, accroche: 0, structure: 0, constance: 0 }, mode: "semper", focus: ["accroche", "idees"], onboarded: false,
  };
}
// Un état lu en base peut venir d'une version plus ancienne : on complète ce qui manque.
export const gameOf = (raw: unknown, day = today()): Game => ({ ...newGame(day), ...(raw && typeof raw === "object" ? (raw as Partial<Game>) : {}) });

export const lit = (g: Game) => g.done.length > 0 && !g.broken;
export type MoonState = "lit" | "wait" | "broken" | "off";
export const moonState = (g: Game): MoonState => (g.broken ? "broken" : lit(g) ? "lit" : g.moon > 0 ? "wait" : "off");
export const moonDays = (g: Game) => (g.broken ? g.broken.prev : g.moon);

export function phaseName(n: number) {
  return n <= 0 ? "Nouvelle lune" : n < 3 ? "Premier croissant" : n < 5 ? "Premier quartier" : n < 7 ? "Lune gibbeuse" : n < 28 ? "Pleine lune" : "Lune d'or";
}

// Ce qui se passe en arrivant un nouveau jour : chaque jour écoulé est clos, l'un après l'autre.
// posted : les jours où une publication vérifiée est sortie. streakTo : les semaines tenues d'affilée jusqu'à une semaine.
export type Event = "joker" | "broken" | "out" | "restart" | "joker+";
export function settle(g0: Game, day: string, posted: Set<string>, streakTo: (week: string) => number): { g: Game; events: Event[] } {
  if (g0.day >= day) return { g: g0, events: [] };
  const g: Game = { ...g0, hist: { ...g0.hist }, planned: [...g0.planned], done: [...g0.done] };
  const events: Event[] = [];
  for (let n = 0; g.day < day && n < 800; n++) {
    const d = g.day, active = g.done.length > 0 || posted.has(d);
    if (g.broken) {
      // Le jour de réparation est passé sans les trois jeux.
      g.hist[d] = active ? "on" : "miss";
      g.moon = active ? 1 : 0;
      g.broken = null;
      events.push(active ? "restart" : "out");
    } else if (active) {
      g.hist[d] = "on";
      if (!g.done.length) g.moon++; // allumée après coup par une publication vérifiée
    } else if (g.planned.includes(d)) {
      g.hist[d] = "joker";
    } else if (g.jokers > 0) {
      g.jokers--;
      g.hist[d] = "joker";
      events.push("joker");
    } else if (g.moon > 0) {
      g.hist[d] = "miss";
      g.broken = { prev: g.moon };
      events.push("broken");
    } else g.hist[d] = "miss";
    g.best = Math.max(g.best, g.moon);
    g.planned = g.planned.filter((x) => x > d);
    g.day = nextDay(d);
    g.done = [];
    // Chaque lundi : deux semaines tenues d'affilée rapportent un joker.
    const mon = parse(g.day);
    if (mon.getDay() === 1) {
      const s = streakTo(dayKey(addDays(mon, -7)));
      if (s > 0 && s % 2 === 0 && g.jokers < MAX_JOKERS) { g.jokers++; events.push("joker+"); }
    }
  }
  const keep = dayKey(addDays(parse(day), -120));
  g.hist = Object.fromEntries(Object.entries(g.hist).filter(([k]) => k >= keep));
  return { g, events };
}

// Un geste du jour. Le premier allume la lune ; une lune fissurée se répare au troisième.
export type Lit = "lit" | "repaired" | null;
export function gesture(g0: Game, id: string, skill?: SkillKey, pts = 0): { g: Game; event: Lit } {
  if (id === "publication" && g0.done.includes(id)) return { g: g0, event: null };
  const g: Game = { ...g0, done: [...g0.done, id], skills: { ...g0.skills } };
  if (skill) g.skills[skill] = (g.skills[skill] ?? 0) + pts;
  g.skills.constance = (g.skills.constance ?? 0) + (g0.done.length ? 0 : 10);
  let event: Lit = null;
  if (g.broken && g.done.length >= REPAIR) { g.moon = g.broken.prev + 1; g.broken = null; event = "repaired"; }
  else if (!g.broken && !g0.done.length) { g.moon++; event = "lit"; }
  g.best = Math.max(g.best, g.moon);
  return { g, event };
}

export const levelOf = (n: number) => (n < 100 ? "Débutant" : n < 300 ? "En progrès" : n < 600 ? "Solide" : "Expert");

// ---------- les jeux
// « cree » fait avancer un contenu (idée, hook, script), « entraine » apprend un geste du métier.
export type GameId = "hook" | "coupe" | "duel" | "tirage" | "question" | "recyclage" | "tri" | "script" | "objectif";
export type GameInfo = { id: GameId; badge: string; name: string; desc: string; time: string; kind: "cree" | "entraine"; skill: SkillKey };
export const GAMES: GameInfo[] = [
  { id: "hook", badge: "30", name: "Hook en 30 secondes", desc: "Un sujet tiré au sort, 30 secondes pour la première phrase.", time: "1 min", kind: "cree", skill: "accroche" },
  { id: "coupe", badge: "✂", name: "Coupe !", desc: "Un hook trop long à réduire sous 12 mots, sans perdre l'idée.", time: "1 min", kind: "entraine", skill: "accroche" },
  { id: "duel", badge: "VS", name: "Duel de hooks", desc: "Lequel arrête le pouce ? Choisis, puis découvre pourquoi.", time: "1 min", kind: "entraine", skill: "accroche" },
  { id: "tirage", badge: "3", name: "La machine à idées", desc: "Format, sujet, contrainte : trois rouleaux, une idée de vidéo.", time: "30 s", kind: "cree", skill: "idees" },
  { id: "question", badge: "?", name: "La question du jour", desc: "Une question, ta réponse devient une idée.", time: "2 min", kind: "cree", skill: "idees" },
  { id: "recyclage", badge: "↻", name: "Recyclage", desc: "Une de tes vidéos publiées, trois angles neufs.", time: "1 min", kind: "cree", skill: "idees" },
  { id: "tri", badge: "→", name: "Tri express", desc: "Tes idées défilent : garder, plus tard ou jeter.", time: "1 min", kind: "entraine", skill: "idees" },
  { id: "script", badge: "S", name: "Script éclair", desc: "Une idée, 90 secondes pour poser le script. Le contenu entre au calendrier.", time: "2 min", kind: "cree", skill: "structure" },
  { id: "objectif", badge: "A", name: "Le bon objectif", desc: "Attirer, attacher ou convertir ? Cinq idées à classer.", time: "1 min", kind: "entraine", skill: "structure" },
];
export const FOCUS: { key: SkillKey; label: string }[] = [
  { key: "accroche", label: "Mieux accrocher" },
  { key: "idees", label: "Trouver des idées" },
  { key: "structure", label: "Structurer mes vidéos" },
];
export const SKILLS: { key: SkillKey; label: string }[] = [
  { key: "idees", label: "Idées" }, { key: "accroche", label: "Accroche" }, { key: "structure", label: "Structure" }, { key: "constance", label: "Constance" },
];
export const gameInfo = (id: string) => GAMES.find((x) => x.id === id);

// Le jeu du jour : tiré dans les priorités de la personne, il change chaque jour.
const pool = (g: Game) => { const p = GAMES.filter((x) => g.focus.includes(x.skill)); return p.length ? p : GAMES; };
const dayIndex = (day: string) => Math.round(parse(day).getTime() / 864e5);
export const dailyGame = (g: Game, day = g.day) => pool(g)[dayIndex(day) % pool(g).length];
export function choices(g: Game, day = g.day) {
  const p = pool(g), out: GameInfo[] = [];
  for (let i = 0; out.length < 3 && i < p.length; i++) out.push(p[(dayIndex(day) + i) % p.length]);
  for (const x of GAMES) if (out.length < 3 && !out.includes(x)) out.push(x);
  return out;
}

// ---------- vérification Instagram
// Une publication relevée sur Instagram, et celle reliée à une vidéo. « at » en heure locale : « AAAA-MM-JJTHH:MM ».
export type IgPost = { id: string; at: string; link: string; img: string | null; cap: string };
export type IgLink = { handle: string; code: string; verified: boolean; syncedAt: string | null; posts: IgPost[] };

// ok : publiée le jour prévu. late : reliée, un autre jour. today : prévue aujourd'hui. propose : une publication
// proche attend d'être confirmée. miss : rien sur Instagram. decl : publiée selon la personne (sans Instagram).
// nonv : passée, ni vérifiée ni déclarée. prevu : à venir. idee : sans date.
export type Proof = "ok" | "late" | "today" | "propose" | "miss" | "decl" | "nonv" | "prevu" | "idee";

const linkedIds = (contents: Content[]) => new Set(contents.map((c) => c.igPost?.id).filter(Boolean) as string[]);

// Une publication un jour avant ou jusqu'à deux jours après la date prévue, que personne d'autre n'a prise.
export function candidate(c: Content, ig: IgLink | null, contents: Content[], day = today()): IgPost | null {
  if (!ig?.verified || !c.publishAt || c.igPost) return null;
  const at = c.publishAt.slice(0, 10), taken = linkedIds(contents);
  return ig.posts.find((p) => {
    const k = p.at.slice(0, 10), gap = Math.round((parse(k).getTime() - parse(at).getTime()) / 864e5);
    return !taken.has(p.id) && k !== at && k <= day && gap >= -1 && gap <= 2;
  }) ?? null;
}

export function proofOf(c: Content, ig: IgLink | null, contents: Content[], day = today()): Proof {
  if (c.igPost) return c.publishAt && c.igPost.at.slice(0, 10) !== c.publishAt.slice(0, 10) ? "late" : "ok";
  if (!c.publishAt) return "idee";
  const at = c.publishAt.slice(0, 10);
  if (at > day) return "prevu";
  if (at === day) return "today";
  if (!ig?.verified) return c.publishedAt ? "decl" : "nonv";
  return candidate(c, ig, contents, day) ? "propose" : "miss";
}

// La date d'une publication qui compte : celle vue sur Instagram, sinon (sans Instagram) celle déclarée.
export function pubDay(c: Content, verified: boolean): string | null {
  if (c.igPost) return c.igPost.at.slice(0, 10);
  if (verified || !c.publishedAt) return null;
  return (c.publishAt ?? c.publishedAt).slice(0, 10);
}

// Les vidéos qui attendent une réponse : sans publication le jour prévu, ces 14 derniers jours.
export function toFix(contents: Content[], ig: IgLink | null, day = today()) {
  const since = dayKey(addDays(parse(day), -14));
  return contents.filter((c) => c.publishAt && c.publishAt.slice(0, 10) >= since && ["propose", "miss"].includes(proofOf(c, ig, contents, day)))
    .sort((a, b) => a.publishAt!.localeCompare(b.publishAt!));
}

export const weekOf = (k: string) => dayKey(startOfWeek(parse(k)));
