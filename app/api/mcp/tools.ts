import { randomUUID } from "crypto";
import { admin } from "../../server";
import { addDays, dayKey, parse, startOfWeek } from "../../(app)/lib";
import { FIELDS, SEP, STATUS, STEPS, STRUCTURES, movePublish, statusOf, withStatus, type Status } from "../../(app)/rules";
import { constance, titleOf } from "../../(app)/stats";
import type { Content, Data, Field, Structure, Value } from "../../(app)/store";

// Les outils du connecteur Claude. Chaque appel relit le compte dans la base et n'écrit que ses propres contenus.
// Les règles sont celles de l'espace (rules.ts) : statuts, étapes posées à rebours de la publication.

type Args = Record<string, unknown>;
type Ctx = { uid: string };
export class Oops extends Error {}

const DATE = /^\d{4}-\d{2}-\d{2}$/;
const AT = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/;
// L'heure d'un créateur : Semper planifie en heure locale, sans fuseau. Le serveur tourne en UTC, on lit Zurich.
function now() {
  const p = Object.fromEntries(new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Zurich", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" })
    .formatToParts(new Date()).map((x) => [x.type, x.value]));
  return `${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}`;
}

async function load({ uid }: Ctx): Promise<Data> {
  const a = admin();
  const [{ data: p, error: e1 }, { data: rows, error: e2 }] = await Promise.all([
    a.from("profiles").select("first_name, rythme, durations, fields, structures, created_at").eq("id", uid).single(),
    a.from("contents").select("*").eq("user_id", uid),
  ]);
  if (e1 || e2 || !p) throw new Error("lecture");
  // Compte jamais ouvert dans l'espace : la fiche de départ, écrite comme le fait l'espace à la première visite.
  if (!p.fields || !p.structures) {
    p.fields ??= FIELDS(); p.structures ??= STRUCTURES();
    await a.from("profiles").update({ fields: p.fields, structures: p.structures }).eq("id", uid);
  }
  const contents: Content[] = (rows ?? []).map((r) => ({
    id: r.id, title: r.title, publishAt: r.publish_at, publishedAt: r.published_at, steps: r.steps,
    values: r.field_values ?? {}, script: r.script ?? undefined, createdAt: r.created_at,
  }));
  return {
    v: 1,
    profile: { firstName: p.first_name, rythme: p.rythme, durations: p.durations, createdAt: p.created_at } as Data["profile"],
    fields: (p.fields as Field[] | null) ?? [], structures: (p.structures as Structure[] | null) ?? [], contents,
  };
}

// ---------- lecture
const label = (s: Status) => STATUS.find((x) => x.key === s)!.label;
const arr = (v: Value | undefined) => (Array.isArray(v) ? v : v ? [v] : []);
function fieldsOf(d: Data, c: Content) {
  const out: Record<string, string | string[]> = {};
  for (const f of d.fields) {
    const v = c.values[f.id], sub = arr(c.values[`${f.id}/sub`]);
    if (f.type === "texte" || f.type === "long") { if (typeof v === "string" && v) out[f.label] = v; continue; }
    const picks = arr(v).map((o) => { const s = sub.find((x) => x.startsWith(o + SEP)); return s ? `${o} · ${s.slice(o.length + SEP.length)}` : o; });
    if (picks.length) out[f.label] = f.type === "multi" ? picks : picks[0];
  }
  return out;
}
function brief(d: Data, c: Content) {
  return { id: c.id, titre: c.title || "Sans titre", statut: label(statusOf(c)), publication: c.publishAt, ...fieldsOf(d, c) };
}
function full(d: Data, c: Content) {
  const st = c.script?.structureId ? d.structures.find((s) => s.id === c.script!.structureId) : undefined;
  const parts = st ? Object.fromEntries(st.parts.map((p) => [p.label, c.script!.parts[p.id] ?? ""]).filter(([, t]) => t)) : {};
  return {
    ...brief(d, c), publiee_le: c.publishedAt,
    etapes: Object.fromEntries(STEPS.map((s) => [s.label, { date: c.steps[s.key].at, faite: c.steps[s.key].done }])),
    ...(st ? { script: { structure: st.name, parties: parts } } : {}),
  };
}
const find = (d: Data, id: unknown) => {
  const c = d.contents.find((x) => x.id === id);
  if (!c) throw new Oops("Aucun contenu avec cet id. Cherche-le d'abord avec lister_contenus.");
  return c;
};

