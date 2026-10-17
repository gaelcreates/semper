"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { usePathname } from "next/navigation";
import DotIcon from "../DotIcon";
import { announce } from "./store";
import { sendFeedback } from "./actions";
import { sb } from "../supabase";

// Le bouton feedback de l'espace : une petite fenêtre, un texte, Envoyer. Le retour part en base et par e-mail.
export default function Feedback({ row = false }: { row?: boolean }) {
  const path = usePathname();
  const [open, setOpen] = useState(false);
  const [t, setT] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (!open) return;
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    window.addEventListener("keydown", esc);
    return () => window.removeEventListener("keydown", esc);
  }, [open]);

  async function send() {
    if (!t.trim()) return;
    setBusy(true);
    const token = (await sb().auth.getSession()).data.session?.access_token ?? "";
    const ok = await sendFeedback(token, t, path).catch(() => false);
    setBusy(false);
    if (!ok) return announce("Pas envoyé. Réessaie dans un moment.");
    setT(""); setOpen(false);
    announce("Merci, c'est lu.");
  }

  return (
    <>
      {row
        ? <button type="button" className="ws-fb-row" onClick={() => setOpen(true)}><DotIcon name="avis" />Feedback</button>
        : <button type="button" className="theme ws-fb" onClick={() => setOpen(true)} aria-label="Donner un feedback"><DotIcon name="avis" /></button>}
      {open && createPortal(
        <div className="veil jeu-veil" onPointerDown={(e) => e.target === e.currentTarget && setOpen(false)}>
          <div className="jeu" role="dialog" aria-modal="true" aria-label="Feedback">
            <button type="button" className="x jeu-x" onClick={() => setOpen(false)} aria-label="Fermer"><DotIcon name="croix" /></button>
            <header className="jeu-head"><span className="lbl">Feedback</span><h2>Qu&apos;est-ce qu&apos;on améliore&nbsp;?</h2></header>
            <div className="jeu-stage">
              <textarea className="inp long" rows={5} autoFocus maxLength={2000} value={t} onChange={(e) => setT(e.target.value)} placeholder="Un bug, une idée, ce qui te manque…" />
              <div className="jeu-act"><button type="button" className="btn" disabled={busy || !t.trim()} onClick={send}>{busy ? "Envoi…" : "Envoyer"}</button></div>
            </div>
          </div>
        </div>,
        document.querySelector(".ws") ?? document.body,
      )}
    </>
  );
}
