"use client";

import { useSyncExternalStore } from "react";
import { addMinutes, diffMinutes } from "./lib";

// Les données de l'espace. Pour l'instant dans le navigateur (localStorage),
// remplacées par Supabase au branchement : seules les fonctions de ce fichier changent.

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
export type Field = { id: string; label: string; type: FieldType; options: string[] };
export type Value = string | string[];

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
  onboarded: boolean; createdAt: string;
};

export type LeadStatus = "verifier" | "qualifie" | "non" | "contacte" | "discussion";
export const LEAD_STATUS: { key: LeadStatus; label: string }[] = [
  { key: "verifier", label: "À vérifier" },
  { key: "qualifie", label: "Qualifié" },
  { key: "contacte", label: "Contacté" },
  { key: "discussion", label: "En discussion" },
  { key: "non", label: "Pas pour nous" },
];
export type Lead = { status: LeadStatus; note: string };

export type Data = { v: 1; profile: Profile; fields: Field[]; structures: Structure[]; contents: Content[]; lead: Lead };

export type Status = "idee" | "ecrire" | "tourner" | "monter" | "pret" | "publie";
export const STATUS: { key: Status; label: string }[] = [
  { key: "idee", label: "Idée" },
  { key: "ecrire", label: "À écrire" },
  { key: "tourner", label: "À tourner" },
  { key: "monter", label: "À monter" },
  { key: "pret", label: "Prêt" },
  { key: "publie", label: "Publié" },
];

export const uid = () => (typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2));
const now = () => new Date().toISOString();

function fresh(): Data {
  return {
    v: 1,
    profile: { firstName: "", handle: "", email: "", rythme: 2, durations: { ecriture: 30, tournage: 20, montage: 45 }, answers: {}, onboarded: false, createdAt: now() },
    fields: [
      { id: uid(), label: "Format", type: "choix", options: ["Face caméra", "Voix off", "Tutoriel", "Carrousel"] },
      { id: uid(), label: "Plateforme", type: "multi", options: ["Instagram", "TikTok", "YouTube"] },
    ],
    structures: [
      structure("Problème, solution", ["Hook", "Problème", "Solution", "Appel à l'action"]),
      structure("Histoire", ["Hook", "Contexte", "Tournant", "Leçon"]),
      structure("Liste", ["Hook", "Point 1", "Point 2", "Point 3", "Conclusion"]),
    ],
    contents: [],
    lead: { status: "verifier", note: "" },
  };
}

export function structure(name: string, parts: string[]): Structure {
  return { id: uid(), name, parts: parts.map((label) => ({ id: uid(), label })) };
}

// ---------- le magasin
const KEY = "semper:v1";
let data: Data | null = null;
const subs = new Set<() => void>();

function load(): Data {
  const base = fresh();
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const d = JSON.parse(raw) as Data;
      return { ...base, ...d, profile: { ...base.profile, ...d.profile } };
    }
  } catch {}
  return base;
}
function snapshot() {
  if (!data) data = load();
  return data;
}
function onStorage(e: StorageEvent) {
  if (e.key !== KEY) return;
  data = load();
  subs.forEach((f) => f());
}
function subscribe(fn: () => void) {
  subs.add(fn);
  if (subs.size === 1) window.addEventListener("storage", onStorage);
  return () => {
    subs.delete(fn);
    if (!subs.size) window.removeEventListener("storage", onStorage);
  };
}

export function useData(): Data | null {
  return useSyncExternalStore(subscribe, snapshot, () => null);
}

function update(fn: (d: Data) => Data) {
  data = fn(snapshot());
  try { localStorage.setItem(KEY, JSON.stringify(data)); } catch {}
  subs.forEach((f) => f());
}

// ---------- actions
export function setProfile(p: Partial<Profile>) {
  update((d) => ({ ...d, profile: { ...d.profile, ...p } }));
}
export function setFields(fields: Field[]) {
  update((d) => ({ ...d, fields }));
}
export function setStructures(structures: Structure[]) {
  update((d) => ({ ...d, structures }));
}
export function setLead(l: Partial<Lead>) {
  update((d) => ({ ...d, lead: { ...d.lead, ...l } }));
}

export function createContent(publishAt: string | null = null): string {
  const id = uid();
  update((d) => {
    const c: Content = {
      id, title: "", publishAt: null, publishedAt: null, values: {}, createdAt: now(),
      steps: { ecriture: { at: null, done: false }, tournage: { at: null, done: false }, montage: { at: null, done: false } },
    };
    return { ...d, contents: [...d.contents, publishAt ? movePublish(c, publishAt, d.profile.durations) : c] };
  });
  return id;
}
export function patchContent(id: string, fn: (c: Content, d: Data) => Content) {
  update((d) => ({ ...d, contents: d.contents.map((c) => (c.id === id ? fn(c, d) : c)) }));
}
export function deleteContent(id: string) {
  update((d) => ({ ...d, contents: d.contents.filter((c) => c.id !== id) }));
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
