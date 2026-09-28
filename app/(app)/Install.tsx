"use client";

import { useEffect, useState } from "react";
import DotIcon from "../DotIcon";

// Installer Semper comme une application. Chrome, Edge et Android proposent la fenêtre d'installation ;
// iPhone et Safari n'en ont pas, alors on montre le geste exact, en une phrase.
type Prompt = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };
let deferred: Prompt | null = null;
const subs = new Set<() => void>();
if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (e) => { e.preventDefault(); deferred = e as Prompt; subs.forEach((f) => f()); });
  window.addEventListener("appinstalled", () => { deferred = null; subs.forEach((f) => f()); });
}

type Kind = "prompt" | "ios" | "mac" | null;

export default function Install({ className = "" }: { className?: string }) {
  const [kind, setKind] = useState<Kind>(null);
  const [help, setHelp] = useState(false);

  useEffect(() => {
    const pick = () => {
      const standalone = matchMedia("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone;
      const ua = navigator.userAgent;
      const ios = /iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
      const safariMac = /Macintosh/.test(ua) && /Safari/.test(ua) && !/Chrome|Chromium|Edg|Firefox/.test(ua);
      setKind(standalone ? null : deferred ? "prompt" : ios ? "ios" : safariMac ? "mac" : null);
    };
    pick();
    subs.add(pick);
    return () => { subs.delete(pick); };
  }, []);

  if (!kind) return null;

  async function go() {
    if (kind !== "prompt") return setHelp(!help);
    await deferred!.prompt();
    deferred = null;
    setKind(null);
  }

  return (
    <div className={`install ${className}`}>
      <button type="button" className="install-btn" onClick={go}><DotIcon name="fleche" /> Installer l&apos;app</button>
      {help && (
        <p className="install-help">
          {kind === "ios"
            ? <>Touche le bouton <b>Partager</b> (le carré avec la flèche), puis <b>Sur l&apos;écran d&apos;accueil</b>.</>
            : <>Dans la barre du haut : menu <b>Fichier</b>, puis <b>Ajouter au Dock</b>.</>}
        </p>
      )}
    </div>
  );
}
