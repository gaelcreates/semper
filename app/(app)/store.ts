"use client";

import { useSyncExternalStore } from "react";
import { addMinutes, diffMinutes } from "./lib";
import { sb } from "../supabase";

// Les données de l'espace, chargées depuis Supabase à la connexion et gardées en mémoire.
// L'interface lit et modifie la copie en mémoire ; chaque action l'écrit aussi dans Supabase.

export type StepKey = "ecriture" | "tournage" | "montage";
export const STEPS: { key: StepKey; label: string }[] = [
  { key: "ecriture", label: "Écriture" },
  { key: "tournage", label: "Tournage" },
  { key: "montage", label: "Montage" },
];

export type FieldType = "texte" | "long" | "choix" | "multi";
export const FIELD_TYPES: { type: FieldType; label: string }[] = [
  { type: "texte", label: "Texte court" },
  { type: "long", label: "Texte long" },
  { type: "choix", label: "Choix unique" },
  { type: "multi", label: "Choix multiple" },
];
// Un champ à choix peut donner des sous-choix à chacun de ses choix : on choisit « Attirer »,
// seuls les formats d'Attirer s'affichent. Le sous-choix est rangé sous « Choix › Sous-choix ».
export type Field = { id: string; label: string; type: FieldType; options: string[]; sub?: Record<string, string[]> };
export type Value = string | string[];
export const SEP = " › ";
export const subKey = (f: Field) => `${f.id}/sub`;
const arr = (v: Value | undefined) => (Array.isArray(v) ? v : v ? [v] : []);
// Tout ce qui est coché dans un champ : ses choix et ses sous-choix.
export const picked = (c: { values: Record<string, Value> }, f: Field) => [...arr(c.values[f.id]), ...arr(c.values[subKey(f)])];

export type Part = { id: string; label: string };
export type Structure = { id: string; name: string; parts: Part[] };

export type Content = {
  id: string;
  title: string;
  publishAt: string | null; // « 2026-09-29T19:00 », heure locale ; null = idée
  publishedAt: string | null; // posé quand la personne marque la vidéo publiée
  steps: Record<StepKey, { at: string | null; done: boolean }>;
  values: Record<string, Value>;
  script?: { structureId: string | null; parts: Record<string, string> };
  createdAt: string;
};

export type Profile = {
  firstName: string; handle: string; email: string; rythme: number; durations: Record<StepKey, number>;
  answers: Record<string, Value>; // réponses du premier passage (qualification)
  lockUntil: string | null; // rythme bloqué jusqu'à cette date (AAAA-MM-JJ), choisi par la personne
  createdAt: string;
};

export type LeadStatus = "verifier" | "qualifie" | "non" | "contacte" | "discussion";
export const LEAD_STATUS: { key: LeadStatus; label: string }[] = [
  { key: "verifier", label: "À vérifier" },
  { key: "qualifie", label: "Qualifié" },
  { key: "contacte", label: "Contacté" },
  { key: "discussion", label: "En discussion" },
  { key: "non", label: "Pas pour nous" },
];

export type Data = { v: 1; profile: Profile; fields: Field[]; structures: Structure[]; contents: Content[] };

export type Status = "idee" | "ecrire" | "tourner" | "monter" | "pret" | "publie";
export const STATUS: { key: Status; label: string }[] = [
  { key: "idee", label: "Idée" },
  { key: "ecrire", label: "À écrire" },
  { key: "tourner", label: "À tourner" },
  { key: "monter", label: "À monter" },
  { key: "pret", label: "Prêt" },
  { key: "publie", label: "Publié" },
];

export const uid = () => crypto.randomUUID();

const FIELDS = (): Field[] => [
  { id: uid(), label: "Format", type: "choix", options: ["Face caméra", "Voix off", "Tutoriel", "Carrousel"] },
  { id: uid(), label: "Plateforme", type: "multi", options: ["Instagram", "TikTok", "YouTube"] },
];
const STRUCTURES = (): Structure[] => [
  structure("Problème, solution", ["Hook", "Problème", "Solution", "Appel à l'action"]),
  structure("Histoire", ["Hook", "Contexte", "Tournant", "Leçon"]),
  structure("Liste", ["Hook", "Point 1", "Point 2", "Point 3", "Conclusion"]),
];

