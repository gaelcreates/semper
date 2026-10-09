import { sb } from "../../supabase";
import { answer, TEMPS, type Score } from "./score";

// Le modèle du CRM : étapes de prospection, suites, vues, tris, export, et les écritures en base (toujours vérifiées).

export type LeadStatus = "verifier" | "qualifie" | "contacte" | "discussion" | "appel" | "client" | "non";
export const LEAD_STATUS: { key: LeadStatus; label: string }[] = [
  { key: "verifier", label: "À trier" }, { key: "qualifie", label: "À contacter" }, { key: "contacte", label: "Contacté" },
  { key: "discussion", label: "En discussion" }, { key: "appel", label: "Appel" }, { key: "client", label: "Client" },
  { key: "non", label: "Pas pour nous" },
];
export const stageLabel = (s: string | null) => LEAD_STATUS.find((l) => l.key === s)?.label ?? "";
export const stageRank = (s: string) => LEAD_STATUS.findIndex((l) => l.key === s);
// En cours : la personne a reçu un message, elle a toujours une suite datée.
export const ACTIVE: LeadStatus[] = ["contacte", "discussion", "appel"];
export const CLOSED: LeadStatus[] = ["client", "non"];

export type NextAction = "ecrire" | "relancer" | "appel";
export const NEXT: { key: NextAction; label: string }[] = [
  { key: "ecrire", label: "Écrire" }, { key: "relancer", label: "Relancer" }, { key: "appel", label: "Appel" },
];
export type Lost = "budget" | "moment" | "profil" | "silence";
export const LOST: { key: Lost; label: string }[] = [
  { key: "budget", label: "Budget" }, { key: "moment", label: "Pas le moment" }, { key: "profil", label: "Pas le profil" }, { key: "silence", label: "Silence" },
];
export type EventKind = "etape" | "dm" | "relance" | "reponse" | "appel" | "note";

// Délais posés par les gestes, en jours. Des propositions à ajuster à l'usage, pas des chiffres mesurés.
export const DELAI = { envoye: 3, relance: 4, plusTard: 60, apresAppel: 3 };
// La suite posée en arrivant dans une étape, comme après le geste qui y mène : [action, dans n jours].
export const SUITE_OF: Partial<Record<LeadStatus, [NextAction, number]>> = {
  qualifie: ["ecrire", 0], contacte: ["relancer", DELAI.envoye], discussion: ["ecrire", 0], appel: ["appel", 1],
};
// Âge dans l'étape au-delà duquel une carte du pipeline passe en gras, en jours.
export const STALE: Partial<Record<LeadStatus, number>> = { contacte: 3, discussion: 5 };

export type Lead = {
  status: LeadStatus; note: string; next_action: NextAction | null; next_action_at: string | null; owner: string | null;
  last_contact_at: string | null; stage_at: string; amount: number | null; lost_reason: Lost | null;
};
const LEAD_COLS = "status, note, next_action, next_action_at, owner, last_contact_at, stage_at, amount, lost_reason";
export type Raw = Lead & {
  user_id: string; email: string; first_name: string; handle: string; avatar_url: string | null; rythme: number; answers: unknown; created_at: string;
  last_active: string | null; active_days_30: number;
  contents_total: number; contents_planned: number; contents_published: number; published_30: number; weeks_held_4: number;
  ig_day: string | null; ig_followers: number | null; ig_followers_before: number | null;
  ig_avg_likes: number | null; ig_avg_comments: number | null; ig_media: number | null; ig_posts: unknown;
};
export type Person = Raw & { c: Score };
export type Team = { user_id: string; first_name: string; email: string };
export type Ev = { id: number; lead_id: string; author: string | null; kind: EventKind; body: string; from_status: string | null; to_status: string | null; at: string };
export type Kpi = Record<string, number>;
export type Funnel = { inscrits: number; qualifies: number; contactes: number; reponses: number; appels: number; clients: number; ca: number; delai_premier_dm_h: number | null };

// Ce que la page offre à la fiche et au pipeline.
export type Gesture = "envoye" | "dm" | "relance" | "reponse" | "appelCale" | "appelFait" | "plusTard";
export type Ops = {
  save: (id: string, patch: Partial<Lead>) => Promise<boolean>;
  stage: (id: string, to: LeadStatus) => void;
  gesture: (p: Person, g: Gesture, o?: { body?: string; date?: string; last?: boolean }) => Promise<boolean>;
  note: (id: string, body: string) => Promise<Ev | null>;
  // « Envoyé » (bouton ou touche E) et « Relancé » : « fin » quand c'était la dernière relance.
  sent: (p: Person, body?: string) => Promise<Sent>;
  relance: (p: Person, body?: string) => Promise<Sent>;
};
export type Sent = false | "ok" | "fin";

// Les relances déjà envoyées depuis le dernier DM ou la dernière réponse (historique du plus récent au plus ancien).
export function relancesOf(events: Ev[]) {
  let n = 0;
  for (const e of events) {
    if (e.kind === "dm" || e.kind === "reponse") break;
    if (e.kind === "relance") n++;
  }
  return n;
}