// ---------- écriture
function setFields(d: Data, c: Content, champs: unknown): Content {
  if (champs == null) return c;
  if (typeof champs !== "object" || Array.isArray(champs)) throw new Oops("« champs » attend un objet : nom du champ → valeur.");
  const values = { ...c.values };
  for (const [name, raw] of Object.entries(champs as Args)) {
    const f = d.fields.find((x) => x.label.toLowerCase() === name.toLowerCase());
    if (!f) throw new Oops(`Champ inconnu : « ${name} ». Champs de la fiche : ${d.fields.map((x) => x.label).join(", ") || "aucun"}.`);
    if (f.type === "texte" || f.type === "long") { values[f.id] = String(raw ?? "").slice(0, f.type === "long" ? 4000 : 300); continue; }
    const wanted = (Array.isArray(raw) ? raw : raw == null || raw === "" ? [] : [raw]).map(String);
    if (f.type === "choix" && wanted.length > 1) throw new Oops(`« ${f.label} » n'accepte qu'un choix.`);
    const opts: string[] = [], subs: string[] = [];
    for (const w of wanted) {
      const [o, s] = w.split(/\s*[·›]\s*/);
      const parent = f.options.find((x) => x.toLowerCase() === o.toLowerCase())
        ?? (!s ? Object.keys(f.sub ?? {}).find((p) => f.sub![p].some((x) => x.toLowerCase() === o.toLowerCase())) : undefined);
      const sub = s ?? (parent && parent.toLowerCase() !== o.toLowerCase() ? o : undefined);
      if (!parent) throw new Oops(`« ${w} » n'existe pas dans « ${f.label} ». Choix : ${f.options.map((x) => (f.sub?.[x]?.length ? `${x} (${f.sub[x].join(", ")})` : x)).join(", ")}.`);
      opts.push(parent);
      if (sub) {
        const real = f.sub?.[parent]?.find((x) => x.toLowerCase() === sub.toLowerCase());
        if (!real) throw new Oops(`« ${sub} » n'existe pas sous « ${parent} ». Choix : ${(f.sub?.[parent] ?? []).join(", ") || "aucun"}.`);
        subs.push(parent + SEP + real);
      }
    }
    values[f.id] = f.type === "multi" ? opts : opts[0] ?? "";
    if (subs.length) values[`${f.id}/sub`] = f.type === "multi" ? subs : subs[0];
    else delete values[`${f.id}/sub`];
  }
  return { ...c, values };
}
function setScript(d: Data, c: Content, script: unknown, structure: unknown): Content {
  if (script == null && structure == null) return c;
  const st = structure != null
    ? d.structures.find((s) => s.name.toLowerCase() === String(structure).toLowerCase())
    : d.structures.find((s) => s.id === c.script?.structureId) ?? d.structures[0];
  if (!st) throw new Oops(`Structure inconnue. Structures : ${d.structures.map((s) => s.name).join(", ") || "aucune"}.`);
  const parts = c.script?.structureId === st.id ? { ...c.script.parts } : {};
  if (script != null) {
    if (typeof script !== "object" || Array.isArray(script)) throw new Oops("« script » attend un objet : nom de la partie → texte.");
    for (const [name, text] of Object.entries(script as Args)) {
      const part = st.parts.find((p) => p.label.toLowerCase() === name.toLowerCase());
      if (!part) throw new Oops(`Partie inconnue : « ${name} ». Parties de « ${st.name} » : ${st.parts.map((p) => p.label).join(", ")}.`);
      parts[part.id] = String(text ?? "").slice(0, 4000);
    }
  }
  return { ...c, script: { structureId: st.id, parts } };
}
function setPublish(d: Data, c: Content, v: unknown): Content {
  if (v === undefined) return c;
  if (v === null || v === "") return withStatus(c, "idee");
  let at = String(v).trim();
  if (DATE.test(at)) at += "T18:00";
  if (!AT.test(at) || isNaN(parse(at).getTime())) throw new Oops("« publication » attend AAAA-MM-JJTHH:MM (heure locale), par exemple 2026-10-20T18:00.");
  return movePublish(c, at, d.profile.durations);
}
function setStatus(c: Content, v: unknown): Content {
  if (v == null) return c;
  const s = STATUS.find((x) => x.key === v || x.label.toLowerCase() === String(v).toLowerCase())?.key;
  if (!s) throw new Oops(`Statut inconnu. Statuts : ${STATUS.map((x) => x.key).join(", ")}.`);
  const next = withStatus({ ...c, publishedAt: s === "publie" ? c.publishedAt ?? c.publishAt ?? now() : c.publishedAt }, s);
  return next;
}
async function save(ctx: Ctx, c: Content, isNew: boolean) {
  const row = {
    title: c.title, publish_at: c.publishAt, published_at: c.publishedAt, steps: c.steps,
    field_values: c.values, script: c.script ?? null, updated_at: new Date().toISOString(),
  };
  const a = admin();
  const { error } = isNew
    ? await a.from("contents").insert({ ...row, id: c.id, user_id: ctx.uid, created_at: c.createdAt })
    : await a.from("contents").update(row).eq("id", c.id).eq("user_id", ctx.uid);
  if (error) throw new Oops("Enregistrement refusé par la base (texte trop long ?).");
}

