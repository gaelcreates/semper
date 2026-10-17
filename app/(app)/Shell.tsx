"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import Logo from "../Logo";
import DotIcon from "../DotIcon";
import ThemeToggle from "../ThemeToggle";
import Sheet from "./Sheet";
import Moon from "./Moon";
import Lune from "./Lune";
import Feedback from "./Feedback";
import { moonDays, moonState, phaseName, toFix } from "./jour";
import { igSync } from "./actions";
import Orbit from "../Orbit";
import Install from "./Install";
import Avatar from "./Avatar";
import { announce, applyRows, createContent, load, loadDemo, needsSync, openSheet, openedSheet, setIg, tick, useData, useNote, useOpen } from "./store";
import { DEMO_FRAME, demoData } from "./demo";
import { sb } from "../supabase";

const nav = [
  { href: "/aujourdhui", label: "Aujourd'hui", icon: "jour" },
  { href: "/calendrier", label: "Calendrier", icon: "cal" },
  { href: "/idees", label: "Idées", icon: "idees" },
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
  // Dans la vitrine (iframe « semper-demo »), l'espace tourne sur des données de démo, sans compte ni base.
  const [demo] = useState(() => typeof window !== "undefined" && window.name === DEMO_FRAME);
  const start = () => {
    if (demo) return loadDemo(demoData());
    load().then(async (r) => {
      if (r === "none") return router.replace("/connexion");
      setFail(r === "ok" ? null : r);
      // Instagram relié et pas relevé depuis un moment : on relève avant de clore les jours écoulés,
      // pour qu'une publication d'hier compte bien pour hier.
      if (r === "ok" && needsSync()) {
        const t = (await sb().auth.getSession()).data.session?.access_token ?? "";
        const res = await Promise.race([igSync(t).catch(() => null), new Promise<null>((ok) => setTimeout(() => ok(null), 8000))]);
        if (res?.link) setIg(res.link);
        if (res?.rows?.length) applyRows(res.rows);
        tick();
      }
    });
  };
  useEffect(() => { start(); }, [router]); // eslint-disable-line react-hooks/exhaustive-deps
  const ready = !!d;
  useEffect(() => { if (ready && !demo) sb().rpc("is_admin").then(({ data }) => setAdmin(data === true)); }, [ready, demo]);
  // La démo suit le thème choisi sur la vitrine, et laisse la page défiler une fois le calendrier au bout.
  useEffect(() => {
    if (!demo) return;
    document.documentElement.classList.add("demo");
    const sync = (e: StorageEvent) => { if (e.key === "theme") document.documentElement.dataset.theme = e.newValue === "dark" ? "dark" : "light"; };
    window.addEventListener("storage", sync);
    return () => window.removeEventListener("storage", sync);
  }, [demo]);
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

  const g = d?.game;
  // Les vidéos qui attendent une réponse (publication pas trouvée) : une pastille sur Aujourd'hui.
  const fix = d ? toFix(d.contents, d.ig).length : 0;
  const count = (href: string) => (href === "/aujourdhui" && fix > 0 ? <b className="ws-cnt disp">{fix}</b> : null);
  const days = g ? moonDays(g) : 0;
  const title = g ? (g.broken ? "Fissurée" : phaseName(g.moon)) : "";

  return (
    <div className="ws">
      <aside className="ws-side">
        <Link href="/aujourdhui" className="brand" aria-label="Semper"><Logo /></Link>
        <button type="button" className="btn ws-new" onClick={newContent}><DotIcon name="ajout" /> Nouveau contenu</button>
        <nav className="ws-nav">
          {links.map((n) => (
            <Link key={n.href} href={n.href} className={path.startsWith(n.href) ? "on" : ""}><DotIcon name={n.icon} />{n.label}{count(n.href)}</Link>
          ))}
        </nav>
        <Install />
        {!demo && d && <Feedback row />}
        {d && (
          <Link href="/profil" className={`ws-me${path.startsWith("/profil") ? " on" : ""}`}>
            <Avatar />
            <span><b>{d.profile.firstName || "Mon profil"}</b><small>{d.profile.handle ? `@${d.profile.handle}` : d.profile.email}</small></span>
          </Link>
        )}
        <div className="ws-foot">
          <Link href="/aujourdhui" className="ws-streak" aria-label={`${title}, ${days} jours d'affilée`}>
            {g && <Lune n={days} state={moonState(g)} />}
            <span><b>{title}</b><span className="lbl">{days} j.</span></span>
          </Link>
          <ThemeToggle />
        </div>
      </aside>

      <header className="ws-top">
        <Link href="/aujourdhui" className="brand" aria-label="Semper"><Logo /></Link>
        <span className="ws-top-r">
          <Link href="/aujourdhui" className="ws-top-moon" aria-label={`${title}, ${days} jours d'affilée`}>{g && <Lune n={days} state={moonState(g)} />}</Link>
          {!demo && d && <Feedback />}
          <ThemeToggle />
          {d && <Link href="/profil" aria-label="Profil"><Avatar size={40} /></Link>}
        </span>
      </header>

      <main className="ws-main">
        {d ? children : fail ? (
          <span className="ws-wait off"><b>{fail === "offline" ? "Hors ligne" : "Serveur indisponible"}</b><button type="button" className="btn btn-ghost" onClick={() => { setFail(null); start(); }}>Réessayer</button></span>
        ) : <span className="ws-wait"><Orbit size={28} /></span>}
      </main>

      <nav className="ws-tabs">
        {links.map((n) => <Link key={n.href} href={n.href} className={path.startsWith(n.href) ? "on" : ""}><DotIcon name={n.icon} /><span>{n.label}</span>{count(n.href)}</Link>)}
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
