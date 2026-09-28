"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import Logo from "../Logo";
import DotIcon from "../DotIcon";
import ThemeToggle from "../ThemeToggle";
import Sheet from "./Sheet";
import { Stepper } from "./ui";
import { constance } from "./stats";
import { cleanHandle } from "./lib";
import { createContent, openSheet, setProfile, useData, useOpen } from "./store";

const nav = [
  { href: "/calendrier", label: "Calendrier", icon: "semaine" },
  { href: "/constance", label: "Constance", icon: "serie" },
  { href: "/profil", label: "Profil", icon: "reglages" },
] as const;

export const newContent = () => openSheet(createContent());

// La coque de l'espace : barre latérale (bureau), barre du haut et onglets du bas (téléphone),
// la fiche ouverte et l'accueil au premier passage.
export default function Shell({ children }: { children: React.ReactNode }) {
  const d = useData();
  const open = useOpen();
  const path = usePathname();

  // « N » crée un contenu, où qu'on soit, sauf pendant la saisie.
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (e.key !== "n" || e.metaKey || e.ctrlKey || e.altKey || t.closest("input, textarea, select, [contenteditable]")) return;
      e.preventDefault();
      newContent();
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, []);

  const streak = d ? constance(d).streak : 0;

  return (
    <div className="ws">
      <aside className="ws-side">
        <Link href="/calendrier" className="brand" aria-label="Semper"><Logo /></Link>
        <button type="button" className="btn ws-new" onClick={newContent}><DotIcon name="plus" /> Nouveau contenu</button>
        <nav className="ws-nav">
          {nav.map((n) => (
            <Link key={n.href} href={n.href} className={path.startsWith(n.href) ? "on" : ""}><DotIcon name={n.icon} />{n.label}</Link>
          ))}
        </nav>
        <div className="ws-foot">
          <Link href="/constance" className="ws-streak" aria-label={`Série : ${streak} semaines`}>
            <b className="disp">{streak}</b><span className="lbl">{streak > 1 ? "semaines" : "semaine"}</span>
          </Link>
          <ThemeToggle />
        </div>
      </aside>

      <header className="ws-top">
        <Link href="/calendrier" className="brand" aria-label="Semper"><Logo /></Link>
        <ThemeToggle />
      </header>

      <main className="ws-main">{d ? children : null}</main>

      <nav className="ws-tabs">
        {nav.map((n) => <Link key={n.href} href={n.href} className={path.startsWith(n.href) ? "on" : ""}><DotIcon name={n.icon} /><span>{n.label}</span></Link>)}
      </nav>
      <button type="button" className="ws-fab" onClick={newContent} aria-label="Nouveau contenu"><DotIcon name="plus" /></button>

      {d && open && <Sheet id={open} />}
      {d && !d.profile.onboarded && <Welcome />}
    </div>
  );
}

// Premier passage : deux réponses, puis le calendrier.
function Welcome() {
  const [handle, setHandle] = useState("");
  const [rythme, setRythme] = useState(2);
  return (
    <div className="veil">
      <form className="welcome" onSubmit={(e) => { e.preventDefault(); setProfile({ handle: cleanHandle(handle), rythme, onboarded: true }); }}>
        <Logo />
        <h1>Bienvenue.</h1>
        <label className="fld">
          <span className="lbl">Ton Instagram</span>
          <span className="at"><i>@</i><input value={handle} onChange={(e) => setHandle(e.target.value)} placeholder="pseudo" autoComplete="off" autoCapitalize="none" spellCheck={false} required autoFocus /></span>
        </label>
        <div className="fld">
          <span className="lbl">Vidéos par semaine</span>
          <Stepper label="Vidéos par semaine" value={rythme} onChange={setRythme} min={1} max={14} />
        </div>
        <button className="btn" type="submit" disabled={!cleanHandle(handle)}>Commencer</button>
      </form>
    </div>
  );
}
