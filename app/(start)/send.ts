"use server";

import { admin } from "../server";

// Le code de connexion part de chez nous, par Resend, depuis trysemper.app : on maîtrise l'e-mail
// (le code dans l'objet, aux couleurs de Semper) et on n'a rien à régler dans Supabase.
// Supabase fabrique le code (sans l'envoyer), la page le vérifie ensuite avec verifyOtp.
export type Sent = { ok: true } | { ok: false; code: "wait" | "no_account" | "error" };
type Meta = { first_name: string; handle: string; rythme: number; answers: Record<string, unknown> };

export async function sendCode(raw: string, meta?: Meta): Promise<Sent> {
  const email = raw.trim().toLowerCase();
  const key = process.env.RESEND_API_KEY;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email) || !key || !process.env.SUPABASE_SECRET_KEY) return { ok: false, code: "error" };
  const a = admin();

  // Un code par minute et par adresse.
  const { data: last } = await a.from("code_sends").select("at").eq("email", email).maybeSingle();
  if (last && Date.now() - new Date(last.at).getTime() < 55_000) return { ok: false, code: "wait" };

  // Nouveau compte seulement depuis l'inscription ; la connexion ne crée rien.
  const { data: known } = await a.from("profiles").select("id").eq("email", email).maybeSingle();
  if (!known) {
    if (!meta) return { ok: false, code: "no_account" };
    const { error } = await a.auth.admin.createUser({ email, email_confirm: true, user_metadata: meta });
    if (error) return { ok: false, code: "error" };
  }

  const { data, error } = await a.auth.admin.generateLink({ type: "magiclink", email });
  const otp = data?.properties?.email_otp;
  if (error || !otp) return { ok: false, code: "error" };

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: "Semper <connexion@trysemper.app>",
      to: email,
      subject: `${otp} est ton code Semper`,
      text: `Ton code Semper : ${otp}\n\nTape-le sur la page Semper restée ouverte. Il marche une heure.\nSi tu n'as rien demandé, ignore ce message.`,
      html: mail(otp),
    }),
  });
  if (!res.ok) return { ok: false, code: "error" };
  await a.from("code_sends").upsert({ email, at: new Date().toISOString() });
  return { ok: true };
}

// L'e-mail : papier clair, le code en grand, trois lignes utiles. Rien d'autre.
function mail(otp: string) {
  return `<!doctype html><html lang="fr"><body style="margin:0;background:#f5f5f5;font-family:Helvetica,Arial,sans-serif;color:#0e0e0e">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f5;padding:40px 16px"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background:#ffffff;border-radius:20px;padding:36px 32px">
<tr><td style="font-size:20px;font-weight:900;letter-spacing:-0.5px">semper</td></tr>
<tr><td style="padding-top:28px;font-size:15px;color:#4a4a47">Ton code pour entrer :</td></tr>
<tr><td style="padding:10px 0 4px;font-family:'Courier New',monospace;font-size:36px;font-weight:700;letter-spacing:8px">${otp.replace(/(\d{4})(?=\d)/g, "$1 ")}</td></tr>
<tr><td style="padding-top:18px;font-size:14px;line-height:1.6;color:#4a4a47">Tape-le sur la page Semper restée ouverte. Il marche une heure, et seul le dernier code reçu est valable.</td></tr>
<tr><td style="padding-top:24px;border-top:1px solid #eeeeee;margin-top:24px;font-size:12px;color:#7d7d78">Tu n'as rien demandé ? Ignore ce message, personne ne peut entrer sans ce code.</td></tr>
</table></td></tr></table></body></html>`;
}
