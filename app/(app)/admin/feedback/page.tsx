"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { sb } from "../../../supabase";

type Row = { id: string; user_id: string | null; email: string | null; body: string; page: string | null; created_at: string };
type Who = { id: string; first_name: string | null; handle: string | null };

// Les retours écrits depuis l'espace, du plus récent au plus ancien. À lire, pas à traiter.
// La base ne les montre qu'aux admins (is_admin), pas seulement cette page.
export default function Page() {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [who, setWho] = useState<Record<string, Who>>({});
  useEffect(() => {
    (async () => {
      const { data } = await sb().from("feedback").select("id, user_id, email, body, page, created_at").order("created_at", { ascending: false }).limit(300);
      const list = (data ?? []) as Row[];
      setRows(list);
      const ids = [...new Set(list.map((r) => r.user_id).filter(Boolean))] as string[];
      if (!ids.length) return;
      const { data: p } = await sb().from("profiles").select("id, first_name, handle").in("id", ids);
      setWho(Object.fromEntries(((p ?? []) as Who[]).map((x) => [x.id, x])));
    })();
  }, []);
  if (!rows) return null;
  return (
    <div className="page fb-page">
      <header className="page-head"><h1>Feedback</h1><b className="disp count">{rows.length}</b><Link href="/admin" className="link">Inscrits</Link></header>
      {rows.length ? (
        <ol className="fb-list">
          {rows.map((r) => {
            const w = r.user_id ? who[r.user_id] : undefined;
            const d = new Date(r.created_at);
            return (
              <li key={r.id} className="box">
                <p>{r.body}</p>
                <small className="muted">
                  {[w?.first_name, w?.handle ? `@${w.handle}` : r.email, d.toLocaleDateString("fr-CH", { day: "numeric", month: "short" }) + " · " + d.toLocaleTimeString("fr-CH", { hour: "2-digit", minute: "2-digit" }), r.page].filter(Boolean).join(" · ")}
                </small>
              </li>
            );
          })}
        </ol>
      ) : <p className="empty">Aucun feedback pour l&apos;instant.</p>}
    </div>
  );
}
