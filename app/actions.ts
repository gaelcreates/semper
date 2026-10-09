"use server";

import { allow, ip } from "./limit";
import { addToAudience } from "./(start)/codes";

export type JoinState = { ok: boolean; message: string } | null;

// Inscription à la liste d'attente : l'adresse est ajoutée à l'audience Resend si elle n'y est pas.
// Une adresse déjà présente n'est pas touchée (un désabonné le reste), et la réponse est la même.
// Variables attendues : RESEND_API_KEY et RESEND_AUDIENCE_ID.
export async function join(_prev: JoinState, form: FormData): Promise<JoinState> {
  // Champ piège : seuls les robots le remplissent.
  if (form.get("site")) return { ok: true, message: "C'est noté. Tu es sur la liste." };

  const email = String(form.get("email") ?? "").trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
    return { ok: false, message: "Vérifie ton adresse e-mail." };
  }

  if (!process.env.RESEND_API_KEY || !process.env.RESEND_AUDIENCE_ID) {
    return { ok: false, message: "Les inscriptions ouvrent dans quelques heures. Reviens vite." };
  }

  // Vingt inscriptions par heure et par adresse IP.
  if (!(await allow(`join:${await ip()}`, 20, 3600)) || !(await addToAudience(email))) {
    return { ok: false, message: "Ça n'a pas marché. Réessaie dans un instant." };
  }
  return { ok: true, message: "C'est noté. Tu es sur la liste." };
}
