"use client";

import { useSyncExternalStore } from "react";
import { isAuthRetryableFetchError } from "@supabase/supabase-js";
import { DEF_STEPS, FIELDS, SEP, STRUCTURES, movePublish, stamp, statusOf, statuses, uid, type StepDef } from "./rules";
import { sb } from "../supabase";
import { constance } from "./stats";
import { gameOf, gesture, settle, today, type Event, type Game, type IgLink, type IgPost, type Lit } from "./jour";

// Les données de l'espace, chargées depuis Supabase à la connexion et gardées en mémoire.
// L'interface lit et modifie la copie en mémoire ; chaque action l'écrit aussi dans Supabase.
// Plusieurs appareils : la base est relue au retour sur l'onglet, et une écriture ne passe que si la ligne
// n'a pas bougé depuis la dernière lecture. Sinon on reprend la version de la base et on y repose
// seulement ce qui a changé ici.

export type StepKey = string; // une clé d'étape : « ecriture », « tournage », « montage » ou une étape ajoutée
// Les règles (statuts, étapes à rebours) vivent dans rules.ts : le serveur s'en sert aussi (connecteur Claude).
export { SEP, STEPS, STATUS, DEF_STEPS, live, stepIn, statuses, statusOf, withStatus, placeSteps, movePublish, stamp, structure, uid, type Status, type StepDef } from "./rules";

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
  steps: Record<string, { at: string | null; done: boolean }>;
  values: Record<string, Value>;
  script?: { structureId: string | null; parts: Record<string, string> };
  createdAt: string;
  igPost?: IgPost | null; // la publication Instagram reliée, posée par le serveur seulement
};

export type Profile = {
  firstName: string; handle: string; email: string; rythme: number; steps: StepDef[];
  answers: Record<string, Value>; // réponses du premier passage (qualification)
  lockUntil: string | null; // rythme bloqué jusqu'à cette date (AAAA-MM-JJ), choisi par la personne
  avatar: string | null; // adresse publique de la photo de profil
  createdAt: string;
};

export type Data = { v: 1; profile: Profile; fields: Field[]; structures: Structure[]; contents: Content[]; game: Game; ig: IgLink | null };




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
  createdAt: r.created_at as string, igPost: (r.ig_post ?? null) as IgPost | null,
});
const igOf = (r: Row | null | undefined): IgLink | null => (r ? {
  handle: r.handle as string, code: r.code as string, verified: !!r.verified_at, syncedAt: (r.synced_at as string | null) ?? null, posts: (r.posts ?? []) as IgPost[],
} : null);
const profileOf = (r: Row): Profile => ({
  firstName: r.first_name as string, handle: r.handle as string, email: r.email as string, rythme: r.rythme as number,
  steps: (r.steps as StepDef[] | null) ?? DEF_STEPS(r.durations as Record<string, number> | null), answers: r.answers as Profile["answers"], lockUntil: r.rythme_locked_until as string | null,
  avatar: (r.avatar_url as string | null) ?? null, createdAt: r.created_at as string,
});

// Les colonnes d'un contenu. On compare deux versions sans tenir compte de l'ordre des clés (jsonb le change).
const COLS = { title: "title", publishAt: "publish_at", publishedAt: "published_at", steps: "steps", values: "field_values", script: "script" } as const;
type Key = keyof typeof COLS;
const KEYS = Object.keys(COLS) as Key[];
const norm = (v: unknown): unknown =>
  Array.isArray(v) ? v.map(norm)
  : v && typeof v === "object" ? Object.fromEntries(Object.keys(v).filter((k) => (v as Row)[k] !== undefined).sort().map((k) => [k, norm((v as Row)[k])]))
  : v ?? null;
const same = (a: unknown, b: unknown) => JSON.stringify(norm(a)) === JSON.stringify(norm(b));
// Ce qui a changé ici depuis la version connue de la base (tout, pour un contenu jamais envoyé).
const changed = (c: Content, b?: Content) => KEYS.filter((k) => !b || !same(c[k], b[k]));

// La dernière version connue de la base, pour chaque contenu, avec son updated_at.
const base = new Map<string, { c: Content; at: string }>();
const known = (r: Row) => { const c = fromRow(r); base.set(c.id, { c, at: r.updated_at as string }); return c; };

