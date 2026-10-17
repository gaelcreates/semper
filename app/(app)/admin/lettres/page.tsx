"use client";

import { useEffect, useState } from "react";
import { sb } from "../../../supabase";
import { letterStats, listLetters, type Letter, type LetterStats } from "../lettres";

const token = async () => (await sb().auth.getSession()).data.session?.access_token ?? "";
const STATUS: Record<string, string> = { sent: "Envoyée", draft: "Brouillon", queued: "Programmée", scheduled: "Programmée", sending: "En cours d'envoi" };
const rate = (n: number, of: number) => (of ? `${Math.round((n / of) * 100)} %` : "–");
const date = (s: string) => new Date(s).toLocaleDateString("fr-CH", { day: "numeric", month: "long", year: "numeric" });

// Les lettres envoyées depuis Resend, et ce qu'elles ont donné : livrées, ouvertes, cliquées, désabonnements.
export default function Page() {
  const [data, setData] = useState<Awaited<ReturnType<typeof listLetters>> | undefined>(undefined);
  const [stats, setStats] = useState<Record<string, LetterStats | null>>({});
  useEffect(() => {
    (async () => {
      const t = await token();
      const d = await listLetters(t).catch(() => null);
      setData(d);
      // Les chiffres se chargent une lettre après l'autre (Resend limite le débit).
      for (const l of d?.letters.filter((x) => x.status === "sent") ?? []) {
        const s = await letterStats(t, l.id).catch(() => null);
        setStats((x) => ({ ...x, [l.id]: s }));
      }
    })();
  }, []);

  if (data === undefined) return <div className="page wide ad-page"><header className="page-head"><h1>Lettres</h1></header><p className="muted">Chargement depuis Resend…</p></div>;
  if (data === null) return <p className="empty">Rien ici.</p>;
  const { letters, tracking } = data;

  return (
    <div className="page wide ad-page">
      <header className="page-head"><h1>Lettres</h1><b className="disp count">{letters.filter((l) => l.status === "sent").length}</b></header>
      {(!tracking.open || !tracking.click) && (
        <p className="box pf ad-warn">Le suivi {!tracking.open && !tracking.click ? "des ouvertures et des clics est désactivé" : !tracking.open ? "des ouvertures est désactivé" : "des clics est désactivé"} dans Resend (Domains, trysemper.app). Tant qu&apos;il l&apos;est, ces chiffres restent à zéro.</p>
      )}
      {letters.length ? letters.map((l: Letter) => {
        const s = stats[l.id];
        return (
          <section key={l.id} className="box pf ad-letter">
            <header><h2>{l.subject}</h2><span className={`pf-chip${l.status === "sent" ? " ok" : ""}`}>{STATUS[l.status] ?? l.status}</span></header>
            <small className="muted">{l.sentAt ? `Envoyée le ${date(l.sentAt)}` : `Créée le ${date(l.createdAt)}`}</small>
            {l.status === "sent" && (s === undefined ? <p className="muted">Calcul des chiffres…</p> : s === null ? <p className="muted">Chiffres indisponibles.</p> : (
              <>
                <div className="ad-nums">
                  <div><b className="disp">{s.delivered}</b><span>livrées sur {s.sent}</span></div>
                  <div><b className="disp">{rate(s.opened, s.delivered)}</b><span>ouvertes · {s.opened}</span></div>
                  <div><b className="disp">{rate(s.clicked, s.delivered)}</b><span>ont cliqué · {s.clicked}</span></div>
                  <div><b className="disp">{s.unsubscribed}</b><span>désabonnements</span></div>
                  <div><b className="disp">{s.bounced}</b><span>adresses en échec</span></div>
                </div>
                {s.links.length > 0 && (
                  <ol className="ad-links">{s.links.map((x) => <li key={x.url}><span>{x.url.replace(/^https?:\/\//, "")}</span><b className="disp">{x.unique}</b></li>)}</ol>
                )}
              </>
            ))}
          </section>
        );
      }) : <p className="muted">Aucune lettre dans Resend pour l&apos;instant.</p>}
    </div>
  );
}
