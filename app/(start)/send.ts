"use server";

import { after } from "next/server";
import { admin } from "../server";
import { allow, ip } from "../limit";
import { addToAudience, issueCode, verifyCode, type Meta } from "./codes";
import { sendWelcome } from "./bienvenue";
import { cleanHandle } from "../(app)/lib";
import type { CheckFail, SendFail } from "./auth";

// Connexion par code à 6 chiffres (voir codes.ts). Supabase n'ouvre la session qu'une fois le code vérifié.
// Inscription : les réponses attendent avec le code, le compte n'est créé qu'une fois le code juste.
export type Sent = { ok: true } | { ok: false; code: SendFail };
export type Checked = { ok: true; hash: string } | { ok: false; code: CheckFail };

const clean = (raw: string) => raw.trim().toLowerCase();
const open = () => process.env.SEMPER_OPEN === "1";

// Les réponses viennent du navigateur : on ne garde que la forme attendue, en taille raisonnable.
// Pseudo nettoyé comme dans l'espace (la base refuse le reste), rythme de 1 à 14 vidéos par semaine.
function tidy(m: Meta): Meta | null {
  const answers = m.answers && typeof m.answers === "object" && !Array.isArray(m.answers) ? m.answers : {};
  const rythme = Math.min(14, Math.max(1, Math.round(Number(m.rythme)) || 2));
  const meta = { first_name: String(m.first_name ?? "").slice(0, 100), handle: cleanHandle(String(m.handle ?? "")), rythme, answers };
  return Buffer.byteLength(JSON.stringify(meta)) < 16_000 ? meta : null;
}

async function profileOf(email: string) {
  const { data } = await admin().from("profiles").select("first_name").eq("email", email).limit(1).maybeSingle();
  return data;
}

export async function sendCode(raw: string, meta?: Meta): Promise<Sent> {
  const email = clean(raw);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email) || !process.env.RESEND_API_KEY || !process.env.SUPABASE_SECRET_KEY) return { ok: false, code: "error" };
  // Dix demandes par heure et par adresse IP, adresses inconnues comprises.
  const hour = await allow(`code:${await ip()}`, 10, 3600);
  if (!hour) return { ok: false, code: hour === null ? "error" : "hour" };

  // Nouveau compte seulement depuis l'inscription, et seulement une fois l'outil ouvert (SEMPER_OPEN=1).
  // Fermé, seuls les comptes existants peuvent se connecter.
  let pending: Meta | null = null;
  if (!(await profileOf(email))) {
    if (!meta || !open()) return { ok: false, code: "no_account" };
    pending = tidy(meta);
    if (!pending) return { ok: false, code: "error" };
  }

  const r = await issueCode(email, pending);
  return r === "ok" ? { ok: true } : { ok: false, code: r };
}

// Vérifie le code ; s'il est bon, crée le compte si c'est une inscription, puis rend le jeton
// que la page échange contre une session Supabase. L'adresse rejoint l'audience Resend à ce moment-là.
export async function checkCode(raw: string, code: string): Promise<Checked> {
  const email = clean(raw);
  const { r, meta } = await verifyCode(email, code);
  if (r !== "ok") return { ok: false, code: r };
  const a = admin();
  const known = await profileOf(email);
  if (!known) {
    if (!meta || !open()) return { ok: false, code: "error" };
    const { error } = await a.auth.admin.createUser({ email, email_confirm: true, user_metadata: meta });
    if (error && !/already/i.test(error.message)) return { ok: false, code: "error" };
    // Compte tout neuf (pas « déjà là ») : le mail de bienvenue part après la réponse, sans la retarder.
    if (!error) after(() => sendWelcome(email, meta.first_name));
  }
  await addToAudience(email, known?.first_name || meta?.first_name);
  const { data, error } = await a.auth.admin.generateLink({ type: "magiclink", email });
  const hash = data?.properties?.hashed_token;
  return error || !hash ? { ok: false, code: "error" } : { ok: true, hash };
}
