// L'e-mail de bienvenue, envoyé une seule fois, juste après la création du compte (checkCode dans send.ts).
// Même papier que le mail du code : fond clair, carte blanche, « semper » en Black. Trois gestes, un bouton.
const APP = "https://trysemper.app/calendrier";
const IG = "https://www.instagram.com/gaelcreates/";

// Le prénom vient du formulaire d'inscription : échappé avant d'entrer dans le HTML.
const esc = (s: string) => s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

const STEPS = [
  "Dans <b>Organisation</b>, règle le temps de chaque étape.",
  "Ajoute ta première vidéo avec le bouton <b>+</b>. Donne-lui un jour de publication, ses étapes se posent dans ta semaine.",
  "Installe l'app depuis <b>Profil</b>, sur Mac ou sur ton téléphone.",
];

export function welcomeMail(prenom?: string) {
  const name = (prenom ?? "").replace(/\s+/g, " ").trim();
  const subject = name ? `${name}, bienvenue dans Semper` : "Bienvenue dans Semper";
  const hello = name ? `Salut ${name},` : "Salut,";
  const plain = (s: string) => s.replace(/<[^>]+>/g, "");

  const text = [
    hello,
    "",
    "Trois gestes pour démarrer :",
    "",
    ...STEPS.map((s, i) => `${i + 1}. ${plain(s)}`),
    "",
    `Ouvrir mon calendrier : ${APP}`,
    "",
    "Gael",
    "Créer, toujours.",
    "",
    "PS : une question ou une idée ? Tu peux m'écrire sur Instagram : @gaelcreates",
  ].join("\n");

  const steps = STEPS.map((s, i) => `<tr>
<td valign="top" style="width:28px;padding-top:14px;font-size:14px;font-weight:900;color:#0e0e0e">${i + 1}</td>
<td style="padding-top:14px;font-size:15px;line-height:1.55;color:#4a4a47">${s}</td></tr>`).join("");

  const html = `<!doctype html><html lang="fr"><body style="margin:0;background:#f5f5f5;font-family:Helvetica,Arial,sans-serif;color:#0e0e0e">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f5;padding:40px 16px"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background:#ffffff;border-radius:20px;padding:36px 32px">
<tr><td style="font-size:20px;font-weight:900;letter-spacing:-0.5px">semper</td></tr>
<tr><td style="padding-top:28px;font-size:15px;line-height:1.6;color:#0e0e0e">${esc(hello)}</td></tr>
<tr><td style="padding-top:12px;font-size:15px;line-height:1.6;color:#4a4a47">Trois gestes pour démarrer :</td></tr>
<tr><td style="padding-top:6px"><table role="presentation" width="100%" cellpadding="0" cellspacing="0">${steps}</table></td></tr>
<tr><td style="padding-top:30px"><a href="${APP}" style="display:inline-block;background:#0e0e0e;color:#ffffff;text-decoration:none;font-size:15px;font-weight:700;padding:16px 26px;border-radius:999px">Ouvrir mon calendrier</a></td></tr>
<tr><td style="padding-top:30px;font-size:15px;line-height:1.5;color:#0e0e0e"><b>Gael</b><br><span style="color:#7d7d78">Créer, toujours.</span></td></tr>
<tr><td style="padding-top:24px;border-top:1px solid #eeeeee;font-size:12px;line-height:1.6;color:#7d7d78">PS : une question ou une idée ? Tu peux m'écrire sur Instagram : <a href="${IG}" style="color:#0e0e0e">@gaelcreates</a></td></tr>
</table></td></tr></table></body></html>`;

  return { subject, html, text };
}

// Envoi par Resend, depuis l'adresse de Gael. Ne lève jamais : un échec ne doit pas gêner la connexion.
export async function sendWelcome(email: string, prenom?: string) {
  const key = process.env.RESEND_API_KEY;
  if (!key) return false;
  const { subject, html, text } = welcomeMail(prenom);
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: "Gael de Semper <bonjour@trysemper.app>", to: email, subject, html, text }),
    });
    if (!res.ok) console.error("bienvenue", res.status);
    return res.ok;
  } catch {
    return false;
  }
}
