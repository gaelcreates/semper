"use client";

import { Fragment, useEffect, useMemo, useState } from "react";
import { constance } from "../stats";
import { LEAD_STATUS, type Data, type LeadStatus } from "../store";
import { sb } from "../../supabase";
import { KINDS, TEMPS, USAGES, classify, type Signals, type Temp, type Usage } from "./score";

type Row = {
  id: string; name: string; handle: string; email: string; avatar: string | null; since: string;
  answers: Record<string, unknown>; total: number; published: number; streak: number;
  signals: Signals; c: ReturnType<typeof classify>; status: LeadStatus; note: string;
};
const txt = (v: unknown) => (Array.isArray(v) ? v.join(", ") : String(v ?? ""));
const date = (s: string | null) => (s ? new Date(s).toLocaleDateString("fr-CH", { day: "numeric", month: "short" }) : "–");
const ago = (s: string | null) => {
  if (!s) return "jamais";
  const d = Math.floor((Date.now() - new Date(s).getTime()) / 864e5);
  return d <= 0 ? "aujourd'hui" : d === 1 ? "hier" : `il y a ${d} j`;
};
const num = (n: number | null | undefined) => (n == null ? "–" : n.toLocaleString("fr-CH"));
const QUESTIONS: [string, string][] = [
  ["pourquoi", "Crée pour"], ["abonnes", "Abonnés déclarés"], ["objectif", "Objectif à 6 mois"], ["investi", "A investi"],
  ["frequence", "Publie"], ["blocage", "Bloqué par"], ["usage", "Attend de Semper"], ["source", "Connu par"],
];

