import { addDays, fmt, startOfWeek } from "./lib";
import type { Content, Data, StepKey } from "./store";

// L'espace de démonstration, montré dans la vitrine (iframe nommée « semper-demo ») : le vrai Semper, avec
// une créatrice fictive. Tout est calé sur la semaine en cours, pour que l'aperçu ne vieillisse jamais.
// Rien n'est lu ni écrit dans la base (voir loadDemo dans store.ts).
export const DEMO_FRAME = "semper-demo";

const OBJ = "demo-objectif";
const PARTS = ["Hook", "Message", "Appel à l'action"].map((label, i) => ({ id: `demo-part-${i}`, label }));

export function demoData(now = new Date()): Data {
  const mon = startOfWeek(now);
  const at = (day: number, hm: string) => { const d = addDays(mon, day); const [h, m] = hm.split(":").map(Number); d.setHours(h, m, 0, 0); return fmt(d); };
  const past = (s: string) => s < fmt(now);
  let n = 0;
  const content = (title: string, pub: string | null, steps: [string, string, string] | null, obj: [string, string], script?: string[]): Content => {
    const st = Object.fromEntries((["ecriture", "tournage", "montage"] as StepKey[]).map((k, i) => {
      const a = steps?.[i] ?? null;
      return [k, { at: a, done: !!a && past(a) }];
    })) as Content["steps"];
    return {
      id: `demo-${++n}`, title, publishAt: pub, publishedAt: pub && past(pub) ? pub : null, steps: st,
      values: { [OBJ]: obj[0], [`${OBJ}/sub`]: `${obj[0]} › ${obj[1]}` },
      script: script ? { structureId: "demo-simple", parts: Object.fromEntries(script.map((t, i) => [PARTS[i].id, t])) } : undefined,
      createdAt: addDays(mon, -10).toISOString(),
    };
  };

  // La semaine en cours : une vidéo publiée lundi, trois à venir, une idée.
  const week: Content[] = [
    content("Ma semaine de fondateur", at(0, "18:00"), [at(-3, "10:00"), at(-2, "10:00"), at(0, "14:00")], ["Attacher", "Coulisses"],
      ["Lundi, j'ai failli tout arrêter.", "Ce que j'ai changé dans ma semaine pour tenir.", "Dis-moi en commentaire ce qui te fait décrocher."]),
    content("Pourquoi tu t'arrêtes", at(2, "18:00"), [at(0, "09:30"), at(1, "10:00"), at(1, "16:00")], ["Convertir", "Offre"],
      ["Tu ne manques pas d'idées.", "Tu manques d'un rythme qui tient les semaines chargées.", "Le lien est dans ma bio."]),
    content("3 erreurs de calendrier", at(4, "12:00"), [at(2, "10:00"), at(3, "09:30"), at(3, "14:00")], ["Attirer", "Erreur"]),
    content("Ma méthode en 3 blocs", at(6, "19:00"), [at(4, "10:00"), at(5, "11:00"), at(5, "15:00")], ["Convertir", "Tutoriel"]),
    content("Le piège du volume", null, null, ["Attacher", "Avis"]),
  ];
  // Six semaines tenues avant celle-ci (deux vidéos par semaine) : la série et la lune ont de quoi briller.
  const titles = ["Ma routine du lundi", "Pourquoi je filme le matin", "Le jour où un client m'a dit non", "Mon bureau en 15 secondes",
    "Ce que j'aurais aimé savoir à 100 abonnés", "3 outils que j'utilise", "Avant / après d'un projet", "Ma pire vidéo", "Répondre à un commentaire",
    "Le mythe de l'inspiration", "Une journée de tournage", "Ce que je ne filme jamais"];
  const objs: [string, string][] = [["Attirer", "Astuce"], ["Attacher", "Histoire"], ["Convertir", "Témoignage"], ["Attirer", "Tendance"]];
  const history = titles.map((t, i) => {
    const w = -1 - Math.floor(i / 2), d = i % 2 ? 3 : 1;
    const pub = at(w * 7 + d, "18:00");
    return content(t, pub, [at(w * 7 + d - 1, "10:00"), at(w * 7 + d - 1, "14:00"), at(w * 7 + d, "16:00")], objs[i % objs.length]);
  });

  return {
    v: 1,
    profile: {
      firstName: "Léa", handle: "lea.cree", email: "lea@exemple.com", rythme: 2,
      durations: { ecriture: 30, tournage: 20, montage: 45 }, answers: {}, lockUntil: null, avatar: null,
      createdAt: addDays(mon, -56).toISOString(),
    },
    fields: [{
      id: OBJ, label: "Objectif", type: "choix", options: ["Attirer", "Attacher", "Convertir"],
      sub: { Attirer: ["Astuce", "Erreur", "Tendance"], Attacher: ["Histoire", "Coulisses", "Avis"], Convertir: ["Tutoriel", "Témoignage", "Offre"] },
    }],
    structures: [{ id: "demo-simple", name: "Simple", parts: PARTS }],
    contents: [...week, ...history],
  };
}
