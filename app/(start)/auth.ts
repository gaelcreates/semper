// Ce qui évite de perdre les gens à l'entrée : fautes de frappe dans l'adresse, messages d'erreur clairs.

export const CODE_LEN = 6;
export const validEmail = (s: string) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(s.trim());

const DOMAINS = [
  "gmail.com", "hotmail.com", "hotmail.fr", "hotmail.ch", "outlook.com", "outlook.fr", "live.fr", "yahoo.com", "yahoo.fr",
  "icloud.com", "me.com", "bluewin.ch", "gmx.ch", "gmx.fr", "sunrise.ch", "orange.fr", "free.fr", "sfr.fr", "laposte.net", "protonmail.com", "proton.me",
];

function distance(a: string, b: string) {
  const d = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++)
    for (let j = 1; j <= b.length; j++)
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  return d[a.length][b.length];
}

// « gmial.com », « gmail.co », « hotmail » : on propose la bonne adresse.
export function suggest(email: string) {
  const [local, domain] = email.trim().toLowerCase().split("@");
  if (!local || !domain || DOMAINS.includes(domain)) return null;
  let best: string | null = null, score = 3;
  for (const x of DOMAINS) {
    const s = Math.min(distance(domain, x), distance(domain, x.split(".")[0]) === 0 ? 0 : 9);
    if (s < score) { score = s; best = x; }
  }
  return best ? `${local}@${best}` : null;
}

export function authError(e: { status?: number; code?: string; message?: string } | null) {
  if (!e) return "";
  if (e.status === 429 || e.code === "over_email_send_rate_limit") return "Trop de demandes d'un coup. Attends une minute, puis réessaie.";
  if (e.code === "otp_expired") return "Code incorrect ou expiré. Prends le code du dernier e-mail reçu, ou demande-en un nouveau.";
  if (e.code === "otp_disabled" || /signups not allowed/i.test(e.message ?? "")) return "Aucun compte avec cette adresse. Vérifie l'orthographe, ou crée ton espace.";
  return "Ça n'a pas marché. Vérifie ta connexion internet, puis réessaie.";
}
