import { addMinutes, diffMinutes } from "./lib";
import type { Content, Field, Structure } from "./store";

// Les règles d'un contenu, sans rien du navigateur : l'espace et le connecteur Claude (api/mcp) s'en servent.

export const uid = () => crypto.randomUUID();

// La fiche de départ des nouveaux inscrits : une vue d'ensemble, à compléter par les templates (Organisation).
// Les comptes qui ont déjà une fiche la gardent.
export const FIELDS = (): Field[] => [
  {
    id: uid(), label: "Objectif", type: "choix", options: ["Attirer", "Attacher", "Convertir"],
    sub: { Attirer: ["Astuce", "Erreur", "Tendance"], Attacher: ["Histoire", "Coulisses", "Avis"], Convertir: ["Tutoriel", "Témoignage", "Offre"] },
  },
];
export const STRUCTURES = (): Structure[] => [structure("Simple", ["Hook", "Message", "Appel à l'action"])];

export function structure(name: string, parts: string[]): Structure {
  return { id: uid(), name, parts: parts.map((label) => ({ id: uid(), label })) };
}

// Un sous-choix est rangé sous « Choix › Sous-choix ».
export const SEP = " › ";

// Les étapes : une liste que chacun règle (Organisation). Elles se posent à rebours de la publication, dans l'ordre.
// Une étape à 0 minute existe toujours mais ne se pose pas dans le calendrier et ne compte pas pour le statut.
export type StepDef = { key: string; label: string; minutes: number };
export const DEF_STEPS = (dur?: Record<string, number> | null): StepDef[] => [
  { key: "ecriture", label: "Écriture", minutes: dur?.ecriture ?? 30 },
  { key: "tournage", label: "Tournage", minutes: dur?.tournage ?? 20 },
  { key: "montage", label: "Montage", minutes: dur?.montage ?? 45 },
];
export const STEPS = DEF_STEPS();
export const live = (steps: StepDef[]) => steps.filter((s) => s.minutes > 0);
export const stepIn = (c: Content, k: string) => c.steps[k] ?? { at: null, done: false };

// Les statuts suivent les étapes actives : Idée, une colonne par étape, Prêt, Publié.
// Les trois étapes de départ gardent leurs noms d'action (« À écrire ») et leurs clés (« ecrire »).
export type Status = string;
const VERB: Record<string, [string, string]> = { ecriture: ["ecrire", "À écrire"], tournage: ["tourner", "À tourner"], montage: ["monter", "À monter"] };
export const statusKey = (k: string) => VERB[k]?.[0] ?? k;
export function statuses(steps: StepDef[] = STEPS): { key: Status; label: string }[] {
  return [{ key: "idee", label: "Idée" }, ...live(steps).map((s) => ({ key: statusKey(s.key), label: VERB[s.key]?.[1] ?? s.label })), { key: "pret", label: "Prêt" }, { key: "publie", label: "Publié" }];
}
export const STATUS = statuses();

export function statusOf(c: Content, steps: StepDef[] = STEPS): Status {
  if (c.publishedAt) return "publie";
  const l = live(steps);
  const i = l.findIndex((s) => !stepIn(c, s.key).done);
  if (i < 0) return l.length || c.publishAt ? "pret" : "idee";
  if (i === 0 && !c.publishAt) return "idee";
  return statusKey(l[i].key);
}

// Change le statut depuis le kanban : les étapes d'avant sont faites, celles d'après non.
export function withStatus(c: Content, s: Status, steps: StepDef[] = STEPS): Content {
  if (s === "idee") {
    const blank = Object.fromEntries([...new Set([...Object.keys(c.steps), ...steps.map((x) => x.key)])].map((k) => [k, { at: null, done: false }]));
    return { ...c, publishAt: null, publishedAt: null, steps: blank };
  }
  const l = live(steps);
  const n = s === "publie" || s === "pret" ? l.length : Math.max(0, l.findIndex((x) => statusKey(x.key) === s));
  const next = { ...c.steps };
  l.forEach((x, i) => { next[x.key] = { ...stepIn(c, x.key), done: i < n }; });
  return { ...c, steps: next, publishedAt: s === "publie" ? c.publishedAt ?? c.publishAt ?? stamp() : null };
}

// Les étapes se posent à rebours de la publication : la dernière finit à l'heure de publication,
// chacune finit quand la suivante commence. Une étape à 0 minute n'a pas d'heure.
export function placeSteps(publishAt: string, steps: StepDef[]) {
  const out: Record<string, string | null> = {};
  let t = publishAt;
  for (const s of [...steps].reverse()) {
    if (s.minutes > 0) { t = addMinutes(t, -s.minutes); out[s.key] = t; } else out[s.key] = null;
  }
  return out;
}

// Déplacer la publication entraîne ses étapes. Une étape jamais posée se pose à rebours.
export function movePublish(c: Content, at: string | null, steps: StepDef[]): Content {
  if (!at) return { ...c, publishAt: null };
  const delta = c.publishAt ? diffMinutes(at, c.publishAt) : 0;
  const auto = placeSteps(at, steps);
  const next = { ...c.steps };
  steps.forEach(({ key }) => {
    const s = stepIn(c, key);
    next[key] = { ...s, at: s.at && c.publishAt ? addMinutes(s.at, delta) : auto[key] };
  });
  return { ...c, publishAt: at, steps: next };
}

export function stamp(d = new Date()) {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}
