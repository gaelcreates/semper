"use client";

import { useEffect, useState } from "react";
import DotIcon from "../DotIcon";

// Installer Semper, proposé seulement dans l'espace (jamais sur la vitrine).
// Mac : l'app à télécharger (DMG). Chrome, Edge et Android : la fenêtre d'installation du navigateur.
// iPhone : le geste exact. Rien quand Semper est déjà installé ou ouvert dans l'app Mac.
type Prompt = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };
let deferred: Prompt | null = null;
const subs = new Set<() => void>();
if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (e) => { e.preventDefault(); deferred = e as Prompt; subs.forEach((f) => f()); });
  window.addEventListener("appinstalled", () => { deferred = null; subs.forEach((f) => f()); });
}

type Kind = "mac" | "prompt" | "ios" | null;

export default function Install({ className = "" }: { className?: string }) {
  const [kind, setKind] = useState<Kind>(null);
  const [help, setHelp] = useState(false);

  useEffect(() => {
    const pick = () => {
      const ua = navigator.userAgent;
      const standalone = matchMedia("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone;
      const ios = /iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
      const mac = /Macintosh/.test(ua) && !ios;
      setKind(standalone || /SemperMac/.test(ua) ? null : mac ? "mac" : deferred ? "prompt" : ios ? "ios" : null);
    };
    pick();
    subs.add(pick);
    return () => { subs.delete(pick); };
  }, []);

  if (!kind) return null;

  async function go() {
    if (kind !== "prompt") return setHelp(true);
    await deferred!.prompt();
    deferred = null;
    setKind(null);
  }

  return (
    <div className={`install ${className}`}>
      {kind === "mac" ? (
        <a className="install-btn" href="/telecharger/Semper.dmg" download onClick={() => setHelp(true)}><DotIcon name="fleche" /> Télécharger pour Mac</a>
      ) : (
        <button type="button" className="install-btn" onClick={go}><DotIcon name="fleche" /> Installer l&apos;app</button>
      )}
      {help && kind === "mac" && (
        <ol className="install-help">
          <li>Ouvre <b>Semper.dmg</b>, glisse Semper dans <b>Applications</b>.</li>
          <li>Au premier lancement, macOS le bloque : <b>Réglages Système</b>, <b>Confidentialité et sécurité</b>, puis <b>Ouvrir quand même</b>. Une seule fois.</li>
        </ol>
      )}
      {help && kind === "ios" && (
        <p className="install-help">Touche le bouton <b>Partager</b> (le carré avec la flèche), puis <b>Sur l&apos;écran d&apos;accueil</b>.</p>
      )}
    </div>
  );
}
