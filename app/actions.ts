"use server";

import { allow, ip } from "./limit";
import { admin } from "./server";
import { addToAudience } from "./(start)/codes";

export type JoinState = { ok: boolean; message: string } | null;

// Inscription à la liste d'attente. L'adresse est d'abord gardée dans la base (table waitlist, avec sa source),
// puis ajoutée à l'audience Resend si elle n'y est pas. Resend refuse au-delà de 10 appels par seconde :
// on réessaie deux fois, et ce qui n'est pas passé part au passage quotidien (api/instagram). Rien n'est perdu.
// Une adresse déjà présente n'est pas touchée (un désabonné le reste), et la réponse est la même.
// Variables attendues : RESEND_API_KEY et RESEND_AUDIENCE_ID.
const OK = { ok: true, message: "C'est noté. Tu es sur la liste." };
const pause = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function join(_prev: JoinState, form: FormData): Promise<JoinState> {
  // Champ piège : seuls les robots le remplissent.
  if (form.get("site")) return OK;

  const email = String(form.get("email") ?? "").trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email) || email.length > 254) {
    return { ok: false, message: "Vérifie ton adresse e-mail." };
  }
  // D'où vient la personne (?ref= ou ?utm_source= dans le lien, sinon le site d'où elle arrive).
  const source = String(form.get("src") ?? "").replace(/[^\w.\-:/ ]/g, "").slice(0, 80) || null;

  // Vingt inscriptions par heure et par adresse IP. Si la limite elle-même est en panne, on laisse passer.
  if ((await allow(`join:${await ip()}`, 20, 3600)) === false) {
    return { ok: false, message: "Trop d'essais depuis cette connexion. Réessaie dans une heure." };
  }

  const a = admin();
  const { error } = await a.from("waitlist").upsert({ email, source }, { onConflict: "email", ignoreDuplicates: true });
  let synced = false;
  for (let i = 0; i < 3 && !synced; i++) {
    if (i) await pause(400 * i);
    synced = await addToAudience(email);
  }
  if (synced) await a.from("waitlist").update({ synced_at: new Date().toISOString() }).eq("email", email);
  if (error && !synced) return { ok: false, message: "Ça n'a pas marché. Réessaie dans un instant." };
  return OK;
}