// ---------- dates : jours à l'heure locale (AAAA-MM-JJ)
export const today = () => new Date().toLocaleDateString("sv-SE");
export const inDays = (n: number) => { const d = new Date(); d.setDate(d.getDate() + n); return d.toLocaleDateString("sv-SE"); };
const dayOf = (s: string) => (s.length === 10 ? s : new Date(s).toLocaleDateString("sv-SE"));
export const daysUntil = (s: string) => Math.round((Date.parse(dayOf(s)) - Date.parse(today())) / 864e5);
export const ageDays = (s: string | null) => (s ? -daysUntil(s) : Infinity);
export function ago(s: string | null) {
  if (!s) return "jamais";
  const d = ageDays(s);
  return d <= 0 ? "aujourd'hui" : d === 1 ? "hier" : `il y a ${d} j`;
}
export function when(s: string) {
  const d = new Date(s);
  return ageDays(s) <= 0 ? d.toLocaleTimeString("fr-CH", { hour: "2-digit", minute: "2-digit" }) : d.toLocaleDateString("fr-CH", { day: "numeric", month: "short" });
}
export const num = (n: number | null | undefined) => (n == null ? "–" : Math.round(n).toLocaleString("fr-CH"));
export const name = (p: Raw) => p.first_name || p.email;
// Un pseudo Instagram utilisable dans un lien, sinon rien.
export const igHandle = (h: string) => (/^[a-z0-9._]{1,30}$/i.test(h) ? h : "");

// ---------- suite
export function suite(p: Lead): { text: string; late: boolean } | null {
  if (CLOSED.includes(p.status)) return null;
  if (!p.next_action_at) return ACTIVE.includes(p.status) ? { text: "Sans suite", late: true } : null;
  const d = daysUntil(p.next_action_at);
  const at = d === 0 ? "aujourd'hui" : d === 1 ? "demain" : d > 1 ? `dans ${d} j` : `${-d} j`;
  return { text: `${NEXT.find((n) => n.key === p.next_action)?.label ?? "Écrire"} · ${at}`, late: d < 0 };
}

// À faire aujourd'hui : suite échue, en cours sans suite, ou nouvel inscrit chaud à trier.
export function due(p: Person) {
  if (CLOSED.includes(p.status)) return false;
  if (p.next_action_at) return daysUntil(p.next_action_at) <= 0;
  if (ACTIVE.includes(p.status)) return true;
  return p.status === "verifier" && p.c.temp === "chaud" && ageDays(p.created_at) < 7;
}

// ---------- vues rapides
export type View = "aujourdhui" | "trier" | "cours" | "clients" | "tous";
export const VIEWS: { key: View; label: string; empty: string }[] = [
  { key: "aujourdhui", label: "Aujourd'hui", empty: "Rien à faire." },
  { key: "trier", label: "À trier", empty: "Personne ici." },
  { key: "cours", label: "En cours", empty: "Personne ici." },
  { key: "clients", label: "Clients", empty: "Personne ici." },
  { key: "tous", label: "Tous", empty: "Personne ici." },
];
export function inView(p: Person, v: View) {
  if (v === "aujourdhui") return due(p);
  if (v === "trier") return p.status === "verifier";
  if (v === "cours") return ACTIVE.includes(p.status);
  if (v === "clients") return p.status === "client";
  return true;
}

// ---------- tris
type Cmp = (a: Person, b: Person) => number;
const str = (a: string | null, b: string | null) => (a ?? "").localeCompare(b ?? "", "fr");
const later = (a: string | null, b: string | null) => (a ?? "9999").localeCompare(b ?? "9999");
const byScore: Cmp = (a, b) => b.c.score - a.c.score;
const todoDay = (p: Person) => p.next_action_at ?? dayOf(ACTIVE.includes(p.status) ? p.stage_at : p.created_at);

export function viewSort(v: View): Cmp {
  if (v === "aujourdhui") return (a, b) => todoDay(a).localeCompare(todoDay(b)) || byScore(a, b);
  if (v === "trier") return byScore;
  if (v === "cours") return (a, b) => stageRank(b.status) - stageRank(a.status) || later(a.next_action_at, b.next_action_at);
  if (v === "clients") return (a, b) => b.stage_at.localeCompare(a.stage_at);
  return (a, b) => b.created_at.localeCompare(a.created_at);
}

export type SortKey = "personne" | "score" | "objectif" | "investi" | "abonnes" | "semper" | "etape" | "suite" | "qui";
// Premier clic : les chiffres du plus grand au plus petit, le texte de A à Z.
export const DESC_FIRST: SortKey[] = ["score", "investi", "abonnes", "semper"];
export function columnSort(k: SortKey, desc: boolean, team: Team[]): Cmp {
  const who = (id: string | null) => team.find((t) => t.user_id === id)?.first_name ?? null;
  const asc: Record<SortKey, Cmp> = {
    personne: (a, b) => str(name(a), name(b)),
    score: (a, b) => a.c.score - b.c.score,
    objectif: (a, b) => str(a.c.goal || null, b.c.goal || null),
    investi: (a, b) => a.c.investPts - b.c.investPts,
    abonnes: (a, b) => (a.c.followers ?? -1) - (b.c.followers ?? -1),
    semper: (a, b) => str(a.last_active, b.last_active),
    etape: (a, b) => stageRank(a.status) - stageRank(b.status),
    suite: (a, b) => later(a.next_action_at, b.next_action_at),
    qui: (a, b) => str(who(a.owner), who(b.owner)),
  };
  return desc ? (a, b) => asc[k](b, a) : asc[k];
}