export function structure(name: string, parts: string[]): Structure {
  return { id: uid(), name, parts: parts.map((label) => ({ id: uid(), label })) };
}

// ---------- le magasin : une copie en mémoire, chaque changement part aussitôt vers Supabase
type Row = Record<string, unknown>;
let data: Data | null = null;
let me: string | null = null;
const subs = new Set<() => void>();
const emit = () => subs.forEach((f) => f());

export function useData(): Data | null {
  return useSyncExternalStore((f) => { subs.add(f); return () => subs.delete(f); }, () => data, () => null);
}

const fromRow = (r: Row): Content => ({
  id: r.id as string, title: r.title as string, publishAt: r.publish_at as string | null, publishedAt: r.published_at as string | null,
  steps: r.steps as Content["steps"], values: (r.field_values ?? {}) as Content["values"], script: (r.script ?? undefined) as Content["script"],
  createdAt: r.created_at as string,
});
const toRow = (c: Content) => ({
  id: c.id, user_id: me, title: c.title, publish_at: c.publishAt, published_at: c.publishedAt,
  steps: c.steps, field_values: c.values, script: c.script ?? null, updated_at: new Date().toISOString(),
});

// Charge l'espace de la personne connectée. « none » : pas de session, direction la connexion.
export async function load(): Promise<"ok" | "none"> {
  const s = sb();
  const { data: { session } } = await s.auth.getSession();
  if (!session) return "none";
  me = session.user.id;
  const [p, c] = await Promise.all([
    s.from("profiles").select("*").eq("id", me).single(),
    s.from("contents").select("*").eq("user_id", me),
  ]);
  if (!p.data) return "none";
  const r = p.data;
  data = {
    v: 1,
    profile: { firstName: r.first_name, handle: r.handle, email: r.email, rythme: r.rythme, durations: r.durations, answers: r.answers, lockUntil: r.rythme_locked_until, createdAt: r.created_at },
    fields: r.fields ?? FIELDS(),
    structures: r.structures ?? STRUCTURES(),
    contents: (c.data ?? []).map(fromRow),
  };
  emit();
  save(s.from("profiles").update({ seen_at: new Date().toISOString(), fields: data.fields, structures: data.structures }).eq("id", me));
  // Un jour d'activité, à la date locale : c'est ce qui mesure qui revient.
  save(s.from("activity").upsert({ day: new Date().toLocaleDateString("sv-SE") }, { onConflict: "user_id,day", ignoreDuplicates: true }));
  return "ok";
}

export async function signOut() {
  flushProfile();
  pending.forEach((t, id) => { clearTimeout(t); const c = data?.contents.find((x) => x.id === id); if (c) sb().from("contents").upsert(toRow(c)).then(); });
  await new Promise((r) => setTimeout(r, 300));
  await sb().auth.signOut();
  data = null;
  location.href = "/connexion";
}

// Une écriture qui échoue est signalée : rien ne se perd en silence.
function save(q: PromiseLike<{ error: unknown }>) {
  q.then(({ error }) => { if (error) { console.error(error); announce("Pas enregistré. Vérifie ta connexion."); } });
}

function update(fn: (d: Data) => Data) {
  if (!data) return;
  data = fn(data);
  emit();
}

