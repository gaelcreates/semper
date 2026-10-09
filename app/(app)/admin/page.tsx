"use client";

import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from "react";
import "./crm.css";
import { announce, useData } from "../store";
import { useNarrow } from "../ui";
import { sb } from "../../supabase";
import { BLANK, TEMPS, answer, classify, type Temp } from "./score";
import Fiche, { Face, Mark, type FicheApi } from "./Fiche";
import Pipeline from "./Pipeline";
import {
  CLOSED, DELAI, DESC_FIRST, LEAD_STATUS, LOST, SUITE_OF, VIEWS, addEvent, ago, columnSort, due, exportCsv, inDays, inView, loadPeople, name, num,
  readEvents, relancesOf, stageLabel, stageRank, suite, today, viewSort, writeLead,
  type EventKind, type Funnel, type Gesture, type Kpi, type Lead, type LeadStatus, type Lost, type Ops, type Person, type Raw, type Sent, type SortKey, type Team, type View,
} from "./model";

// Le CRM : les inscrits gratuits, classés, et ce qu'il faut faire aujourd'hui pour les amener vers l'accompagnement.
// Réservé aux comptes de la table admins ; Supabase le garantit (is_admin), pas seulement cette page.
// Vue, mode, filtres, tri et fiche ouverte vivent dans l'adresse : recharger garde l'état, un lien ouvre une fiche.

type Ui = {
  vue: View | null; mode: "liste" | "pipeline"; p: string | null; q: string; t: Temp | ""; r: string;
  tri: SortKey | ""; sens: "asc" | "desc"; periode: "30" | "90" | "tout";
};
const COLS: { key: SortKey; label: string; cls: string }[] = [
  { key: "personne", label: "Personne", cls: "who" }, { key: "score", label: "Score", cls: "sc" }, { key: "objectif", label: "Objectif", cls: "goal" },
  { key: "investi", label: "Investi", cls: "inv" }, { key: "abonnes", label: "Abonnés", cls: "fol" }, { key: "semper", label: "Semper", cls: "sem" },
  { key: "etape", label: "Étape", cls: "stage" }, { key: "suite", label: "Suite", cls: "next" }, { key: "qui", label: "Qui", cls: "qui" },
];
const STEPS: [keyof Funnel, string][] = [
  ["inscrits", "Inscrits"], ["qualifies", "À contacter"], ["contactes", "Contactés"], ["reponses", "Réponses"], ["appels", "Appels"], ["clients", "Clients"],
];
const PERIODS: [Ui["periode"], string][] = [["30", "30 j"], ["90", "90 j"], ["tout", "Tout"]];
const KEYS: [string, string][] = [
  ["J  K", "Suivant, précédent"], ["Entrée", "Ouvrir"], ["Échap", "Fermer"], ["/", "Rechercher"], ["1 à 7", "Étape"],
  ["D", "Écrire en DM"], ["E", "Envoyé"], ["R", "A répondu"], ["S", "Suite"], ["V", "Liste, pipeline"], ["?", "Raccourcis"],
];
const EVENT: Partial<Record<Gesture, EventKind>> = { envoye: "dm", dm: "dm", relance: "relance", reponse: "reponse", appelFait: "appel" };
const LEAD_KEYS: (keyof Lead)[] = ["status", "note", "next_action", "next_action_at", "owner", "last_contact_at", "stage_at", "amount", "lost_reason"];
// Pas encore contacté : « Envoyé » est le premier DM.
const EARLY: LeadStatus[] = ["verifier", "qualifie", "non"];
// La ligne (ou la carte du pipeline) qui contient un élément.
const rowOf = (el: EventTarget | null) => (el instanceof HTMLElement ? el.closest<HTMLElement>("[data-row]")?.dataset.row ?? null : null);
const plural = (n: number, w: string) => `${n} ${w}${n > 1 ? "s" : ""}`;
const pct = (a?: number | null, b?: number | null) => (b ? `${Math.round((100 * Number(a ?? 0)) / b)} %` : "–");