// Le CRM : chaque inscrit analysé (réponses, usage de Semper, Instagram) et classé automatiquement.
// Réservé aux comptes de la table admins ; Supabase le garantit (is_admin), pas seulement cette page.
export default function Admin() {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [denied, setDenied] = useState(false);
  const [kpi, setKpi] = useState<Record<string, number> | null>(null);
  const [temp, setTemp] = useState<Temp | "all">("all");
  const [usage, setUsage] = useState<Usage | "all">("all");
  const [status, setStatus] = useState<LeadStatus | "all">("all");
  const [q, setQ] = useState("");
  const [open, setOpen] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const s = sb();
      const { data: ok } = await s.rpc("is_admin");
      if (!ok) return setDenied(true);
      s.rpc("admin_kpis").then(({ data }) => setKpi(data));
      const [p, c, l, sig] = await Promise.all([
        s.from("profiles").select("*").order("created_at", { ascending: false }),
        s.from("contents").select("user_id, publish_at, published_at, steps"),
        s.from("leads").select("*"),
        s.rpc("admin_signals"),
      ]);
      const lead = new Map((l.data ?? []).map((x) => [x.user_id, x]));
      const signals = new Map(((sig.data ?? []) as (Signals & { user_id: string })[]).map((x) => [x.user_id, x]));
      setRows((p.data ?? []).map((u) => {
        const mine = (c.data ?? []).filter((x) => x.user_id === u.id).map((x) => ({ publishAt: x.publish_at, publishedAt: x.published_at, steps: x.steps }));
        const st = constance({ profile: { rythme: u.rythme, createdAt: u.created_at }, contents: mine } as unknown as Data);
        const sg = signals.get(u.id) ?? ({ last_active: null, active_days_30: 0 } as unknown as Signals);
        return {
          id: u.id, name: u.first_name, handle: u.handle, email: u.email, avatar: u.avatar_url, since: u.created_at, answers: u.answers ?? {},
          total: mine.length, published: mine.filter((x) => x.publishedAt).length, streak: st.streak,
          signals: sg, c: classify(u.answers ?? {}, sg, u.created_at, mine.length),
          status: lead.get(u.id)?.status ?? "verifier", note: lead.get(u.id)?.note ?? "",
        };
      }).sort((a, b) => b.c.score - a.c.score));
    })();
  }, []);

  function set(id: string, patch: Partial<Pick<Row, "status" | "note">>) {
    setRows((r) => r!.map((x) => (x.id === id ? { ...x, ...patch } : x)));
    sb().from("leads").update({ ...patch, updated_at: new Date().toISOString() }).eq("user_id", id).then();
  }

  const shown = useMemo(() => (rows ?? []).filter((r) =>
    (temp === "all" || r.c.temp === temp) && (usage === "all" || r.c.usage === usage) && (status === "all" || r.status === status) &&
    (!q || `${r.name} ${r.handle} ${r.email}`.toLowerCase().includes(q.toLowerCase()))), [rows, temp, usage, status, q]);

  if (denied) return <p className="empty">Rien ici.</p>;
  if (!rows) return null;
  const sel = rows.find((r) => r.id === open);

  return (
    <div className="page wide">
      <header className="page-head"><h1>Inscrits</h1><b className="disp count">{rows.length}</b></header>

      {kpi && (
        <ul className="ad-kpi">
          {[
            ["Inscrits", kpi.inscrits, `+${kpi.inscrits_7j} en 7 j`],
            ["Ont démarré", kpi.demarres, "au moins un contenu"],
            ["Actifs", kpi.actifs_7j, `7 j · ${kpi.actifs_30j} en 30 j`],
            ["Publient", kpi.publient_7j, "en 7 j"],
            ["Reviennent", kpi.eligibles_s2 ? `${Math.round((100 * kpi.revenus_s2) / kpi.eligibles_s2)} %` : "–", "en semaine 2"],
          ].map(([t, v, d]) => (
            <li key={t as string} className="box"><span className="lbl">{t}</span><b className="disp">{v}</b><small className="muted">{d}</small></li>
          ))}
        </ul>
      )}

      <div className="crm-bar">
        <div className="seg" role="tablist">
          {[{ key: "all" as const, label: "Tous" }, ...TEMPS].map((t) => (
            <button key={t.key} role="tab" aria-selected={temp === t.key} className={temp === t.key ? "on" : ""} onClick={() => setTemp(t.key)}>
              {t.label} <b className="disp">{t.key === "all" ? rows.length : rows.filter((r) => r.c.temp === t.key).length}</b>
            </button>
          ))}
        </div>
        <select className="inp" value={usage} onChange={(e) => setUsage(e.target.value as Usage | "all")} aria-label="Usage">
          <option value="all">Tout usage</option>
          {(Object.keys(USAGES) as Usage[]).map((k) => <option key={k} value={k}>{USAGES[k]}</option>)}
        </select>
        <select className="inp" value={status} onChange={(e) => setStatus(e.target.value as LeadStatus | "all")} aria-label="Statut">
          <option value="all">Tout statut</option>
          {LEAD_STATUS.map((l) => <option key={l.key} value={l.key}>{l.label}</option>)}
        </select>
        <input className="inp" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Rechercher" aria-label="Rechercher" />
      </div>

      <div className="ad box" role="table">
        <div className="crm-row ad-head" role="row">
          <span className="lbl">Créateur</span><span className="lbl">Potentiel</span><span className="lbl">Profil</span><span className="lbl">Usage</span>
          <span className="lbl">Abonnés</span><span className="lbl">Objectif</span><span className="lbl">Contenus</span><span className="lbl">Vu</span><span className="lbl">Statut</span>
        </div>
        {shown.map((r) => (
          <div className={`crm-row${open === r.id ? " on" : ""}`} role="row" key={r.id} onClick={() => setOpen(r.id)}>
            <span className="who">
              <Face r={r} />
              <span><b>{r.name || r.email}</b><small>{r.handle ? `@${r.handle}` : r.email}</small></span>
            </span>
            <span className={`temp ${r.c.temp}`}><b className="disp">{r.c.score}</b>{TEMPS.find((t) => t.key === r.c.temp)!.label}</span>
            <span className="muted">{KINDS[r.c.kind]}</span>
            <span className={`use ${r.c.usage}`}>{USAGES[r.c.usage]}</span>
            <span>{r.c.ig ? <b className="disp">{num(r.c.ig.followers)}</b> : <span className="muted">{txt(r.answers.abonnes)}</span>}</span>
            <span className="clip" title={txt(r.answers.objectif)}>{txt(r.answers.objectif)}</span>
            <span><b className="disp">{r.total}</b> <small className="muted">· {r.published} publiés</small></span>
            <span className="muted">{ago(r.signals.last_active)}</span>
            <select className="inp" value={r.status} onClick={(e) => e.stopPropagation()} onChange={(e) => set(r.id, { status: e.target.value as LeadStatus })} aria-label="Statut">
              {LEAD_STATUS.map((l) => <option key={l.key} value={l.key}>{l.label}</option>)}
            </select>
          </div>
        ))}
        {!shown.length && <p className="empty">Personne ici.</p>}
      </div>

      {sel && <Fiche r={sel} close={() => setOpen(null)} set={(patch) => set(sel.id, patch)} />}
    </div>
  );
}