// ---------- écritures : chacune vérifie qu'une ligne a bougé, sinon elle rend null (droits, session, réseau)
export async function loadPeople(): Promise<Raw[]> {
  const all: Raw[] = [];
  for (let i = 0; ; i += 1000) {
    const { data, error } = await sb().rpc("admin_people").range(i, i + 999);
    if (error) throw error;
    all.push(...((data ?? []) as Raw[]));
    if ((data?.length ?? 0) < 1000) return all;
  }
}
export async function writeLead(id: string, patch: Partial<Lead>): Promise<Lead | null> {
  const { data, error } = await sb().from("leads").upsert({ user_id: id, ...patch }, { onConflict: "user_id" }).select(LEAD_COLS);
  return error || !data?.length ? null : (data[0] as unknown as Lead);
}
export async function addEvent(id: string, kind: EventKind, body = ""): Promise<Ev | null> {
  const { data, error } = await sb().from("lead_events").insert({ lead_id: id, kind, body: body.slice(0, 4000) }).select("*");
  return error || !data?.length ? null : (data[0] as Ev);
}
export async function readEvents(id: string): Promise<Ev[] | null> {
  const { data, error } = await sb().from("lead_events").select("*").eq("lead_id", id)
    .order("at", { ascending: false }).order("id", { ascending: false }).limit(200);
  return error ? null : (data as Ev[]);
}

// Les notes vivent dans l'historique : toutes, de la plus récente à la plus ancienne, par personne.
async function readNotes(): Promise<Map<string, string[]> | null> {
  const notes = new Map<string, string[]>();
  for (let i = 0; ; i += 1000) {
    const { data, error } = await sb().from("lead_events").select("lead_id, body").eq("kind", "note")
      .order("at", { ascending: false }).order("id", { ascending: false }).range(i, i + 999);
    if (error) return null;
    for (const e of data as { lead_id: string; body: string }[]) notes.set(e.lead_id, [...(notes.get(e.lead_id) ?? []), e.body]);
    if (data.length < 1000) return notes;
  }
}

// ---------- export CSV de ce qui est affiché (même format que l'export des contenus)
// Prénom et pseudo sont saisis par l'inscrit : une cellule qui commence comme une formule est neutralisée.
const cell = (v: unknown) => { let s = String(v ?? ""); if (/^[=+\-@\t\r]/.test(s)) s = "'" + s; return `"${s.replace(/"/g, '""')}"`; };
export async function exportCsv(list: Person[], team: Team[]) {
  const notes = await readNotes();
  if (!notes) return false;
  const who = (id: string | null) => team.find((t) => t.user_id === id)?.first_name ?? "";
  const head = ["Prénom", "E-mail", "Instagram", "Inscrit le", "Étape", "Depuis le", "Suite", "Date suite", "Responsable", "Score", "Température",
    "Objectif", "A investi", "Bloqué par", "Crée pour", "Publie", "Abonnés déclarés", "Abonnés Instagram", "Source", "Attend de Semper",
    "Rythme visé", "Contenus", "Publiés", "Dernière visite", "Jours actifs 30 j", "Dernier contact", "Montant", "Raison", "Note"];
  const rows = list.map((p) => [
    p.first_name, p.email, p.handle, dayOf(p.created_at), stageLabel(p.status), dayOf(p.stage_at),
    NEXT.find((n) => n.key === p.next_action)?.label ?? "", p.next_action_at ?? "", who(p.owner), p.c.score,
    TEMPS.find((t) => t.key === p.c.temp)?.label, answer(p.answers, "objectif"), answer(p.answers, "investi"), answer(p.answers, "blocage"),
    answer(p.answers, "pourquoi"), answer(p.answers, "frequence"), answer(p.answers, "abonnes"), p.ig_followers ?? "", answer(p.answers, "source"),
    answer(p.answers, "usage"), p.rythme, p.contents_total, p.contents_published, p.last_active ?? "", p.active_days_30,
    p.last_contact_at ? dayOf(p.last_contact_at) : "", p.amount ?? "", LOST.find((l) => l.key === p.lost_reason)?.label ?? "",
    [p.note, ...(notes.get(p.user_id) ?? [])].filter(Boolean).join("\n"),
  ]);
  const csv = "\uFEFF" + [head, ...rows].map((r) => r.map(cell).join(";")).join("\r\n");
  const a = Object.assign(document.createElement("a"), { href: URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" })), download: `semper-inscrits-${today()}.csv` });
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  return true;
}