// La frappe dans une fiche est regroupée : une écriture par demi-seconde et par contenu.
const pending = new Map<string, ReturnType<typeof setTimeout>>();
function push(id: string) {
  clearTimeout(pending.get(id));
  pending.set(id, setTimeout(() => {
    pending.delete(id);
    const c = data?.contents.find((x) => x.id === id);
    if (c) save(sb().from("contents").upsert(toRow(c)));
  }, 500));
}
// Pareil pour le profil : les changements rapprochés partent en une seule écriture, dans l'ordre.
let profileCols: Row = {};
let profileTimer: ReturnType<typeof setTimeout> | undefined;
function pushProfile(cols: Row) {
  profileCols = { ...profileCols, ...cols };
  clearTimeout(profileTimer);
  profileTimer = setTimeout(flushProfile, 400);
}
function flushProfile() {
  clearTimeout(profileTimer);
  if (!Object.keys(profileCols).length) return;
  const cols = profileCols;
  profileCols = {};
  save(sb().from("profiles").update(cols).eq("id", me));
}
if (typeof window !== "undefined") {
  window.addEventListener("pagehide", () => {
    flushProfile();
    pending.forEach((t, id) => { clearTimeout(t); const c = data?.contents.find((x) => x.id === id); if (c) sb().from("contents").upsert(toRow(c)).then(); });
  });
}

// ---------- actions
export function setProfile(p: Partial<Profile>) {
  if (p.rythme !== undefined && data && locked(data.profile)) return;
  update((d) => ({ ...d, profile: { ...d.profile, ...p } }));
  const cols: Row = {};
  if (p.firstName !== undefined) cols.first_name = p.firstName;
  if (p.handle !== undefined) cols.handle = p.handle;
  if (p.rythme !== undefined) cols.rythme = p.rythme;
  if (p.durations !== undefined) cols.durations = p.durations;
  if (p.answers !== undefined) cols.answers = p.answers;
  if (p.lockUntil !== undefined) cols.rythme_locked_until = p.lockUntil;
  if (Object.keys(cols).length) pushProfile(cols);
}
// Le rythme est-il bloqué aujourd'hui ? La base refuse aussi tout changement pendant le blocage.
export const locked = (p: Profile) => !!p.lockUntil && p.lockUntil >= new Date().toISOString().slice(0, 10);

export function setFields(fields: Field[]) {
  update((d) => ({ ...d, fields }));
  pushProfile({ fields });
}
export function setStructures(structures: Structure[]) {
  update((d) => ({ ...d, structures }));
  pushProfile({ structures });
}

export function createContent(publishAt: string | null = null): string {
  const id = uid();
  update((d) => {
    const c: Content = {
      id, title: "", publishAt: null, publishedAt: null, values: {}, createdAt: new Date().toISOString(),
      steps: { ecriture: { at: null, done: false }, tournage: { at: null, done: false }, montage: { at: null, done: false } },
    };
    return { ...d, contents: [...d.contents, publishAt ? movePublish(c, publishAt, d.profile.durations) : c] };
  });
  push(id);
  return id;
}
export function patchContent(id: string, fn: (c: Content, d: Data) => Content) {
  update((d) => ({ ...d, contents: d.contents.map((c) => (c.id === id ? fn(c, d) : c)) }));
  push(id);
}
export function deleteContent(id: string) {
  clearTimeout(pending.get(id));
  pending.delete(id);
  update((d) => ({ ...d, contents: d.contents.filter((c) => c.id !== id) }));
  save(sb().from("contents").delete().eq("id", id));
}

// ---------- règles
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

// ---------- état d'interface : la fiche ouverte
let openId: string | null = null;
const uiSubs = new Set<() => void>();
export function useOpen() {
  return useSyncExternalStore((f) => { uiSubs.add(f); return () => uiSubs.delete(f); }, () => openId, () => null);
}
export function openSheet(id: string | null) {
  openId = id;
  uiSubs.forEach((f) => f());
}

// ---------- une annonce brève (semaine tenue, nouveau titre)
let note: { text: string; streak: number; at: number } | null = null;
const noteSubs = new Set<() => void>();
export function useNote() {
  return useSyncExternalStore((f) => { noteSubs.add(f); return () => noteSubs.delete(f); }, () => note, () => null);
}
export function announce(text: string | null, streak = 0) {
  note = text ? { text, streak, at: Date.now() } : null;
  noteSubs.forEach((f) => f());
}
