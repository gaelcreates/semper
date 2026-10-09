import type { Data } from "./store";
import { addDays, dayKey, parse, startOfWeek } from "./lib";

// Constance : une semaine est tenue quand le nombre de vidéos publiées atteint le rythme visé.
// La date qui compte est celle prévue au calendrier, sinon le jour où la vidéo a été marquée publiée.
export function constance(d: Data, today = new Date()) {
  const r = Math.max(1, d.profile.rythme);
  const byDay = new Map<string, number>();
  const byWeek = new Map<string, number>();
  let total = 0;
  for (const c of d.contents) {
    if (!c.publishedAt) continue;
    const at = parse(c.publishAt ?? c.publishedAt);
    total++;
    const k = dayKey(at), w = dayKey(startOfWeek(at));
    byDay.set(k, (byDay.get(k) ?? 0) + 1);
    byWeek.set(w, (byWeek.get(w) ?? 0) + 1);
  }
  const count = (w: Date) => byWeek.get(dayKey(w)) ?? 0;
  const held = (w: Date) => count(w) >= r;
  const cur = startOfWeek(today);

  // Série en cours : la semaine actuelle compte dès qu'elle est tenue, sinon on part de la précédente.
  const streakWeeks = new Set<string>();
  for (let w = held(cur) ? cur : addDays(cur, -7); held(w); w = addDays(w, -7)) streakWeeks.add(dayKey(w));

  let record = 0, run = 0;
  const weeks = [...byWeek.keys()].sort();
  for (let w = weeks.length ? parse(weeks[0]) : cur; w <= cur; w = addDays(w, 7)) {
    run = held(w) ? run + 1 : 0;
    record = Math.max(record, run);
  }

  const s = { byDay, total, rythme: r, thisWeek: count(cur), streak: streakWeeks.size, record, streakWeeks };
  return { ...s, advice: advice(d, s.thisWeek, r, count, today) };
}

// Un seul conseil, le plus utile du moment. Règles simples, pas d'IA.
function advice(d: Data, thisWeek: number, r: number, count: (w: Date) => number, today: Date) {
  if (!d.contents.length) return "Pose ta première vidéo dans le calendrier.";
  const cur = startOfWeek(today);

  const since = startOfWeek(new Date(d.profile.createdAt));
  if (cur.getTime() - since.getTime() >= 4 * 7 * 86400000) {
    const avg = [1, 2, 3, 4].reduce((a, i) => a + count(addDays(cur, -7 * i)), 0) / 4;
    if (avg > 0 && avg < r * 0.6) {
      const n = Math.max(1, Math.round(avg));
      return `Tu tiens ${avg.toLocaleString("fr-CH")} vidéo par semaine en moyenne. Vise ${n}, puis monte.`;
    }
  }

  const end = addDays(cur, 7);
  const planned = d.contents.filter((c) => !c.publishedAt && c.publishAt && parse(c.publishAt) >= today && parse(c.publishAt) < end).length;
  const missing = r - thisWeek - planned;
  if (missing > 0) return missing === 1 ? "Il manque une vidéo au calendrier pour tenir la semaine." : `Il manque ${missing} vidéos au calendrier pour tenir la semaine.`;

  // Lecture prudente : un contenu malformé en base ne doit pas casser l'espace.
  const both = d.contents.filter((c) => c.publishAt && c.steps?.montage?.at);
  const same = both.filter((c) => c.publishAt!.slice(0, 10) === c.steps!.montage!.at!.slice(0, 10)).length;
  if (both.length >= 3 && same / both.length >= 2 / 3) return "Tes montages tombent le jour de la publication. Avance-les d'un jour.";

  if (thisWeek >= r) return "Semaine tenue. Garde le même rythme.";
  return "Tout est prévu. Il reste à le faire.";
}

// Les titres suivent la lune : chaque semaine tenue la fait croître, une série cassée la fait décroître.
// Après la pleine lune, l'orbite prend le relais jusqu'à l'année.
export const TITLES = [
  { w: 0, name: "Nouvelle lune" },
  { w: 1, name: "Premier croissant" },
  { w: 2, name: "Premier quartier" },
  { w: 4, name: "Lune gibbeuse" },
  { w: 8, name: "Pleine lune" },
  { w: 13, name: "Équinoxe" },
  { w: 26, name: "Solstice" },
  { w: 52, name: "Révolution" },
];

export function titleOf(streak: number) {
  let i = 0;
  while (i < TITLES.length - 1 && streak >= TITLES[i + 1].w) i++;
  return { i, title: TITLES[i].name, from: TITLES[i].w, next: TITLES[i + 1] ?? null };
}

// Part éclairée de la lune (0 à 1), posée sur les seuils des titres, et part de l'orbite parcourue.
const PHASE: [number, number][] = [[0, 0], [1, 0.25], [2, 0.5], [4, 0.75], [8, 1]];
export function phaseOf(streak: number) {
  for (let i = 1; i < PHASE.length; i++) {
    const [w0, k0] = PHASE[i - 1], [w1, k1] = PHASE[i];
    if (streak < w1) return k0 + ((streak - w0) / (w1 - w0)) * (k1 - k0);
  }
  return 1;
}
export const orbitOf = (streak: number) => (streak >= 13 ? Math.min(1, streak / 52) : 0);
