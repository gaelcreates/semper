"use server";

import { admin } from "../server";
import { addToAudience, issueCode, verifyCode } from "./codes";

// Connexion par code à 6 chiffres (voir codes.ts). Supabase n'ouvre la session qu'une fois le code vérifié.
export type Sent = { ok: true } | { ok: false; code: "wait" | "no_account" | "error" };
export type Checked = { ok: true; hash: string } | { ok: false; code: "wrong" | "expired" | "too_many" | "error" };
type Meta = { first_name: string; handle: string; rythme: number; answers: Record<string, unknown> };

const clean = (raw: string) => raw.trim().toLowerCase();

export async function sendCode(raw: string, meta?: Meta): Promise<Sent> {
  const email = clean(raw);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email) || !process.env.RESEND_API_KEY || !process.env.SUPABASE_SECRET_KEY) return { ok: false, code: "error" };
  const a = admin();

  // Toute adresse saisie rejoint l'audience Resend, compte créé ou non.
  await addToAudience(email, meta?.first_name);

  // Nouveau compte seulement depuis l'inscription, et seulement une fois l'outil ouvert (SEMPER_OPEN=1).
  // Fermé, seuls les comptes existants peuvent se connecter.
  const { data: known } = await a.from("profiles").select("id").eq("email", email).maybeSingle();
  if (!known) {
    if (!meta || process.env.SEMPER_OPEN !== "1") return { ok: false, code: "no_account" };
    const { data: last } = await a.from("login_codes").select("created_at").eq("email", email).maybeSingle();
    if (last && Date.now() - new Date(last.created_at).getTime() < 55_000) return { ok: false, code: "wait" };
    const { error } = await a.auth.admin.createUser({ email, email_confirm: true, user_metadata: meta });
    if (error) return { ok: false, code: "error" };
  }

  const r = await issueCode(email);
  return r === "ok" ? { ok: true } : { ok: false, code: r };
}

// Vérifie le code ; s'il est bon, rend le jeton que la page échange contre une session Supabase.
export async function checkCode(raw: string, code: string): Promise<Checked> {
  const email = clean(raw);
  const r = await verifyCode(email, code);
  if (r !== "ok") return { ok: false, code: r };
  const { data, error } = await admin().auth.admin.generateLink({ type: "magiclink", email });
  const hash = data?.properties?.hashed_token;
  return error || !hash ? { ok: false, code: "error" } : { ok: true, hash };
}