// Un contenu créé à l'instant et encore vierge n'est écrit nulle part : fermé tel quel, il disparaît.
const fresh = new Set<string>();
export const blank = (c: Content) =>
  !c.title.trim() && !c.publishedAt && !Object.values(c.steps).some((s) => s?.done)
  && !Object.values(c.values).some((v) => (Array.isArray(v) ? v.length : v))
  && !Object.values(c.script?.parts ?? {}).some((t) => t.trim());

// Charge l'espace de la personne connectée. « none » : pas de session, direction la connexion.
// « offline » : pas de réseau. « error » : la base répond mal (5xx, 429). Dans ces deux cas la session reste.
export type Load = "ok" | "none" | "offline" | "error";
let loadedAt = 0;
let loading: Promise<Load> | null = null;
// Un seul chargement à la fois : deux chargements croisés s'écraseraient (et perdraient la copie de secours).
export function load() {
  return (loading ??= first().finally(() => { loading = null; }));
}
// La démo de la vitrine : le vrai espace, des données fictives en mémoire, aucune écriture (voir demo.ts).
let demo = false;
export function loadDemo(d: Data) {
  demo = true;
  data = d;
  emit();
}
async function first(): Promise<Load> {
  const s = sb();
  const { data: { session }, error } = await s.auth.getSession();
  if (!session) return isAuthRetryableFetchError(error) ? (error.status ? "error" : "offline") : "none";
  me = session.user.id;
  token = session.access_token;
  exp = session.expires_at ?? 0;
  watch();
  const [p, c, ig] = await Promise.all([
    s.from("profiles").select("*").eq("id", me).single(),
    s.from("contents").select("*").eq("user_id", me),
    s.from("ig_links").select("*").eq("user_id", me).maybeSingle(),
  ]);
  if (!p.data || !c.data) {
    const st = [p.status, c.status];
    if (st.includes(0)) return "offline";
    // Session refusée ou compte disparu : on l'oublie ici, sinon la connexion renverrait aussitôt vers l'outil.
    if (st.includes(401) || st.includes(403) || p.error?.code === "PGRST116") {
      await dropSession();
      return "none";
    }
    return "error";
  }
  const r = p.data;
  base.clear();
  data = {
    v: 1,
    profile: profileOf(r),
    fields: r.fields ?? FIELDS(),
    structures: r.structures ?? STRUCTURES(),
    contents: c.data.map(known),
    game: gameOf(r.engagement),
    ig: igOf(ig.data),
  };
  loadedAt = Date.now();
  unstash(c.data);
  if (!needsSync()) tick(); // sinon la coque relève Instagram d'abord, puis clôt les jours
  emit();
  save(s.from("profiles").update({ seen_at: new Date().toISOString(), fields: data.fields, structures: data.structures }).eq("id", me));
  seen();
  return "ok";
}
// Un jour d'activité, à la date locale : c'est ce qui mesure qui revient (une fois par jour et par onglet).
let seenDay = "";
function seen() {
  const day = new Date().toLocaleDateString("sv-SE");
  if (day === seenDay) return;
  seenDay = day;
  save(sb().from("activity").upsert({ day }, { onConflict: "user_id,day", ignoreDuplicates: true }));
}

