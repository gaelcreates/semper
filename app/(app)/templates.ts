import type { Field, FieldType, Structure } from "./store";

// Les templates d'Organisation : des champs et des scripts qu'on ajoute à sa fiche en un clic, sans rien écraser.
// Un template est « ajouté » quand un champ ou un script porte déjà son nom (casse, accents et ponctuation ignorés).

export type FieldTpl = {
  name: string; // le nom de la carte
  label: string; // le nom du champ ajouté
  alt?: string; // son nom si un champ porte déjà « label » avec d'autres choix
  type: FieldType;
  options: string[];
  sub?: Record<string, string[]>;
};
export type ScriptTpl = { name: string; parts: string[] };

export const FIELD_TPLS: FieldTpl[] = [
  {
    name: "Objectif complet", label: "Objectif", alt: "Objectif complet", type: "choix",
    options: ["Attirer", "Attacher", "Convertir"],
    sub: {
      Attirer: ["Erreur courante", "Problème-solution", "Parcours du héros", "Montage"],
      Attacher: ["A contre B", "Liste", "Épiphanie", "Série"],
      Convertir: ["Décryptage", "Tutoriel", "Étude de cas", "Extrait d'interview"],
    },
  },
  { name: "Pilier", label: "Pilier", type: "choix", options: ["Qui", "Pourquoi", "Comment", "Quoi"] },
  { name: "Plateforme", label: "Plateforme", type: "multi", options: ["Instagram", "TikTok", "YouTube", "LinkedIn"] },
  { name: "Format", label: "Format", type: "choix", options: ["Face caméra", "Voix off", "Carrousel", "Vlog"] },
];

export const SCRIPT_TPLS: ScriptTpl[] = [
  { name: "Simple", parts: ["Hook", "Message", "Appel à l'action"] },
  { name: "Quatre temps", parts: ["Preuve", "Hook", "Contexte", "Re-hook", "Bascule", "Clôture"] },
  { name: "Problème-solution", parts: ["Hook", "Problème", "Solution", "Appel à l'action"] },
  { name: "Liste", parts: ["Hook", "Point 1", "Point 2", "Point 3", "Appel à l'action"] },
  { name: "Histoire", parts: ["Hook", "Avant", "Déclic", "Après", "Leçon"] },
  { name: "Tutoriel", parts: ["Hook", "Résultat", "Étapes", "Appel à l'action"] },
];

// « Problème, solution » et « Problème-solution » sont le même nom.
export const same = (a: string, b: string) => {
  const k = (s: string) => s.normalize("NFD").replace(/[^\p{L}\p{N}]/gu, "").toLowerCase();
  return k(a) === k(b);
};

const sameChoices = (f: Field, t: FieldTpl) => JSON.stringify([f.options, f.sub ?? {}]) === JSON.stringify([t.options, t.sub ?? {}]);

// Déjà dans la fiche ? Pour un template à second nom, le premier nom ne compte que si les choix sont les siens :
// l'Objectif de la fiche de départ n'est pas l'Objectif complet.
export const fieldAdded = (t: FieldTpl, fields: Field[]) =>
  fields.some((f) => (t.alt && same(f.label, t.alt)) || (same(f.label, t.label) && (!t.alt || sameChoices(f, t))));

// Le nom sous lequel le champ s'ajoute : le sien, ou le second si le premier est pris.
export const fieldLabel = (t: FieldTpl, fields: Field[]) =>
  t.alt && fields.some((f) => same(f.label, t.label)) ? t.alt : t.label;

export const scriptAdded = (t: ScriptTpl, list: Structure[]) => list.some((s) => same(s.name, t.name));