function Face({ r, size = 34 }: { r: Row; size?: number }) {
  return (
    <span className="avatar" style={{ width: size, height: size, fontSize: size * 0.42 }} aria-hidden="true">
      {r.avatar ? <img src={r.avatar} alt="" /> : (r.name || r.email).charAt(0).toUpperCase()}
    </span>
  );
}

// La fiche d'une personne : pourquoi ce classement, ses réponses, son Instagram, son usage, ta note.
function Fiche({ r, close, set }: { r: Row; close: () => void; set: (p: Partial<Pick<Row, "status" | "note">>) => void }) {
  const ig = r.c.ig;
  useEffect(() => {
    const k = (e: KeyboardEvent) => e.key === "Escape" && close();
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [close]);
  return (
    <>
      <div className="crm-veil" onClick={close} />
      <aside className="crm-fiche" aria-label={`Fiche de ${r.name}`}>
        <header>
          <Face r={r} size={56} />
          <span>
            <h2>{r.name || "Sans prénom"}</h2>
            <small><a href={`mailto:${r.email}`}>{r.email}</a></small>
          </span>
          <button type="button" className="crm-x" onClick={close} aria-label="Fermer">×</button>
        </header>

        <div className="crm-acts">
          {r.handle && <a className="btn btn-sm" href={`https://ig.me/m/${r.handle}`} target="_blank" rel="noreferrer">Écrire sur Instagram</a>}
          {r.handle && <a className="link" href={`https://www.instagram.com/${r.handle}/`} target="_blank" rel="noreferrer">@{r.handle}</a>}
        </div>

        <section>
          <h3><span className={`temp ${r.c.temp}`}><b className="disp">{r.c.score}</b>{TEMPS.find((t) => t.key === r.c.temp)!.label}</span> {KINDS[r.c.kind]} · {USAGES[r.c.usage]}</h3>
          <ul className="crm-why">{r.c.why.map((w) => <li key={w.label}><span>{w.label}</span><b className="disp">+{w.pts}</b></li>)}</ul>
        </section>

        <section>
          <h3>Instagram</h3>
          {ig ? (
            <dl className="crm-dl">
              <dt>Abonnés</dt><dd>{num(ig.followers)}{ig.growth != null && <small className="muted"> ({ig.growth >= 0 ? "+" : ""}{num(ig.growth)} en 4 sem.)</small>}</dd>
              <dt>Publications</dt><dd>{ig.perWeek} par semaine</dd>
              <dt>Vues moyennes</dt><dd>{num(ig.views)}</dd>
              <dt>Engagement</dt><dd>{ig.engagement} %</dd>
              <dt>Part de reels</dt><dd>{ig.reels == null ? "–" : `${ig.reels} %`}</dd>
              <dt>Relevé</dt><dd>{date(r.signals.ig_day)}</dd>
            </dl>
          ) : <p className="muted">Pas encore de relevé. Il arrive dès que Meta est branché et que le compte est pro ou créateur.</p>}
        </section>

        <section>
          <h3>Dans Semper</h3>
          <dl className="crm-dl">
            <dt>Inscrit</dt><dd>{date(r.since)}</dd>
            <dt>Dernière visite</dt><dd>{ago(r.signals.last_active)}</dd>
            <dt>Jours actifs</dt><dd>{r.signals.active_days_30} sur 30</dd>
            <dt>Contenus</dt><dd>{r.total} · {r.published} publiés</dd>
            <dt>Série</dt><dd>{r.streak} semaines</dd>
          </dl>
        </section>

        <section>
          <h3>Ses réponses</h3>
          <dl className="crm-dl">
            {QUESTIONS.map(([k, label]) => <Fragment key={k}><dt>{label}</dt><dd>{txt(r.answers[k]) || "–"}</dd></Fragment>)}
          </dl>
        </section>

        <section>
          <h3>Suivi</h3>
          <select className="inp" value={r.status} onChange={(e) => set({ status: e.target.value as LeadStatus })} aria-label="Statut">
            {LEAD_STATUS.map((l) => <option key={l.key} value={l.key}>{l.label}</option>)}
          </select>
          <textarea className="inp crm-note" defaultValue={r.note} key={r.id} onBlur={(e) => e.target.value !== r.note && set({ note: e.target.value })} placeholder="Note" rows={4} />
        </section>
      </aside>
    </>
  );
}