// ---------- les outils
const S = { type: "string" } as const;
const CHAMPS = { type: "object", description: "Champs de la fiche, nom → valeur. Pour un choix : « Attirer » ou « Attirer · Erreur ». Voir lire_organisation.", additionalProperties: true };
const SCRIPT = { type: "object", description: "Parties du script, nom de la partie → texte (par exemple { \"Hook\": \"…\" }). Voir lire_organisation.", additionalProperties: { type: "string" } };
const PUB = { type: ["string", "null"], description: "Date de publication en heure locale, AAAA-MM-JJTHH:MM. Les étapes (écriture, tournage, montage) se posent toutes seules à rebours. null = remettre en idée." };

export const TOOLS = [
  {
    name: "lire_semaine", title: "Lire une semaine",
    description: "La semaine du créateur dans Semper : pour chaque jour, les étapes (écriture, tournage, montage) et les publications prévues, avec leur heure. Par défaut la semaine en cours.",
    inputSchema: { type: "object", properties: { date: { ...S, description: "N'importe quel jour de la semaine voulue, AAAA-MM-JJ. Par défaut aujourd'hui." } } },
    annotations: { readOnlyHint: true },
    async run(ctx: Ctx, a: Args) {
      const d = await load(ctx);
      if (a.date != null && !DATE.test(String(a.date))) throw new Oops("« date » attend AAAA-MM-JJ.");
      const ws = startOfWeek(parse(a.date ? `${a.date}T12:00` : now()));
      const days = Array.from({ length: 7 }, (_, i) => dayKey(addDays(ws, i)));
      const agenda = days.map((day) => {
        const items: { heure: string; quoi: string; contenu: string; id: string; faite: boolean }[] = [];
        for (const c of d.contents) {
          for (const s of STEPS) { const at = c.steps[s.key].at; if (at?.startsWith(day)) items.push({ heure: at.slice(11), quoi: s.label, contenu: c.title || "Sans titre", id: c.id, faite: c.steps[s.key].done }); }
          if (c.publishAt?.startsWith(day)) items.push({ heure: c.publishAt.slice(11), quoi: "Publication", contenu: c.title || "Sans titre", id: c.id, faite: !!c.publishedAt });
        }
        return { jour: day, items: items.sort((x, y) => x.heure.localeCompare(y.heure)) };
      });
      const k = constance(d, parse(now()));
      return { semaine: `${days[0]} au ${days[6]}`, publiees_cette_semaine: k.thisWeek, rythme_vise: k.rythme, jours: agenda };
    },
  },
  {
    name: "lister_contenus", title: "Lister les contenus",
    description: "Les contenus (vidéos) du créateur avec leur statut, leur date de publication et les champs de leur fiche. Filtre possible par statut ou par texte.",
    inputSchema: { type: "object", properties: {
      statut: { type: "string", enum: STATUS.map((s) => s.key), description: "idee, ecrire, tourner, monter, pret ou publie." },
      recherche: { ...S, description: "Texte cherché dans le titre, les champs et le script." },
      limite: { type: "integer", minimum: 1, maximum: 200, description: "50 par défaut." },
    } },
    annotations: { readOnlyHint: true },
    async run(ctx: Ctx, a: Args) {
      const d = await load(ctx);
      const q = String(a.recherche ?? "").trim().toLowerCase();
      const list = d.contents
        .filter((c) => !a.statut || statusOf(c) === a.statut)
        .filter((c) => !q || [c.title, ...Object.values(c.values).flat(), ...Object.values(c.script?.parts ?? {})].join(" ").toLowerCase().includes(q))
        .sort((x, y) => (x.publishAt ?? "9999").localeCompare(y.publishAt ?? "9999"));
      const n = Math.min(200, Math.max(1, Number(a.limite) || 50));
      return { total: list.length, contenus: list.slice(0, n).map((c) => brief(d, c)) };
    },
  },
  {
    name: "lire_contenu", title: "Lire un contenu",
    description: "Tout un contenu : statut, dates des étapes, champs de la fiche et script partie par partie.",
    inputSchema: { type: "object", properties: { id: S }, required: ["id"] },
    annotations: { readOnlyHint: true },
    async run(ctx: Ctx, a: Args) { const d = await load(ctx); return full(d, find(d, a.id)); },
  },
  {
    name: "creer_contenu", title: "Créer un contenu",
    description: "Ajoute une vidéo dans Semper. Sans date, elle reste une idée. Avec une date, elle apparaît au calendrier avec ses étapes.",
    inputSchema: { type: "object", properties: { titre: S, publication: PUB, champs: CHAMPS, structure: { ...S, description: "Nom de la structure de script. Par défaut la première." }, script: SCRIPT }, required: ["titre"] },
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false },
    async run(ctx: Ctx, a: Args) {
      const d = await load(ctx);
      const title = String(a.titre ?? "").trim().slice(0, 200);
      if (!title) throw new Oops("Il faut un titre.");
      let c: Content = {
        id: randomUUID(), title, publishAt: null, publishedAt: null, values: {}, createdAt: new Date().toISOString(),
        steps: { ecriture: { at: null, done: false }, tournage: { at: null, done: false }, montage: { at: null, done: false } },
      };
      c = setScript(d, setFields(d, setPublish(d, c, a.publication ?? undefined), a.champs), a.script, a.structure);
      await save(ctx, c, true);
      return { cree: full(d, c) };
    },
  },
  {
    name: "modifier_contenu", title: "Modifier un contenu",
    description: "Change le titre, la date de publication, le statut, les champs ou le script d'un contenu. Seul ce qui est donné change. Changer la date déplace aussi ses étapes.",
    inputSchema: { type: "object", properties: {
      id: S, titre: S, publication: PUB,
      statut: { type: "string", enum: STATUS.map((s) => s.key), description: "Les étapes d'avant sont marquées faites, celles d'après non. publie marque la vidéo publiée." },
      champs: CHAMPS, structure: { ...S, description: "Nom de la structure de script." }, script: SCRIPT,
    }, required: ["id"] },
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true },
    async run(ctx: Ctx, a: Args) {
      const d = await load(ctx);
      let c = find(d, a.id);
      if (a.titre != null) { const t = String(a.titre).trim().slice(0, 200); if (!t) throw new Oops("Le titre ne peut pas être vide."); c = { ...c, title: t }; }
      c = setStatus(setScript(d, setFields(d, setPublish(d, c, a.publication), a.champs), a.script, a.structure), a.statut);
      await save(ctx, c, false);
      return { modifie: full(d, c) };
    },
  },
  {
    name: "lire_constance", title: "Lire la constance",
    description: "La régularité du créateur : rythme visé (vidéos par semaine), série de semaines tenues, record, titre de lune, publications de la semaine et le conseil du moment.",
    inputSchema: { type: "object", properties: {} },
    annotations: { readOnlyHint: true },
    async run(ctx: Ctx) {
      const d = await load(ctx);
      const k = constance(d, parse(now()));
      return { rythme_vise: k.rythme, publiees_cette_semaine: k.thisWeek, serie: k.streak, record: k.record, titre: titleOf(k.streak).title, total_publiees: k.total, conseil: k.advice };
    },
  },
  {
    name: "lire_organisation", title: "Lire l'organisation",
    description: "La fiche du créateur (champs et leurs choix), ses structures de script (parties) et la durée de chaque étape. À lire avant de remplir des champs ou un script.",
    inputSchema: { type: "object", properties: {} },
    annotations: { readOnlyHint: true },
    async run(ctx: Ctx) {
      const d = await load(ctx);
      return {
        champs: d.fields.map((f) => ({ nom: f.label, type: f.type, ...(f.options.length ? { choix: f.options } : {}), ...(f.sub && Object.keys(f.sub).length ? { sous_choix: f.sub } : {}) })),
        structures: d.structures.map((s) => ({ nom: s.name, parties: s.parts.map((p) => p.label) })),
        durees_minutes: Object.fromEntries(STEPS.map((s) => [s.label, d.profile.durations[s.key]])),
        statuts: STATUS.map((s) => ({ cle: s.key, nom: s.label })),
      };
    },
  },
];
