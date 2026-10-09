import { createHash, randomInt } from "crypto";
import { admin } from "../server";
import { allow } from "../limit";

// Les codes à 6 chiffres, côté serveur seulement (pas une action appelable depuis le navigateur).
// Servent à la connexion (send.ts) et au changement d'adresse (actions de l'espace).
// Gardés seulement sous forme chiffrée, valables une heure, 5 essais par code, un envoi par minute.
// Par adresse : 10 essais par heure (un renvoi ne remet pas à zéro) et 10 codes par jour.
const digest = (email: string, code: string) => createHash("sha256").update(`${email}:${code}`).digest("hex");

// Les réponses de l'inscription, gardées avec le code jusqu'à ce qu'il soit tapé.
export type Meta = { first_name: string; handle: string; rythme: number; answers: Record<string, unknown> };
// too_many : 5 essais sur ce code, un nouveau code repart à zéro. locked : 10 essais dans l'heure sur l'adresse.
export type Verdict = "ok" | "wrong" | "expired" | "too_many" | "locked" | "error";

// wait : un code est parti il y a moins d'une minute. day : 10 codes en 24 heures pour cette adresse.
export async function issueCode(email: string, meta: Meta | null = null): Promise<"ok" | "wait" | "day" | "error"> {
  const key = process.env.RESEND_API_KEY;
  if (!key) return "error";
  const a = admin();
  const { data: last } = await a.from("login_codes").select("created_at").eq("email", email).maybeSingle();
  if (last && Date.now() - new Date(last.created_at).getTime() < 55_000) return "wait";
  const today = await allow(`envoi:${email}`, 10, 86_400);
  if (!today) return today === null ? "error" : "day";
  const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
  const now = new Date();
  const { error } = await a.from("login_codes").upsert({
    email, hash: digest(email, code), created_at: now.toISOString(), expires_at: new Date(now.getTime() + 3600_000).toISOString(), attempts: 0, meta,
  });
  if (error) return "error";
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

// Bon code : la ligne part et rend les réponses de l'inscription (null pour une connexion ou un changement d'adresse).
export async function verifyCode(email: string, code: string): Promise<{ r: Verdict; meta?: Meta | null }> {
  const hour = await allow(`essai:${email}`, 10, 3600);
  if (!hour) return { r: hour === null ? "error" : "locked" };
  const a = admin();
  const { data: row } = await a.from("login_codes").select("*").eq("email", email).maybeSingle();
  if (!row) return { r: "expired" };
  if (row.attempts >= 5) return { r: "too_many" };
  if (new Date(row.expires_at).getTime() < Date.now()) return { r: "expired" };
  if (row.hash !== digest(email, code.replace(/\D/g, ""))) {
    await a.from("login_codes").update({ attempts: row.attempts + 1 }).eq("email", email);
    return { r: "wrong" };
  }
  await a.from("login_codes").delete().eq("email", email);
  return { r: "ok", meta: row.meta };
}

// L'audience Resend (les abonnés de la lettre), null sans les variables.
function audience() {
  const key = process.env.RESEND_API_KEY, id = process.env.RESEND_AUDIENCE_ID;
  if (!key || !id) return null;
  const url = `https://api.resend.com/audiences/${id}/contacts`;
  return { url, at: (email: string) => `${url}/${encodeURIComponent(email)}`, headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" } };
}

// Ajoute l'adresse à l'audience Resend si elle n'y est pas. Une adresse déjà présente n'est pas touchée :
// quelqu'un qui s'est désabonné de la lettre le reste, même s'il se connecte ou crée un compte.
// Faux seulement si Resend n'a pas répondu comme prévu.
export async function addToAudience(email: string, firstName?: string) {
  const r = audience();
  if (!r) return false;
  try {
    const known = await fetch(r.at(email), { headers: r.headers });
    if (known.status !== 404) return known.ok;
    const res = await fetch(r.url, { method: "POST", headers: r.headers, body: JSON.stringify({ email, first_name: firstName || undefined }) });
    return res.ok;
  } catch {
    return false;
  }
}

// Changement d'adresse : la nouvelle garde le choix de l'ancienne (désabonnée si l'ancienne l'était,
// jamais réabonnée si elle l'était déjà), puis l'ancienne quitte l'audience.
export async function moveInAudience(from: string, to: string, firstName?: string) {
  const r = audience();
  if (!r) return false;
  try {
    const old = await fetch(r.at(from), { headers: r.headers });
    if (!old.ok && old.status !== 404) return false;
    const off = old.ok && (await old.json()).unsubscribed === true;
    const known = await fetch(r.at(to), { headers: r.headers });
    if (!known.ok && known.status !== 404) return false;
    const res = !known.ok
      ? await fetch(r.url, { method: "POST", headers: r.headers, body: JSON.stringify({ email: to, first_name: firstName || undefined, unsubscribed: off }) })
      : off && (await known.json()).unsubscribed !== true
        ? await fetch(r.at(to), { method: "PATCH", headers: r.headers, body: JSON.stringify({ unsubscribed: true }) })
        : known;
    // L'ancienne ne part qu'une fois la nouvelle en place : un désabonnement ne se perd jamais en route.
    if (!res.ok) return false;
    return old.ok ? (await fetch(r.at(from), { method: "DELETE", headers: r.headers })).ok : true;
  } catch {
    return false;
  }
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