function fromUrl(): Ui {
  const u = new URLSearchParams(typeof window === "undefined" ? "" : window.location.search);
  const one = <T extends string>(k: string, ok: readonly T[], d: T): T => (ok.includes(u.get(k) as T) ? (u.get(k) as T) : d);
  return {
    vue: one<View | "">("vue", ["", ...VIEWS.map((v) => v.key)], "") || null,
    mode: one("mode", ["liste", "pipeline"] as const, "liste"),
    p: u.get("p"),
    q: u.get("q") ?? "",
    t: one<Temp | "">("t", ["", ...TEMPS.map((t) => t.key)], ""),
    r: u.get("r") ?? "",
    tri: one<SortKey | "">("tri", ["", ...COLS.map((c) => c.key)], ""),
    sens: one("sens", ["asc", "desc"] as const, "asc"),
    periode: one("periode", ["30", "90", "tout"] as const, "tout"),
  };
}

// Une ligne illisible (réponses écrites à la main par l'API, par exemple) reçoit un score neutre au lieu de tout arrêter.
function person(r: Raw): Person {
  try {
    return { ...r, c: classify(r) };
  } catch (e) {
    console.error("CRM : ligne illisible", r.user_id, e);
    return { ...r, c: BLANK };
  }
}

export default function Admin() {
  const self = useData()?.profile;
  const narrow = useNarrow(760);
  const [st, setSt] = useState<"wait" | "denied" | "error" | "ok">("wait");
  const [people, setPeople] = useState<Person[]>([]);
  const [team, setTeam] = useState<Team[]>([]);
  const [uid, setUid] = useState("");
  const [kpi, setKpi] = useState<Kpi | null>(null);
  const [funnel, setFunnel] = useState<Funnel | null>(null);
  const [tick, setTick] = useState(0);
  const [rev, setRev] = useState(0);
  const [ui, setUi] = useState<Ui>(fromUrl);
  const [cur, setCur] = useState<string | null>(null);
  const [ask, setAsk] = useState<{ id: string; kind: "client" | "non" } | null>(null);
  const [help, setHelp] = useState(false);
  const search = useRef<HTMLInputElement>(null);
  const fiche = useRef<FicheApi>(null);
  const later = useRef<"d" | "s" | "fin" | null>(null);
  const last = useRef(0);
  const live = useRef({ people, uid });
  useEffect(() => { live.current = { people, uid }; });
  const set = useCallback((patch: Partial<Ui>) => setUi((u) => ({ ...u, ...patch })), []);

  // ---------- données
  const load = useCallback(async () => {
    try {
      const s = sb();
      const [raw, tm, k] = await Promise.all([loadPeople(), s.rpc("admin_team"), s.rpc("admin_kpis")]);
      if (tm.error) throw tm.error;
      setPeople(raw.map(person));
      setTeam((tm.data ?? []) as Team[]);
      setKpi((k.data ?? null) as Kpi | null);
      setTick((t) => t + 1);
      return true;
    } catch (e) {
      console.error(e);
      return false;
    }
  }, []);
  const start = useCallback(async () => {
    setSt("wait");
    try {
      const s = sb();
      const { data: { session } } = await s.auth.getSession();
      setUid(session?.user.id ?? "");
      const { data: ok, error } = await s.rpc("is_admin");
      if (error) return setSt("error");
      if (!ok) return setSt("denied");
      setSt((await load()) ? "ok" : "error");
    } catch (e) {
      console.error(e);
      setSt("error");
    }
  }, [load]);
  useEffect(() => { void start(); }, [start]);

  // La vue d'ouverture : Aujourd'hui s'il y a quelque chose à faire, sinon À trier.
  useEffect(() => {
    if (st === "ok" && !ui.vue) set({ vue: live.current.people.some(due) ? "aujourdhui" : "trier" });
  }, [st, ui.vue, set]);

  // À plusieurs (Gael et Lou) : rechargement au retour sur l'onglet et toutes les 60 s quand il est visible.
  useEffect(() => {
    if (st !== "ok") return;
    const again = () => { if (document.visibilityState === "visible") void load(); };
    const t = setInterval(again, 60_000);
    document.addEventListener("visibilitychange", again);
    return () => { clearInterval(t); document.removeEventListener("visibilitychange", again); };
  }, [st, load]);

  useEffect(() => {
    if (st !== "ok") return;
    const since = ui.periode === "tout" ? null : new Date(Date.now() - Number(ui.periode) * 864e5).toISOString();
    let on = true;
    sb().rpc("admin_funnel", { since }).then(({ data }) => { if (on) setFunnel((data ?? null) as Funnel | null); });
    return () => { on = false; };
  }, [st, ui.periode, tick, rev]);

  useEffect(() => {
    if (st !== "ok") return;
    const u = new URLSearchParams();
    if (ui.vue) u.set("vue", ui.vue);
    u.set("mode", ui.mode);
    if (ui.p) u.set("p", ui.p);
    if (ui.q) u.set("q", ui.q);
    if (ui.t) u.set("t", ui.t);
    if (ui.r) u.set("r", ui.r);
    if (ui.tri) { u.set("tri", ui.tri); u.set("sens", ui.sens); }
    if (ui.periode !== "tout") u.set("periode", ui.periode);
    window.history.replaceState(null, "", `?${u}`);
  }, [ui, st]);

  // ---------- écritures : l'écran change tout de suite, et revient en arrière si la base n'a rien gardé
  const save = useCallback(async (id: string, patch: Partial<Lead>) => {
    const before = live.current.people.find((p) => p.user_id === id);
    if (!before) return false;
    const merge = (x: Partial<Lead>) => setPeople((ps) => ps.map((p) => (p.user_id === id ? { ...p, ...x } : p)));
    merge(patch);
    const row = await writeLead(id, patch);
    if (!row) {
      merge(Object.fromEntries(LEAD_KEYS.map((k) => [k, before[k]])) as Partial<Lead>);
      announce("Pas enregistré. Recharge la page.");
      return false;
    }
    merge(row);
    if ("status" in patch || "amount" in patch) setRev((r) => r + 1);
    return true;
  }, []);

  const stage = useCallback((id: string, to: LeadStatus) => {
    const p = live.current.people.find((x) => x.user_id === id);
    if (!p || p.status === to) return;
    if (to === "client" || to === "non") return setAsk({ id, kind: to });
    const patch: Partial<Lead> = { status: to };
    if (CLOSED.includes(p.status)) Object.assign(patch, { amount: null, lost_reason: null });
    // Chaque étape arrive avec sa suite, comme après le geste qui y mène (Contacté : relancer dans 3 j).
    // Une suite du même genre déjà posée garde sa date.
    const n = SUITE_OF[to];
    Object.assign(patch, n
      ? { next_action: n[0], next_action_at: p.next_action === n[0] && p.next_action_at ? p.next_action_at : inDays(n[1]) }
      : { next_action: null, next_action_at: null });
    if (stageRank(to) >= 2 && !p.owner && live.current.uid) patch.owner = live.current.uid;
    void save(id, patch);
  }, [save]);

  const gesture = useCallback(async (p: Person, g: Gesture, o: { body?: string; date?: string; last?: boolean } = {}) => {
    const kind = EVENT[g];
    if (kind && !(await addEvent(p.user_id, kind, o.body ?? ""))) {
      announce("Pas enregistré. Recharge la page.");
      return false;
    }
    const early = EARLY.includes(p.status);
    const patch: Partial<Lead> = {};
    if (g === "envoye") Object.assign(patch, early ? { status: "contacte", lost_reason: null } : {}, { next_action: "relancer", next_action_at: inDays(DELAI.envoye) });
    if (g === "dm" && p.status === "discussion") Object.assign(patch, { next_action: "relancer", next_action_at: inDays(DELAI.envoye) });
    if (g === "relance") Object.assign(patch, o.last ? { next_action: null, next_action_at: null } : { next_action: "relancer", next_action_at: inDays(DELAI.relance) });
    if (g === "reponse") Object.assign(patch, early || p.status === "contacte" ? { status: "discussion", lost_reason: null } : {}, { next_action: "ecrire", next_action_at: today() });
    if (g === "appelCale") Object.assign(patch, { status: "appel", next_action: "appel", next_action_at: o.date ?? inDays(1) });
    if (g === "appelFait") Object.assign(patch, { next_action: null, next_action_at: null });
    if (g === "plusTard") Object.assign(patch, { next_action: "relancer", next_action_at: inDays(DELAI.plusTard) });
    if (!p.owner && live.current.uid) patch.owner = live.current.uid;
    return save(p.user_id, patch);
  }, [save]);

  const note = useCallback(async (id: string, body: string) => {
    const ev = await addEvent(id, "note", body);
    if (!ev) announce("Note pas enregistrée.");
    return ev;
  }, []);
  // Une relance : la deuxième depuis le dernier DM ou la dernière réponse est la dernière (plus de suite, reste à trancher).
  // L'historique est relu en base : le bouton et la touche E comptent pareil, même si un autre admin vient de relancer.
  const relance = useCallback(async (p: Person, body = ""): Promise<Sent> => {
    const ev = await readEvents(p.user_id);
    if (!ev) {
      announce("Pas enregistré. Recharge la page.");
      return false;
    }
    const last = relancesOf(ev) >= 1;
    return (await gesture(p, "relance", { body, last })) && (last ? "fin" : "ok");
  }, [gesture]);
  // « Envoyé » : le premier DM, une relance, ou un message de plus dans la discussion.
  const sent = useCallback(async (p: Person, body = ""): Promise<Sent> =>
    p.status === "contacte" ? relance(p, body) : (await gesture(p, EARLY.includes(p.status) ? "envoye" : "dm", { body })) && "ok", [gesture, relance]);
  const ops = useMemo<Ops>(() => ({ save, stage, gesture, note, sent, relance }), [save, stage, gesture, note, sent, relance]);

  // La petite fenêtre fermée, le focus revient à la fiche ou à la ligne.
  function closeAsk() {
    const id = ask?.id;
    setAsk(null);
    setTimeout(() => (ui.p ? document.querySelector<HTMLElement>(".cr-fiche")?.focus({ preventScroll: true }) : id && focusRow(id)));
  }
  function answerAsk(v: number | Lost) {
    if (!ask) return;
    const p = live.current.people.find((x) => x.user_id === ask.id);
    const patch: Partial<Lead> = ask.kind === "client"
      ? { status: "client", amount: v as number, lost_reason: null, next_action: null, next_action_at: null }
      : { status: "non", lost_reason: v as Lost, amount: null, next_action: null, next_action_at: null };
    if (p && !p.owner && uid) patch.owner = uid;
    closeAsk();
    void save(ask.id, patch);
  }

  // ---------- vues, filtres, tri
  const base = useMemo(() => {
    const q = ui.q.trim().toLowerCase();
    const owner = ui.r === "moi" ? uid : ui.r;
    return people.filter((p) => (!ui.t || p.c.temp === ui.t) && (!owner || p.owner === owner) &&
      (!q || `${p.first_name} @${p.handle} ${p.email} ${answer(p.answers, "objectif")} ${p.c.goal}`.toLowerCase().includes(q)));
  }, [people, ui.q, ui.t, ui.r, uid]);
  const vue: View = ui.vue ?? "aujourdhui";
  const counts = useMemo(() => Object.fromEntries(VIEWS.map((v) => [v.key, base.filter((p) => inView(p, v.key)).length])), [base]);
  const shown = useMemo(
    () => base.filter((p) => inView(p, vue)).sort(ui.tri ? columnSort(ui.tri, ui.sens === "desc", team) : viewSort(vue)),
    [base, vue, ui.tri, ui.sens, team],
  );
  const todo = useMemo(() => people.filter(due).length, [people]);
  const mode = narrow ? "liste" : ui.mode;
  // Le pipeline montre tout le monde (filtres gardés), pas la vue rapide ; J et K le parcourent colonne par colonne.
  const pipe = useMemo(() => [...base].sort((a, b) => stageRank(a.status) - stageRank(b.status)), [base]);
  const rows = mode === "pipeline" ? pipe : shown;
  const multi = team.length > 1;
  const sel = ui.p ? people.find((p) => p.user_id === ui.p) : undefined;

  // ---------- navigation
  const focusRow = (id: string) => document.querySelector<HTMLElement>(`[data-row="${CSS.escape(id)}"]`)?.focus();
  const show = (id: string) => set({ p: id });
  // À la fermeture, le focus revient sur la ligne de la personne.
  const back = useRef<string | null>(null);
  const close = () => {
    back.current = ui.p;
    set({ p: null });
  };
  useEffect(() => {
    if (ui.p || !back.current) return;
    focusRow(back.current);
    back.current = null;
  }, [ui.p]);
  // La sélection suit le focus clavier : une ligne ou une carte qui le perd n'est plus sélectionnée.
  useEffect(() => {
    const on = (e: FocusEvent) => setCur(rowOf(e.target));
    const off = (e: FocusEvent) => { if (!rowOf(e.relatedTarget)) setCur(null); };
    document.addEventListener("focusin", on);
    document.addEventListener("focusout", off);
    return () => { document.removeEventListener("focusin", on); document.removeEventListener("focusout", off); };
  }, []);
  // Une personne qui quitte la vue après un geste : J passe à celle qui a pris sa place.
  useEffect(() => {
    const i = rows.findIndex((p) => p.user_id === (ui.p ?? cur));
    if (i >= 0) last.current = i;
  });
  function move(dir: 1 | -1) {
    const i = rows.findIndex((p) => p.user_id === (ui.p ?? cur));
    const j = i >= 0 ? i + dir : dir > 0 ? last.current : last.current - 1;
    const next = rows[Math.max(0, Math.min(rows.length - 1, j))];
    if (!next) return;
    if (ui.p) set({ p: next.user_id }); else focusRow(next.user_id);
  }
  useEffect(() => {
    const k = later.current;
    if (!ui.p || !k || !fiche.current) return;
    later.current = null;
    if (k === "d") fiche.current.dm(); else if (k === "s") fiche.current.suite(); else fiche.current.fin();
  }, [ui.p]);
  function sortBy(k: SortKey) {
    if (ui.tri === k) set({ sens: ui.sens === "asc" ? "desc" : "asc" });
    else set({ tri: k, sens: DESC_FIRST.includes(k) ? "desc" : "asc" });
  }

  // Raccourcis, jamais pendant la saisie (sauf Échap, qui ferme en enregistrant).
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || st !== "ok") return;
      const t = e.target as HTMLElement;
      const typing = !!t.closest?.("input, textarea, select, [contenteditable]");
      if (e.key === "Escape") {
        if (ask) closeAsk();
        else if (help) setHelp(false);
        else if (ui.p) { e.preventDefault(); close(); }
        else if (typing) t.blur();
        return;
      }
      if (typing || ask) return;
      if (help && e.key !== "?") return;
      const k = e.key.toLowerCase();
      // Un geste ne touche que la fiche ouverte ou la ligne qui a vraiment le focus (pas une ligne sortie de la vue).
      const id = ui.p ?? rowOf(t);
      const p = id ? people.find((x) => x.user_id === id) : undefined;
      if (k === "j" || e.key === "ArrowDown") { e.preventDefault(); move(1); }
      else if (k === "k" || e.key === "ArrowUp") { e.preventDefault(); move(-1); }
      else if (e.key === "/") { e.preventDefault(); if (ui.p) close(); search.current?.focus(); }
      else if (e.key === "?") { e.preventDefault(); setHelp((h) => !h); }
      else if (k === "v" && !narrow) set({ mode: ui.mode === "liste" ? "pipeline" : "liste" });
      else if (/^[1-7]$/.test(e.key) && p) { e.preventDefault(); stage(p.user_id, LEAD_STATUS[Number(e.key) - 1].key); }
      else if ((k === "d" || k === "s") && p) {
        e.preventDefault();
        if (ui.p) { if (k === "d") fiche.current?.dm(); else fiche.current?.suite(); }
        else { later.current = k; show(p.user_id); }
      }
      else if (k === "e" && p) {
        // Comme « Envoyé ? Oui » : une dernière relance ouvre la fiche pour trancher.
        if (ui.p) fiche.current?.envoye();
        else void sent(p).then((r) => { if (r === "fin") { later.current = "fin"; show(p.user_id); } });
      }
      else if (k === "r" && p) { if (ui.p) fiche.current?.reponse(); else void gesture(p, "reponse"); }
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  });

  if (st === "denied") return <p className="empty">Rien ici.</p>;
  if (st === "error") return <div className="empty cr-err"><p>Pas chargé.</p><button type="button" className="btn btn-sm" onClick={() => void start()}>Réessayer</button></div>;
  if (st === "wait") return null;

  const owner = (id: string | null) => team.find((x) => x.user_id === id);
  const askP = ask ? people.find((x) => x.user_id === ask.id) : undefined;

  return (
    <div className="page wide cr">
      <header className="page-head"><h1>Inscrits</h1><b className="disp count">{people.length}</b></header>

      <div className="cr-kpi">
        <button type="button" className="box cr-today" onClick={() => set({ vue: "aujourdhui", tri: "", mode: "liste" })}>
          <span className="lbl">Aujourd&apos;hui</span><b className="disp">{todo}</b>
        </button>
        <div className="box cr-fun">
          <div className="cr-fun-h">
            <span className="lbl">Entonnoir</span>
            <div className="seg">
              {PERIODS.map(([k, l]) => <button type="button" key={k} className={ui.periode === k ? "on" : ""} onClick={() => set({ periode: k })}>{l}</button>)}
            </div>
          </div>
          <ol>
            {STEPS.map(([k, l], i) => (
              <Fragment key={k}>
                {i > 0 && <li className="gap" aria-hidden="true"><span>→</span><small className="disp">{funnel ? pct(funnel[k], funnel[STEPS[i - 1][0]]) : ""}</small></li>}
                <li><b className="disp">{funnel ? num(funnel[k]) : "–"}</b><span>{l}</span></li>
              </Fragment>
            ))}
          </ol>
        </div>
        <div className="box cr-ca"><span className="lbl">CA signé</span><b className="disp">{num(funnel?.ca ?? 0)}</b><small className="muted">CHF</small></div>
      </div>
      {kpi && (
        <p className="cr-line">
          Démarré {pct(kpi.demarres, kpi.inscrits)} · Actifs 7 j {num(kpi.actifs_7j)} · Reviennent en semaine 2 {pct(kpi.revenus_s2, kpi.eligibles_s2)}
          {" · "}1er DM après {funnel?.delai_premier_dm_h != null ? `${funnel.delai_premier_dm_h} h` : "–"}
        </p>
      )}

      <div className="cr-bar">
        {mode === "liste" && (
          <div className="seg cr-views" role="tablist">
            {VIEWS.map((v) => (
              <button type="button" key={v.key} role="tab" aria-selected={vue === v.key} className={vue === v.key ? "on" : ""} onClick={() => set({ vue: v.key, tri: "" })}>
                {v.label}<b className="disp">{counts[v.key]}</b>
              </button>
            ))}
          </div>
        )}
        <div className="cr-tools">
          <input ref={search} className="inp cr-search" type="search" value={ui.q} onChange={(e) => set({ q: e.target.value })} placeholder="Rechercher" aria-label="Rechercher" />
          <select className="inp" value={ui.t} onChange={(e) => set({ t: e.target.value as Temp | "" })} aria-label="Température">
            <option value="">Température</option>
            {TEMPS.map((t) => <option key={t.key} value={t.key}>{t.label}</option>)}
          </select>
          {multi && (
            <select className="inp" value={ui.r} onChange={(e) => set({ r: e.target.value })} aria-label="Responsable">
              <option value="">Responsable</option>
              <option value="moi">Moi</option>
              {team.filter((x) => x.user_id !== uid).map((x) => <option key={x.user_id} value={x.user_id}>{x.first_name || x.email}</option>)}
            </select>
          )}
          {!narrow && (
            <div className="seg">
              {(["liste", "pipeline"] as const).map((m) => <button type="button" key={m} className={mode === m ? "on" : ""} onClick={() => set({ mode: m })}>{m === "liste" ? "Liste" : "Pipeline"}</button>)}
            </div>
          )}
          <button type="button" className="btn btn-ghost btn-sm" onClick={async () => { if (!(await exportCsv(rows, team))) announce("Export impossible."); }}>Exporter</button>
          {!narrow && <button type="button" className="cr-help" onClick={() => setHelp(true)} aria-label="Raccourcis">?</button>}
        </div>
      </div>

      {mode === "pipeline" ? <Pipeline people={pipe} funnel={funnel} ops={ops} show={show} /> : (
        <div className={`box cr-list${multi ? "" : " solo"}`} role="table" aria-label="Inscrits">
          <div className="cr-row cr-head" role="row">
            {COLS.filter((c) => multi || c.key !== "qui").map((c) => (
              <button type="button" key={c.key} role="columnheader" className={`lbl cr-${c.cls}${ui.tri === c.key ? " on" : ""}`} onClick={() => sortBy(c.key)}
                aria-sort={ui.tri === c.key ? (ui.sens === "desc" ? "descending" : "ascending") : undefined}>
                {c.label}{ui.tri === c.key ? (ui.sens === "desc" ? " ↓" : " ↑") : ""}
              </button>
            ))}
          </div>
          {shown.map((p) => {
            const s = suite(p);
            const o = owner(p.owner);
            return (
              <div key={p.user_id} className={`cr-row${ui.p === p.user_id ? " on" : ""}`} role="row" tabIndex={0} data-row={p.user_id}
                onClick={() => show(p.user_id)}
                onKeyDown={(e) => { if (e.key === "Enter" && e.target === e.currentTarget) { e.preventDefault(); show(p.user_id); } }}>
                <span role="cell" className="cr-who"><Face p={p} size={28} /><span><b>{name(p)}</b>{p.handle && <small>@{p.handle}</small>}</span></span>
                <span role="cell" className="cr-sc"><Mark c={p.c} /></span>
                <span role="cell" className="cr-goal">{p.c.goal || "–"}</span>
                <span role="cell" className="cr-inv">{p.c.invest}</span>
                <span role="cell" className="cr-fol">{p.c.ig ? <b className="disp">{num(p.c.ig.followers)}</b> : <span className="muted">{p.c.range || "–"}</span>}</span>
                <span role="cell" className="cr-sem">{ago(p.last_active)} · {plural(p.contents_published, "publié")}</span>
                <span role="cell" className="cr-stage">{stageLabel(p.status)}</span>
                <span role="cell" className={`cr-next${s?.late ? " cr-late" : ""}`}>{s?.text ?? ""}</span>
                {multi && <span role="cell" className="cr-qui" title={o?.first_name}>{(o?.first_name || o?.email || "").charAt(0).toUpperCase()}</span>}
              </div>
            );
          })}
          {!shown.length && <p className="empty">{VIEWS.find((v) => v.key === vue)!.empty}</p>}
        </div>
      )}

      {sel && <Fiche key={sel.user_id} ref={fiche} p={sel} team={team} me={{ id: uid, name: self?.firstName ?? "" }} ops={ops} tick={tick} close={close} />}

      {ask && askP && (
        <div className="cr-modal-veil" onClick={closeAsk}>
          <Ask who={name(askP)} kind={ask.kind} done={answerAsk} />
        </div>
      )}
      {help && (
        <div className="cr-modal-veil" onClick={() => setHelp(false)}>
          <div className="cr-modal" role="dialog" aria-label="Raccourcis" onClick={(e) => e.stopPropagation()}>
            <dl className="cr-keys">{KEYS.map(([k, l]) => <Fragment key={k}><dt><kbd>{k}</kbd></dt><dd>{l}</dd></Fragment>)}</dl>
          </div>
        </div>
      )}
    </div>
  );
}

