"use client";

import { useEffect, useState } from "react";
import { constance } from "../stats";
import { LEAD_STATUS, type Data, type LeadStatus } from "../store";
import { sb } from "../../supabase";

type Row = {
  id: string; name: string; handle: string; email: string; since: string; seen: string;
  abonnes: string; followers: number | null; pour: string; investi: string; source: string;
  total: number; streak: number; status: LeadStatus; note: string;
};
const txt = (v: unknown) => (Array.isArray(v) ? v.join(", ") : String(v ?? ""));
const date = (s: string) => new Date(s).toLocaleDateString("fr-CH");

// Les inscrits, pour le setting : qui, combien d'abonnés, pourquoi il crée, son activité, le statut de prospection.
// Réservé aux comptes de la table admins ; les règles d'accès de Supabase le garantissent, pas seulement cette page.
export default function Admin() {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [denied, setDenied] = useState(false);
  const [tab, setTab] = useState<LeadStatus | "all">("all");

  useEffect(() => {
    (async () => {
      const s = sb();
      const { data: ok } = await s.rpc("is_admin");
      if (!ok) return setDenied(true);
      const [p, c, l, ig] = await Promise.all([
        s.from("profiles").select("*").order("created_at", { ascending: false }),
        s.from("contents").select("user_id, publish_at, published_at, steps"),
        s.from("leads").select("*"),
        s.from("ig_snapshots").select("handle, day, followers").order("day", { ascending: false }).limit(2000),
      ]);
      const lead = new Map((l.data ?? []).map((x) => [x.user_id, x]));
      const last = new Map<string, number>();
      for (const x of ig.data ?? []) if (!last.has(x.handle) && x.followers != null) last.set(x.handle, x.followers);
      setRows((p.data ?? []).map((u) => {
        const mine = (c.data ?? []).filter((x) => x.user_id === u.id)
          .map((x) => ({ publishAt: x.publish_at, publishedAt: x.published_at, steps: x.steps }));
        const st = constance({ profile: { rythme: u.rythme, createdAt: u.created_at }, contents: mine } as unknown as Data);
        return {
          id: u.id, name: u.first_name, handle: u.handle, email: u.email, since: u.created_at, seen: u.seen_at,
          abonnes: txt(u.answers?.abonnes), followers: last.get(u.handle.toLowerCase()) ?? null,
          pour: txt(u.answers?.pourquoi), investi: txt(u.answers?.investi), source: txt(u.answers?.source),
          total: st.total, streak: st.streak, status: lead.get(u.id)?.status ?? "verifier", note: lead.get(u.id)?.note ?? "",
        };
      }));
    })();
  }, []);

  function set(id: string, patch: Partial<Pick<Row, "status" | "note">>) {
    setRows((r) => r!.map((x) => (x.id === id ? { ...x, ...patch } : x)));
    sb().from("leads").update({ ...patch, updated_at: new Date().toISOString() }).eq("user_id", id).then();
  }

  if (denied) return <p className="empty">Rien ici.</p>;
  if (!rows) return null;
  const shown = rows.filter((r) => tab === "all" || r.status === tab);

  return (
    <div className="page wide">
      <header className="page-head"><h1>Inscrits</h1><b className="disp count">{rows.length}</b></header>

      <div className="seg ad-tabs" role="tablist">
        {[{ key: "all" as const, label: "Tous" }, ...LEAD_STATUS].map((t) => (
          <button key={t.key} role="tab" aria-selected={tab === t.key} className={tab === t.key ? "on" : ""} onClick={() => setTab(t.key)}>
            {t.label} <b className="disp">{t.key === "all" ? rows.length : rows.filter((r) => r.status === t.key).length}</b>
          </button>
        ))}
      </div>

      <div className="ad box" role="table">
        <div className="ad-row ad-head" role="row">
          <span className="lbl">Créateur</span><span className="lbl">Abonnés</span><span className="lbl">Crée pour</span><span className="lbl">Investi</span><span className="lbl">Source</span>
          <span className="lbl">Inscrit</span><span className="lbl">Publiées</span><span className="lbl">Série</span><span className="lbl">Statut</span><span className="lbl">Note</span>
        </div>
        {shown.map((r) => (
          <div className="ad-row" role="row" key={r.id}>
            <span className="who">
              <b>{r.name || r.email}</b>
              {r.handle ? <a href={`https://www.instagram.com/${r.handle}/`} target="_blank" rel="noreferrer">@{r.handle}</a> : <span className="muted">Sans pseudo</span>}
            </span>
            <span>{r.followers != null ? <b className="disp">{r.followers}</b> : r.abonnes}</span>
            <span className="muted clip" title={r.pour}>{r.pour}</span>
            <span className="muted clip" title={r.investi}>{r.investi}</span>
            <span className="muted">{r.source}</span>
            <span className="muted" title={`Vu le ${date(r.seen)}`}>{date(r.since)}</span>
            <b className="disp">{r.total}</b>
            <b className="disp">{r.streak}</b>
            <select className="inp" value={r.status} onChange={(e) => set(r.id, { status: e.target.value as LeadStatus })} aria-label="Statut">
              {LEAD_STATUS.map((l) => <option key={l.key} value={l.key}>{l.label}</option>)}
            </select>
            <input className="inp" defaultValue={r.note} onBlur={(e) => e.target.value !== r.note && set(r.id, { note: e.target.value })} placeholder="Note" aria-label="Note" />
          </div>
        ))}
      </div>
    </div>
  );
}
