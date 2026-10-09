"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import Logo from "../Logo";
import DotIcon from "../DotIcon";
import ThemeToggle from "../ThemeToggle";
import Sheet from "./Sheet";
import Moon from "./Moon";
import Orbit from "../Orbit";
import Install from "./Install";
import { constance, titleOf } from "./stats";
import Avatar from "./Avatar";
import { announce, createContent, load, openSheet, openedSheet, useData, useNote, useOpen } from "./store";
import { sb } from "../supabase";

const nav = [
  { href: "/calendrier", label: "Calendrier", icon: "cal" },
  { href: "/constance", label: "Constance", icon: "lune" },
  { href: "/organisation", label: "Organisation", icon: "orga" },
  { href: "/profil", label: "Profil", icon: "profil" },
] as const;
// Le CRM, seulement pour les comptes admin (la base le garantit aussi, voir is_admin).
const admin = { href: "/admin", label: "Inscrits", icon: "serie" } as const;

export const newContent = () => openSheet(createContent());

// La coque de l'espace : barre latérale (bureau), barre du haut et onglets du bas (téléphone),
// la fiche ouverte et les annonces.
export default function Shell({ children }: { children: React.ReactNode }) {
  const d = useData();
  const open = useOpen();
  const path = usePathname();
  const router = useRouter();
  const [fail, setFail] = useState<"offline" | "error" | null>(null);
  const [isAdmin, setAdmin] = useState(false);

  // Sans session, direction la connexion. Sans réseau ou base en panne, on le dit et on propose de réessayer.
  const start = () => load().then((r) => (r === "none" ? router.replace("/connexion") : setFail(r === "ok" ? null : r)));
  useEffect(() => { start(); }, [router]); // eslint-disable-line react-hooks/exhaustive-deps
  const ready = !!d;
  useEffect(() => { if (ready) sb().rpc("is_admin").then(({ data }) => setAdmin(data === true)); }, [ready]);
  const links = isAdmin ? [...nav, admin] : nav;

  // « N » crée un contenu, où qu'on soit, sauf pendant la saisie ou quand une fiche est déjà ouverte.
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (e.key !== "n" || e.metaKey || e.ctrlKey || e.altKey || openedSheet() || t.closest("input, textarea, select, [contenteditable]")) return;
      e.preventDefault();
      newContent();
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, []);

  const streak = d ? constance(d).streak : 0;
  const title = titleOf(streak).title;

  return (
    <div className="ws">
      <aside className="ws-side">
        <Link href="/calendrier" className="brand" aria-label="Semper"><Logo /></Link>
        <button type="button" className="btn ws-new" onClick={newContent}><DotIcon name="ajout" /> Nouveau contenu</button>
        <nav className="ws-nav">
          {links.map((n) => (
            <Link key={n.href} href={n.href} className={path.startsWith(n.href) ? "on" : ""}><DotIcon name={n.icon} />{n.label}</Link>
          ))}
        </nav>
        <Install />
        {d && (
          <Link href="/profil" className={`ws-me${path.startsWith("/profil") ? " on" : ""}`}>
            <Avatar />
            <span><b>{d.profile.firstName || "Mon profil"}</b><small>{d.profile.handle ? `@${d.profile.handle}` : d.profile.email}</small></span>
          </Link>
        )}
        <div className="ws-foot">
          <Link href="/constance" className="ws-streak" aria-label={`${title}, ${streak} semaines tenues`}>
            <Moon streak={streak} n={11} />
            <span><b>{title}</b><span className="lbl">{streak} sem.</span></span>
          </Link>
          <ThemeToggle />
        </div>
      </aside>

      <header className="ws-top">
        <Link href="/calendrier" className="brand" aria-label="Semper"><Logo /></Link>
        <span className="ws-top-r">
          <Link href="/constance" className="ws-top-moon" aria-label={`${title}, ${streak} semaines tenues`}><Moon streak={streak} n={9} /></Link>
          <ThemeToggle />
          {d && <Link href="/profil" aria-label="Profil"><Avatar /></Link>}
        </span>
      </header>

      <main className="ws-main">
        {d ? children : fail ? (
          <span className="ws-wait off"><b>{fail === "offline" ? "Hors ligne" : "Serveur indisponible"}</b><button type="button" className="btn btn-ghost" onClick={() => { setFail(null); start(); }}>Réessayer</button></span>
        ) : <span className="ws-wait"><Orbit size={28} /></span>}
      </main>

      <nav className="ws-tabs">
        {links.map((n) => <Link key={n.href} href={n.href} className={path.startsWith(n.href) ? "on" : ""}><DotIcon name={n.icon} /><span>{n.label}</span></Link>)}
      </nav>
      <button type="button" className="ws-fab" onClick={newContent} aria-label="Nouveau contenu"><DotIcon name="ajout" /></button>
      <Note />

      {d && open && <Sheet key={open} id={open} />}
    </div>
  );
}

// Une annonce brève en bas de l'écran : semaine tenue, nouveau titre.
function Note() {
  const n = useNote();
  useEffect(() => {
    if (!n) return;
    const t = setTimeout(() => announce(null), n.action ? 6000 : 3600);
    return () => clearTimeout(t);
  }, [n]);
  if (!n) return null;
  return (
    <div className={`note${n.action ? " long" : ""}`} role="status" key={n.at}>
      {!n.action && <Moon streak={n.streak} n={9} />}
      <span>{n.text}</span>
      {n.action && <button type="button" className="note-act" onClick={n.action.run}>{n.action.label}</button>}
    </div>
  );
}
