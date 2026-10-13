import { addMinutes, diffMinutes } from "./lib";
import type { Content, Field, StepKey, Structure } from "./store";

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

export const STEPS: { key: StepKey; label: string }[] = [
  { key: "ecriture", label: "Écriture" },
  { key: "tournage", label: "Tournage" },
  { key: "montage", label: "Montage" },
];

export type Status = "idee" | "ecrire" | "tourner" | "monter" | "pret" | "publie";
export const STATUS: { key: Status; label: string }[] = [
  { key: "idee", label: "Idée" },
  { key: "ecrire", label: "À écrire" },
  { key: "tourner", label: "À tourner" },
  { key: "monter", label: "À monter" },
  { key: "pret", label: "Prêt" },
  { key: "publie", label: "Publié" },
];

export function statusOf(c: Content): Status {
  if (c.publishedAt) return "publie";
  if (!c.steps.ecriture.done) return c.publishAt ? "ecrire" : "idee";
  if (!c.steps.tournage.done) return "tourner";
  if (!c.steps.montage.done) return "monter";
  return "pret";
}

// Change le statut depuis le kanban : les étapes d'avant sont faites, celles d'après non.
export function withStatus(c: Content, s: Status): Content {
  const order: Status[] = ["ecrire", "tourner", "monter", "pret"];
  if (s === "idee") {
    return { ...c, publishAt: null, publishedAt: null, steps: { ecriture: { at: null, done: false }, tournage: { at: null, done: false }, montage: { at: null, done: false } } };
  }
  const n = s === "publie" ? 3 : order.indexOf(s);
  const steps = { ...c.steps };
  STEPS.forEach((st, i) => { steps[st.key] = { ...steps[st.key], done: i < n }; });
  return { ...c, steps, publishedAt: s === "publie" ? c.publishedAt ?? c.publishAt ?? stamp() : null };
}

// Les étapes se posent à rebours de la publication : le montage finit à l'heure de publication,
// le tournage avant le montage, l'écriture avant le tournage.
export function placeSteps(publishAt: string, dur: Record<StepKey, number>) {
  const montage = addMinutes(publishAt, -dur.montage);
  const tournage = addMinutes(montage, -dur.tournage);
  const ecriture = addMinutes(tournage, -dur.ecriture);
  return { ecriture, tournage, montage };
}

// Déplacer la publication entraîne ses étapes. Une étape jamais posée se pose à rebours.
export function movePublish(c: Content, at: string | null, dur: Record<StepKey, number>): Content {
  if (!at) return { ...c, publishAt: null };
  const delta = c.publishAt ? diffMinutes(at, c.publishAt) : 0;
  const auto = placeSteps(at, dur);
  const steps = { ...c.steps };
  STEPS.forEach(({ key }) => {
    const s = steps[key];
    steps[key] = { ...s, at: s.at && c.publishAt ? addMinutes(s.at, delta) : auto[key] };
  });
  return { ...c, publishAt: at, steps };
}

export function stamp(d = new Date()) {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}
