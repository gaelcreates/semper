import { createHash, randomInt } from "crypto";
import { admin } from "../server";

// Les codes à 6 chiffres, côté serveur seulement (pas une action appelable depuis le navigateur).
// Servent à la connexion (send.ts) et au changement d'adresse (actions de l'espace).
// Gardés seulement sous forme chiffrée, valables une heure, 5 essais au plus, un envoi par minute.
const digest = (email: string, code: string) => createHash("sha256").update(`${email}:${code}`).digest("hex");

export async function issueCode(email: string): Promise<"ok" | "wait" | "error"> {
  const key = process.env.RESEND_API_KEY;
  if (!key) return "error";
  const a = admin();
  const { data: last } = await a.from("login_codes").select("created_at").eq("email", email).maybeSingle();
  if (last && Date.now() - new Date(last.created_at).getTime() < 55_000) return "wait";
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
  return res.ok ? "ok" : "error";
}

export async function verifyCode(email: string, code: string): Promise<"ok" | "wrong" | "expired" | "too_many"> {
  const a = admin();
  const { data: row } = await a.from("login_codes").select("*").eq("email", email).maybeSingle();
  if (!row) return "expired";
  if (row.attempts >= 5) return "too_many";
  if (new Date(row.expires_at).getTime() < Date.now()) return "expired";
  if (row.hash !== digest(email, code.replace(/\D/g, ""))) {
    await a.from("login_codes").update({ attempts: row.attempts + 1 }).eq("email", email);
    return "wrong";
  }
  await a.from("login_codes").delete().eq("email", email);
  return "ok";
}

// Ajoute l'adresse à l'audience Resend si elle n'y est pas. Une adresse déjà présente n'est pas touchée :
// quelqu'un qui s'est désabonné de la lettre le reste, même s'il se connecte ou crée un compte.
// Renvoie true quand l'adresse est bien dans l'audience (déjà présente ou ajoutée).
export async function addToAudience(email: string, firstName?: string): Promise<boolean> {
  const key = process.env.RESEND_API_KEY, audience = process.env.RESEND_AUDIENCE_ID;
  if (!key || !audience) return false;
  const url = `https://api.resend.com/audiences/${audience}/contacts`;
  const headers = { Authorization: `Bearer ${key}`, "Content-Type": "application/json" };
  try {
    const known = await fetch(`${url}/${encodeURIComponent(email)}`, { headers });
    if (known.ok) return true;
    const res = await fetch(url, { method: "POST", headers, body: JSON.stringify({ email, first_name: firstName || undefined }) });
    return res.ok;
  } catch { return false; }
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