// Retour sur l'onglet : on relit la base. Ce qui attend d'être écrit ici garde sa version locale.
// Si une écriture aboutit pendant la lecture, la lecture est peut-être déjà dépassée : on l'ignore.
let refreshing = false;
let wrote = 0;
async function refresh() {
  if (!data || !me || leaving || refreshing || Date.now() - loadedAt < 4000) return;
  refreshing = true;
  const n = wrote;
  try {
    const s = sb();
    const [p, c, ig] = await Promise.all([
      s.from("profiles").select("*").eq("id", me).single(),
      s.from("contents").select("*").eq("user_id", me),
      s.from("ig_links").select("*").eq("user_id", me).maybeSingle(),
    ]);
    if (!p.data || !c.data || !data || wrote !== n) return;
    loadedAt = Date.now();
    const srv = new Map(c.data.map((r) => [r.id as string, r as Row]));
    const busy = (x: Content) => pending.has(x.id) || flying.has(x.id) || retry.has(x.id) || changed(x, base.get(x.id)?.c).length > 0;
    const out: Content[] = [];
    for (const x of data.contents) {
      const r = srv.get(x.id);
      if (busy(x)) out.push(x);
      else if (r) out.push(known(r));
      else base.delete(x.id); // supprimé sur un autre appareil
    }
    srv.forEach((r, id) => { if (!out.some((x) => x.id === id) && !drops.has(id) && !retry.has(id)) out.push(known(r)); });
    const still = !Object.keys(profileCols).length && !profileBusy;
    const r = p.data;
    data = still
      ? { ...data, contents: out, profile: { ...profileOf(r), email: r.email ?? data.profile.email }, fields: r.fields ?? data.fields, structures: r.structures ?? data.structures, game: r.engagement ? gameOf(r.engagement) : data.game, ig: igOf(ig.data) }
      : { ...data, contents: out, ig: igOf(ig.data) };
    tick();
    emit();
    seen();
  } finally {
    refreshing = false;
  }
}