// Passer en Client demande le montant, passer en « Pas pour nous » demande la raison.
function Ask({ who, kind, done }: { who: string; kind: "client" | "non"; done: (v: number | Lost) => void }) {
  const [amount, setAmount] = useState("");
  const ok = amount !== "" && Number(amount) >= 0 && Number(amount) <= 100000;
  return (
    <div className="cr-modal" role="dialog" aria-label={`${who} · ${stageLabel(kind)}`} onClick={(e) => e.stopPropagation()}>
      <span className="cr-modal-h"><b>{who}</b><span className="lbl">{stageLabel(kind)}</span></span>
      {kind === "client" ? (
        <form className="cr-amount" onSubmit={(e) => { e.preventDefault(); if (ok) done(Math.round(Number(amount))); }}>
          <input className="inp" type="number" inputMode="numeric" min={0} max={100000} step={50} value={amount} onChange={(e) => setAmount(e.target.value)} autoFocus aria-label="Montant en CHF" />
          <span className="muted">CHF</span>
          <button type="submit" className="btn btn-sm" disabled={!ok}>OK</button>
        </form>
      ) : (
        <div className="cr-reasons">
          {LOST.map((l, i) => <button type="button" key={l.key} className="cr-chip" autoFocus={i === 0} onClick={() => done(l.key)}>{l.label}</button>)}
        </div>
      )}
    </div>
  );
}
