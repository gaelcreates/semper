"use server";

import { createHash, randomInt } from "crypto";
import { admin } from "../server";

// Les codes de connexion sont faits maison : 6 chiffres, gardés seulement sous forme chiffrée, valables une heure,
// 5 essais au plus. Envoyés par Resend depuis trysemper.app. Supabase n'ouvre la session qu'une fois le code vérifié.
export type Sent = { ok: true } | { ok: false; code: "wait" | "no_account" | "error" };
export type Checked = { ok: true; hash: string } | { ok: false; code: "wrong" | "expired" | "too_many" | "error" };
type Meta = { first_name: string; handle: string; rythme: number; answers: Record<string, unknown> };

const digest = (email: string, code: string) => createHash("sha256").update(`${email}:${code}`).digest("hex");
const clean = (raw: string) => raw.trim().toLowerCase();

export async function sendCode(raw: string, meta?: Meta): Promise<Sent> {
  const email = clean(raw);
  const key = process.env.RESEND_API_KEY;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email) || !key || !process.env.SUPABASE_SECRET_KEY) return { ok: false, code: "error" };
  const a = admin();

  // Toute adresse saisie rejoint l'audience Resend, compte créé ou non.
  await addToAudience(email, meta?.first_name);

  // Un code par minute et par adresse.
  const { data: last } = await a.from("login_codes").select("created_at").eq("email", email).maybeSingle();
  if (last && Date.now() - new Date(last.created_at).getTime() < 55_000) return { ok: false, code: "wait" };

  // Nouveau compte seulement depuis l'inscription, et seulement une fois l'outil ouvert (SEMPER_OPEN=1).
  // Fermé, seuls les comptes existants peuvent se connecter.
  const { data: known } = await a.from("profiles").select("id").eq("email", email).maybeSingle();
  if (!known) {
    if (!meta || process.env.SEMPER_OPEN !== "1") return { ok: false, code: "no_account" };
    const { error } = await a.auth.admin.createUser({ email, email_confirm: true, user_metadata: meta });
    if (error) return { ok: false, code: "error" };
  }

  const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
  const now = new Date();
  await a.from("login_codes").upsert({
    email, hash: digest(email, code), created_at: now.toISOString(), expires_at: new Date(now.getTime() + 3600_000).toISOString(), attempts: 0,
  });

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: "Semper <connexion@trysemper.app>",
      to: email,
      subject: `${code} est ton code Semper`,
      text: `Ton code Semper : ${code}\n\nTape-le sur la page Semper restée ouverte. Il marche une heure.\nSi tu n'as rien demandé, ignore ce message.`,
      html: mail(code),
    }),
  });
  return res.ok ? { ok: true } : { ok: false, code: "error" };
}

// Vérifie le code ; s'il est bon, rend le jeton que la page échange contre une session Supabase.
export async function checkCode(raw: string, code: string): Promise<Checked> {
  const email = clean(raw);
  const a = admin();
  const { data: row } = await a.from("login_codes").select("*").eq("email", email).maybeSingle();
  if (!row) return { ok: false, code: "expired" };
  if (row.attempts >= 5) return { ok: false, code: "too_many" };
  if (new Date(row.expires_at).getTime() < Date.now()) return { ok: false, code: "expired" };
  if (row.hash !== digest(email, code.replace(/\D/g, ""))) {
    await a.from("login_codes").update({ attempts: row.attempts + 1 }).eq("email", email);
    return { ok: false, code: "wrong" };
  }
  await a.from("login_codes").delete().eq("email", email);
  const { data, error } = await a.auth.admin.generateLink({ type: "magiclink", email });
  const hash = data?.properties?.hashed_token;
  return error || !hash ? { ok: false, code: "error" } : { ok: true, hash };
}

async function addToAudience(email: string, firstName?: string) {
  const key = process.env.RESEND_API_KEY, audience = process.env.RESEND_AUDIENCE_ID;
  if (!key || !audience) return;
  await fetch(`https://api.resend.com/audiences/${audience}/contacts`, {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ email, first_name: firstName || undefined, unsubscribed: false }),
  }).catch(() => {});
}

// L'e-mail : papier clair, le code en grand, trois lignes utiles. Rien d'autre.
function mail(code: string) {
  return `<!doctype html><html lang="fr"><body style="margin:0;background:#f5f5f5;font-family:Helvetica,Arial,sans-serif;color:#0e0e0e">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f5;padding:40px 16px"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background:#ffffff;border-radius:20px;padding:36px 32px">
<tr><td style="font-size:20px;font-weight:900;letter-spacing:-0.5px">semper</td></tr>
<tr><td style="padding-top:28px;font-size:15px;color:#4a4a47">Ton code pour entrer :</td></tr>
<tr><td style="padding:10px 0 4px;font-family:'Courier New',monospace;font-size:40px;font-weight:700;letter-spacing:10px">${code.slice(0, 3)} ${code.slice(3)}</td></tr>
<tr><td style="padding-top:18px;font-size:14px;line-height:1.6;color:#4a4a47">Tape-le sur la page Semper restée ouverte. Il marche une heure, et seul le dernier code reçu est valable.</td></tr>
<tr><td style="padding-top:24px;border-top:1px solid #eeeeee;font-size:12px;color:#7d7d78">Tu n'as rien demandé ? Ignore ce message, personne ne peut entrer sans ce code.</td></tr>
</table></td></tr></table></body></html>`;
}