// ---------- écritures
// En REST direct : le même chemin sert à la fermeture de l'onglet (keepalive), où le client Supabase
// n'a plus le temps de relire sa session avant d'envoyer.
const API = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/`;
const KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "";
let token = ""; // jeton de la session en cours, tenu à jour par watch()
let exp = 0; // son expiration, en secondes
type Res = { status: number; rows: Row[]; code?: string };
async function rest(method: string, path: string, body?: unknown, beacon = false): Promise<Res> {
  const t = beacon ? token : (await sb().auth.getSession()).data.session?.access_token ?? "";
  // Plus de session : rien ne part en anonyme. En keepalive, un jeton expiré pendant que l'onglet dormait
  // ne part pas non plus : l'écriture repartira au retour, avec un jeton neuf.
  if (!t || (beacon && exp && exp * 1000 < Date.now() + 10000)) return { status: 401, rows: [] };
  const b = body === undefined ? undefined : JSON.stringify(body);
  const r = await fetch(API + path, {
    method, keepalive: beacon && (b?.length ?? 0) < 60000, // keepalive refuse les corps de plus de 64 Ko
    headers: { apikey: KEY, Authorization: `Bearer ${t}`, "Content-Type": "application/json", Prefer: "return=representation" },
    body: b,
  });
  off = false; // une réponse est arrivée : le réseau est là, la prochaine coupure s'annoncera
  const j = await r.json().catch(() => null);
  return { status: r.status, rows: r.ok && Array.isArray(j) ? j : [], code: j?.code };
}

// Une écriture refusée est toujours signalée. Session perdue (jeton refusé, compte supprimé) : voir lost().
// En keepalive, un jeton refusé n'est pas une session perdue : le jeton gardé a seulement pu expirer.
function failed(r: Res, beacon = false) {
  if (r.status < 300) return false;
  if (beacon && r.status === 401) return true;
  if (r.status === 401 || r.code === "23503" || r.code === "PGRST301" || r.code === "PGRST303") lost();
  else if (again(r, beacon)) announce("Pas encore enregistré. Ça repart tout seul.");
  else announce("Pas enregistré. Réessaie.");
  return true;
}
// À renvoyer plus tard : serveur débordé ou en panne, ou jeton expiré en keepalive.
const again = (r: Res, beacon: boolean) => r.status === 408 || r.status === 429 || r.status >= 500 || (beacon && r.status === 401);
// Pour les écritures qui passent encore par le client Supabase (activité, dernière visite).
function save(q: PromiseLike<{ error: { code?: string } | null; status: number }>) {
  q.then(({ error, status }) => {
    if (!error) return;
    console.error(error);
    if (status === 0) offline();
    else failed({ status, rows: [], code: error.code });
  });
}

// Plus de réseau, ou erreur passagère : ce qui n'est pas parti attend ici, et repart au retour du réseau
// ou sur l'onglet (le réseau a pu revenir sans que le navigateur le signale).
const retry = new Set<string>();
let off = false;
function offline() {
  if (off) return;
  off = true;
  announce("Hors ligne. Ça partira au retour du réseau.");
}
function resend() {
  off = false;
  if (leaving || !me) return;
  flushProfile();
  [...retry].forEach((id) => {
    if (flying.has(id) || pending.has(id)) return;
    void (data?.contents.some((x) => x.id === id) ? send(id) : drop(id));
  });
}

// La frappe est regroupée : une écriture par demi-seconde et par contenu, avec seulement ce qui a changé.
const pending = new Map<string, ReturnType<typeof setTimeout>>();
const flying = new Set<string>(); // écritures parties, réponse pas encore reçue
const strikes = new Map<string, number>(); // conflits d'affilée sur un contenu
function push(id: string) {
  if (demo) return;
  clearTimeout(pending.get(id));
  pending.set(id, setTimeout(() => send(id), 500));
}
async function send(id: string, beacon = false) {
  clearTimeout(pending.get(id));
  pending.delete(id);
  if (flying.has(id)) return push(id);
  const c = data?.contents.find((x) => x.id === id);
  const b = base.get(id);
  if (!c || (!b && fresh.has(id) && blank(c))) return;
  const keys = changed(c, b?.c);
  if (!keys.length) return;
  const row: Row = { updated_at: new Date().toISOString() };
  keys.forEach((k) => { row[COLS[k]] = c[k] ?? null; });
  flying.add(id);
  retry.delete(id);
  try {
    const r = b
      ? await rest("PATCH", `contents?id=eq.${id}&updated_at=eq.${encodeURIComponent(b.at)}`, row, beacon)
      : await rest("POST", "contents", { ...row, id, user_id: me, created_at: c.createdAt }, beacon);
    if (r.rows[0]) {
      base.set(id, { c, at: r.rows[0].updated_at as string });
      strikes.delete(id);
      wrote++;
      return;
    }
    // La ligne a bougé ailleurs (ou existe déjà) : on part de la version de la base.
    if (r.status < 300 || r.code === "23505") return void (await rebase(id, b?.c));
    failed(r, beacon);
    if (again(r, beacon)) retry.add(id);
  } catch {
    retry.add(id);
    offline();
  } finally {
    flying.delete(id);
    // Supprimé ici pendant l'envoi : la ligne part aussi de la base.
    if (data && base.has(id) && !data.contents.some((x) => x.id === id) && !drops.has(id)) drop(id);
  }
}
async function rebase(id: string, old?: Content) {
  const n = (strikes.get(id) ?? 0) + 1;
  strikes.set(id, n);
  if (n > 3) return announce("Pas enregistré. Recharge la page.");
  const { data: r, error, status } = await sb().from("contents").select("*").eq("id", id).maybeSingle();
  if (error) throw new Error(String(status));
  const cur = data?.contents.find((x) => x.id === id);
  if (!r) {
    base.delete(id);
    if (cur) update((d) => ({ ...d, contents: d.contents.filter((x) => x.id !== id) }));
    return;
  }
  const srv = known(r);
  wrote++;
  if (!cur) return;
  const mine = changed(cur, old);
  update((d) => ({ ...d, contents: d.contents.map((x) => (x.id === id ? { ...srv, ...Object.fromEntries(mine.map((k) => [k, cur[k]])) } : x)) }));
  if (mine.length) push(id);
}

// Pareil pour le profil : les changements rapprochés partent en une seule écriture, dans l'ordre.
let profileCols: Row = {};
let profileTimer: ReturnType<typeof setTimeout> | undefined;
let profileBusy = 0;
function pushProfile(cols: Row) {
  if (demo) return;
  profileCols = { ...profileCols, ...cols };
  clearTimeout(profileTimer);
  profileTimer = setTimeout(flushProfile, 400);
}
async function flushProfile(beacon = false) {
  clearTimeout(profileTimer);
  if (!Object.keys(profileCols).length || !me) return;
  const cols = profileCols;
  profileCols = {};
  profileBusy++;
  try {
    const r = await rest("PATCH", `profiles?id=eq.${me}&select=id`, cols, beacon);
    if (failed(r, beacon)) { if (again(r, beacon)) profileCols = { ...cols, ...profileCols }; }
    // Aucune ligne touchée : le compte n'existe plus.
    else if (!r.rows.length) lost();
  } catch {
    profileCols = { ...cols, ...profileCols };
    offline();
  } finally {
    profileBusy--;
  }
}

// ---------- session
// La session ne tient plus (déconnexion ailleurs, compte supprimé, jeton refusé) : ce qui n'est pas
// enregistré reste dans ce navigateur, direction la connexion. Ça repart au prochain chargement.
let leaving = false;
function lost() {
  if (leaving) return;
  leaving = true;
  stash();
  announce("Session expirée. Reconnecte-toi.");
  setTimeout(() => location.replace("/connexion"), 1800);
}
let watching = false;
function watch() {
  if (watching) return;
  watching = true;
  sb().auth.onAuthStateChange((e, s) => {
    token = s?.access_token ?? "";
    exp = s?.expires_at ?? 0;
    if (e === "SIGNED_OUT" && data) lost();
  });
}
// Oublie la session dans ce navigateur sans appeler le serveur, qui répondrait 401 ou 403 pour une session
// déjà morte. On efface d'abord la clé de supabase-js : signOut ne trouve plus de jeton et prévient seulement les autres onglets.
async function dropSession() {
  try { localStorage.removeItem(`sb-${new URL(process.env.NEXT_PUBLIC_SUPABASE_URL!).hostname.split(".")[0]}-auth-token`); } catch {}
  await sb().auth.signOut({ scope: "local" }).catch(() => {});
}

// Ce qui n'a pas pu partir est gardé ici, et repris au prochain chargement si la base n'a pas bougé entre-temps.
const STASH = "semper:unsaved";
type Stash = { me: string; contents: { c: Content; at: string | null }[]; gone: string[] };
function stash() {
  if (!data || !me) return;
  const d = data;
  const contents = d.contents.filter((c) => !(fresh.has(c.id) && blank(c)) && changed(c, base.get(c.id)?.c).length)
    .map((c) => ({ c, at: base.get(c.id)?.at ?? null }));
  const gone = [...drops.keys(), ...[...retry].filter((id) => !d.contents.some((x) => x.id === id))];
  try {
    if (contents.length || gone.length) localStorage.setItem(STASH, JSON.stringify({ me, contents, gone } satisfies Stash));
    else localStorage.removeItem(STASH);
  } catch {}
}
function unstash(rows: Row[]) {
  let s: Stash | null = null;
  try { s = JSON.parse(localStorage.getItem(STASH) ?? "null"); localStorage.removeItem(STASH); } catch {}
  if (!s || s.me !== me || !data) return;
  for (const { c, at } of s.contents) {
    const r = rows.find((x) => x.id === c.id);
    if ((r ? r.updated_at : null) !== at) continue; // la base a une version plus récente : elle l'emporte
    data = { ...data, contents: [...data.contents.filter((x) => x.id !== c.id), c] };
    push(c.id);
  }
  for (const id of s.gone) {
    if (!base.has(id)) continue;
    data = { ...data, contents: data.contents.filter((x) => x.id !== id) };
    drop(id);
  }
}

export async function signOut() {
  if (demo) return announce("Dans la démo, rien n'est enregistré.");
  leaving = true;
  await Promise.allSettled([flushProfile(), ...[...pending.keys()].map((id) => send(id)), ...[...drops.keys()].map((id) => drop(id))]);
  stash();
  // Seulement cet appareil : les autres restent connectés.
  await sb().auth.signOut({ scope: "local" });
  data = null;
  location.href = "/connexion";
}
// Le compte vient d'être supprimé : rien ne repart, rien ne reste dans ce navigateur.
export async function forget() {
  leaving = true;
  pending.forEach(clearTimeout);
  pending.clear();
  drops.forEach(clearTimeout);
  drops.clear();
  retry.clear();
  clearTimeout(profileTimer);
  profileCols = {};
  data = null;
  try { localStorage.removeItem(STASH); } catch {}
  await dropSession(); // le serveur a déjà supprimé le compte
}

if (typeof window !== "undefined") {
  // Onglet caché ou fermé : tout ce qui attend part tout de suite, en keepalive. Une copie reste ici
  // au cas où l'envoi n'aboutit pas (fermeture, plus de réseau).
  const away = () => {
    stash();
    if (leaving || !me) return;
    flushProfile(true);
    new Set([...pending.keys(), ...retry]).forEach((id) => (data?.contents.some((x) => x.id === id) ? send(id, true) : drop(id, true)));
    [...drops.keys()].forEach((id) => drop(id, true));
  };
  // Retour : la copie de secours suit l'état en mémoire (vide si tout est parti). Avant le premier
  // chargement, on n'y touche pas : load() la reprend.
  const back = () => {
    if (leaving || !data) return;
    stash();
    resend();
    refresh();
  };
  window.addEventListener("pagehide", away);
  document.addEventListener("visibilitychange", () => (document.visibilityState === "hidden" ? away() : back()));
  window.addEventListener("focus", back);
  window.addEventListener("online", resend);
}

function update(fn: (d: Data) => Data) {
  if (!data) return;
  data = fn(data);
  emit();
}

// ---------- actions
export function setProfile(p: Partial<Profile>) {
  if (p.rythme !== undefined && data && locked(data.profile)) return;
  update((d) => ({ ...d, profile: { ...d.profile, ...p } }));
  const cols: Row = {};
  if (p.firstName !== undefined) cols.first_name = p.firstName;
  if (p.handle !== undefined) cols.handle = p.handle;
  if (p.rythme !== undefined) cols.rythme = p.rythme;
  if (p.steps !== undefined) cols.steps = p.steps;
  if (p.answers !== undefined) cols.answers = p.answers;
  if (p.lockUntil !== undefined) cols.rythme_locked_until = p.lockUntil;
  if (p.avatar !== undefined) cols.avatar_url = p.avatar;
  if (Object.keys(cols).length) pushProfile(cols);
}
// La photo de profil : recadrée en carré de 256 px, envoyée en WebP sous avatars/<id>/.
export async function setAvatar(file: File | null) {
  if (demo) return announce("Dans la démo, rien n'est enregistré.");
  const bucket = sb().storage.from("avatars");
  if (!file) {
    await bucket.remove([`${me}/avatar.webp`]);
    return setProfile({ avatar: null });
  }
  let img: ImageBitmap;
  try { img = await createImageBitmap(file); } catch { return announce("Cette image ne passe pas. Essaie un JPG ou un PNG."); }
  const side = Math.min(img.width, img.height);
  const canvas = Object.assign(document.createElement("canvas"), { width: 256, height: 256 });
  canvas.getContext("2d")!.drawImage(img, (img.width - side) / 2, (img.height - side) / 2, side, side, 0, 0, 256, 256);
  const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/webp", 0.9));
  if (!blob) return announce("Cette image ne passe pas. Essaie un JPG ou un PNG.");
  const { error } = await bucket.upload(`${me}/avatar.webp`, blob, { upsert: true, contentType: "image/webp" });
  if (error) return announce("Photo pas enregistrée. Réessaie.");
  setProfile({ avatar: `${bucket.getPublicUrl(`${me}/avatar.webp`).data.publicUrl}?v=${Date.now()}` });
}

// L'adresse a changé côté serveur : on met la copie en mémoire à jour, sans réécrire la base.
export function setEmail(email: string) {
  update((d) => ({ ...d, profile: { ...d.profile, email } }));
}

// Toutes les fiches en CSV (séparateur « ; », lisible par Excel et Numbers), scripts et étapes compris.
export function exportCsv() {
  if (!data) return;
  const d = data;
  // Une cellule qui commence par =, +, -, @, une tabulation ou un retour chariot serait lue comme une formule : on la neutralise.
  const cell = (v: unknown) => { let s = String(v ?? ""); if (/^[=+\-@\t\r]/.test(s)) s = "'" + s; return `"${s.replace(/"/g, '""')}"`; };
  const val = (c: Content, f: Field) => picked(c, f).join(", ");
  const at = (s: string | null | undefined) => s?.replace("T", " ");
  // Le script, partie par partie ; les textes d'une structure retirée suivent, sans nom de partie.
  const script = (c: Content) => {
    const parts = c.script?.parts ?? {};
    const st = d.structures.find((s) => s.id === c.script?.structureId);
    const named = (st?.parts ?? []).filter((p) => parts[p.id]?.trim()).map((p) => `${p.label} : ${parts[p.id]}`);
    const rest = Object.entries(parts).filter(([k, v]) => v.trim() && !st?.parts.some((p) => p.id === k)).map(([, v]) => v);
    return [...named, ...rest].join("\n");
  };
  const steps = d.profile.steps, st = statuses(steps);
  const head = ["Titre", "Statut", "Publication", "Publié le", ...steps.map((s) => s.label), ...d.fields.map((f) => f.label), "Script", "Créé le"];
  const rows = d.contents.map((c) => [c.title, st.find((s) => s.key === statusOf(c, steps))?.label, at(c.publishAt), at(c.publishedAt),
    ...steps.map((s) => at(c.steps[s.key]?.at)), ...d.fields.map((f) => val(c, f)), script(c), c.createdAt.slice(0, 10)]);
  const csv = "\uFEFF" + [head, ...rows].map((r) => r.map(cell).join(";")).join("\r\n");
  const a = Object.assign(document.createElement("a"), { href: URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" })), download: `semper-contenus-${new Date().toLocaleDateString("sv-SE")}.csv` });
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
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
  fresh.add(id);
  update((d) => {
    const c: Content = {
      id, title: "", publishAt: null, publishedAt: null, values: {}, createdAt: new Date().toISOString(),
      steps: Object.fromEntries(d.profile.steps.map((s) => [s.key, { at: null, done: false }])),
    };
    return { ...d, contents: [...d.contents, publishAt ? movePublish(c, publishAt, d.profile.steps) : c] };
  });
  push(id);
  return id;
}
export function patchContent(id: string, fn: (c: Content, d: Data) => Content) {
  update((d) => ({ ...d, contents: d.contents.map((c) => (c.id === id ? fn(c, d) : c)) }));
  push(id);
}
// Supprimer laisse 6 secondes pour annuler ; la base n'est touchée qu'ensuite, ou dès que l'onglet
// est caché ou fermé. Une fiche vierge part sans annonce.
const drops = new Map<string, ReturnType<typeof setTimeout>>();
async function drop(id: string, beacon = false) {
  if (demo) return;
  clearTimeout(drops.get(id));
  drops.delete(id);
  if (!base.has(id)) return void retry.delete(id); // jamais écrit dans la base
  try {
    const r = await rest("DELETE", `contents?id=eq.${id}`, undefined, beacon);
    if (!failed(r, beacon)) { base.delete(id); retry.delete(id); wrote++; }
    else if (again(r, beacon)) retry.add(id);
  } catch {
    retry.add(id);
    offline();
  }
}
export function deleteContent(id: string, quiet = false) {
  clearTimeout(pending.get(id));
  pending.delete(id);
  fresh.delete(id);
  const gone = data?.contents.find((c) => c.id === id);
  update((d) => ({ ...d, contents: d.contents.filter((c) => c.id !== id) }));
  if (quiet || !gone) return void drop(id);
  drops.set(id, setTimeout(() => drop(id), 6000));
  announce(`« ${gone.title.trim() || "Sans titre"} » supprimé`, 0, {
    label: "Annuler",
    run: () => {
      clearTimeout(drops.get(id));
      drops.delete(id);
      update((d) => ({ ...d, contents: [...d.contents, gone] }));
      push(id); // ce qui a été tapé juste avant la suppression part aussi
      announce(null);
    },
  });
}

// ---------- la lune
// Instagram relié et pas relevé depuis 30 minutes : un relevé passe avant de clore les jours écoulés.
export const needsSync = () => !!data?.ig?.verified && (!data.ig.syncedAt || Date.now() - Date.parse(data.ig.syncedAt) > 30 * 60000);
// Un nouveau jour (au chargement, au retour sur l'onglet) : les jours écoulés sont clos l'un après l'autre.
// Ce qui s'est passé pendant l'absence est dit une fois.
const SAID: Partial<Record<Event, string>> = {
  joker: "Un joker a protégé ta lune.",
  broken: "Ta lune s'est fissurée. Trois jeux aujourd'hui la réparent.",
  out: "Ta lune s'est éteinte. Un jeu la rallume.",
  restart: "Pas réparée à temps : ta lune repart à 1.",
  "joker+": "Deux semaines tenues : un joker de plus.",
};
export function tick() {
  if (!data) return;
  const d = data;
  const posted = new Set(d.contents.map((c) => c.igPost?.at.slice(0, 10)).filter(Boolean) as string[]);
  const { g, events } = settle(d.game, today(), posted, constance(d).streakTo);
  if (g === d.game) return;
  data = { ...d, game: g };
  pushProfile({ engagement: g });
  const last = [...events].reverse().find((e) => SAID[e]);
  if (last && !demo) setTimeout(() => announce(SAID[last]!), 600);
}
export function setGame(fn: (g: Game) => Game) {
  update((d) => ({ ...d, game: fn(d.game) }));
  if (data) pushProfile({ engagement: data.game });
}
// Un jeu terminé (ou une publication vérifiée aujourd'hui) : renvoie ce qui arrive à la lune.
export function play(id: string): Lit {
  tick();
  if (!data) return null;
  const { g, event } = gesture(data.game, id);
  if (g === data.game) return null;
  update((d) => ({ ...d, game: g }));
  pushProfile({ engagement: g });
  return event;
}

// Ce que le serveur a écrit (publication reliée) : la copie en mémoire suit, sans réécrire la base.
export function applyRows(rows: Row[]) {
  if (!rows.length) return;
  update((d) => {
    const next = rows.map(known);
    return { ...d, contents: [...d.contents.filter((c) => !next.some((x) => x.id === c.id)), ...next] };
  });
  wrote++;
  const day = today();
  if (rows.some((r) => (r.ig_post as IgPost | null)?.at?.slice(0, 10) === day)) play("publication");
}
export function setIg(row: Row | null) {
  update((d) => ({ ...d, ig: igOf(row) }));
}
// Un contenu complet d'un coup (idée ou vidéo écrite par un jeu).
export function addContent(c: Partial<Content> & { title: string }): string {
  const id = uid();
  update((d) => {
    const base: Content = {
      id, title: c.title, publishAt: null, publishedAt: null, values: c.values ?? {}, script: c.script, createdAt: new Date().toISOString(),
      steps: Object.fromEntries(d.profile.steps.map((s) => [s.key, { at: null, done: false }])),
    };
    return { ...d, contents: [...d.contents, c.publishAt ? movePublish(base, c.publishAt, d.profile.steps) : base] };
  });
  push(id);
  return id;
}

// ---------- état d'interface : la fiche ouverte
let openId: string | null = null;
const uiSubs = new Set<() => void>();
export function useOpen() {
  return useSyncExternalStore((f) => { uiSubs.add(f); return () => uiSubs.delete(f); }, () => openId, () => null);
}
export const openedSheet = () => openId;
export function openSheet(id: string | null) {
  openId = id;
  uiSubs.forEach((f) => f());
}
// Fermer la fiche : un contenu créé à l'instant et resté vierge disparaît sans trace.
// Un contenu qui existait n'est jamais supprimé ainsi, même sans titre (il reste « Sans titre »).
export function closeSheet() {
  const id = openId;
  if (id && fresh.has(id)) {
    const c = data?.contents.find((x) => x.id === id);
    if (c && blank(c)) deleteContent(id, true);
    fresh.delete(id);
  }
  openSheet(null);
}

// ---------- une annonce brève (semaine tenue, nouveau titre)
export type NoteAction = { label: string; run: () => void };
let note: { text: string; streak: number; at: number; action?: NoteAction } | null = null;
const noteSubs = new Set<() => void>();
export function useNote() {
  return useSyncExternalStore((f) => { noteSubs.add(f); return () => noteSubs.delete(f); }, () => note, () => null);
}
export function announce(text: string | null, streak = 0, action?: NoteAction) {
  note = text ? { text, streak, at: Date.now(), action } : null;
  noteSubs.forEach((f) => f());
}
