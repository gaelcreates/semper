"use client";

import { useEffect, useMemo, useState } from "react";
import { sb } from "../../../supabase";

type Row = { email: string; source: string | null; created_at: string; synced_at: string | null };

// La waitlist : combien, d'où ils viennent (lien ?ref= ou site d'origine), et qui a déjà créé son compte.
// La base ne la montre qu'aux admins (is_admin).
export default function Page() {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [accounts, setAccounts] = useState<Set<string>>(new Set());
  const [q, setQ] = useState("");
  useEffect(() => {
    (async () => {
      const { data } = await sb().from("waitlist").select("email, source, created_at, synced_at").order("created_at", { ascending: false }).limit(5000);
      setRows((data ?? []) as Row[]);
      const { data: p } = await sb().from("profiles").select("email").limit(5000);
      setAccounts(new Set(((p ?? []) as { email: string | null }[]).map((x) => (x.email ?? "").toLowerCase())));
    })();
  }, []);

  const view = useMemo(() => {
    if (!rows) return null;
    const now = Date.now(), day = 864e5;
    const since = (n: number) => rows.filter((r) => now - new Date(r.created_at).getTime() < n * day).length;
    const by = new Map<string, number>();
    rows.forEach((r) => by.set(r.source || "Direct", (by.get(r.source || "Direct") ?? 0) + 1));
    const sources = [...by.entries()].sort((a, b) => b[1] - a[1]);
    const joined = rows.filter((r) => accounts.has(r.email)).length;
    const list = rows.filter((r) => !q || r.email.includes(q.toLowerCase()) || (r.source ?? "").toLowerCase().includes(q.toLowerCase()));
    return { today: since(1), week: since(7), sources, joined, list };
  }, [rows, accounts, q]);

  if (!rows || !view) return null;
  const pct = (n: number) => (rows.length ? `${Math.round((n / rows.length) * 100)} %` : "");
  const when = (s: string) => { const d = new Date(s); return `${d.toLocaleDateString("fr-CH", { day: "numeric", month: "short" })} · ${d.toLocaleTimeString("fr-CH", { hour: "2-digit", minute: "2-digit" })}`; };

  return (
    <div className="page wide ad-page">
      <header className="page-head"><h1>Waitlist</h1><b className="disp count">{rows.length}</b></header>
      <div className="cs-stats four">
        <div className="box stat"><span className="lbl">Inscrits</span><b className="disp">{rows.length}</b><span className="unit">depuis le début</span></div>
        <div className="box stat"><span className="lbl">7 jours</span><b className="disp">{view.week}</b><span className="unit">nouveaux cette semaine</span></div>
        <div className="box stat"><span className="lbl">Aujourd&apos;hui</span><b className="disp">{view.today}</b><span className="unit">dans les 24 dernières heures</span></div>
        <div className="box stat"><span className="lbl">Comptes créés</span><b className="disp">{view.joined}</b><span className="unit">{pct(view.joined) || "dès l'ouverture"}</span></div>
      </div>

      {view.sources.length > 0 && (
        <section className="box pf">
          <h2>D&apos;où ils viennent</h2>
          <ul className="ad-src">
            {view.sources.map(([s, n]) => (
              <li key={s}><span>{s}</span><i style={{ ["--w" as string]: `${(n / view.sources[0][1]) * 100}%` }} /><b className="disp">{n}</b></li>
            ))}
          </ul>
          <small className="muted">Ajoute ?ref=nom à tes liens (trysemper.app/?ref=reel1) pour savoir quel contenu amène qui.</small>
        </section>
      )}

      <section className="box pf">
        <header className="ad-list-h"><h2>Inscriptions</h2><input className="inp ad-search" type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Rechercher" aria-label="Rechercher" /></header>
        {view.list.length ? (
          <ol className="ad-rows">
            {view.list.slice(0, 300).map((r) => (
              <li key={r.email}>
                <span className="ad-mail">{r.email}</span>
                <span className="muted">{r.source || "Direct"}</span>
                <span className="muted">{when(r.created_at)}</span>
                <span>{accounts.has(r.email) ? <span className="pf-chip ok">Compte créé</span> : !r.synced_at ? <span className="pf-chip warn">Pas encore dans Resend</span> : null}</span>
              </li>
            ))}
          </ol>
        ) : <p className="muted">Personne pour l&apos;instant.</p>}
      </section>
    </div>
  );
}
