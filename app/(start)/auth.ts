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

// Pourquoi un code n'est pas parti. wait : un code il y a moins d'une minute. hour : dix demandes
// dans l'heure depuis cette connexion. day : dix codes en 24 heures pour cette adresse.
export type SendFail = "wait" | "hour" | "day" | "no_account" | "error";
// Pourquoi un code est refusé. too_many : cinq essais sur ce code. locked : dix essais dans l'heure sur l'adresse.
export type CheckFail = "wrong" | "expired" | "too_many" | "locked" | "error";

const AGAIN = "Ça n'a pas marché. Vérifie ta connexion internet, puis réessaie.";

// Réponse de l'envoi du code (send.ts) en phrase claire.
export function sendError(code: SendFail) {
  if (code === "wait") return "Un code vient de partir. Attends une minute avant d'en demander un autre.";
  if (code === "hour") return "Trop de demandes. Réessaie dans une heure.";
  if (code === "day") return "Trop de codes aujourd'hui. Réessaie demain.";
  if (code === "no_account") return "Aucun compte avec cette adresse. Vérifie l'orthographe, ou crée ton espace.";
  return AGAIN;
}

// Réponse de la vérification du code (send.ts) en phrase claire.
export function checkError(code: CheckFail) {
  if (code === "wrong") return "Ce code ne correspond pas. Prends celui du dernier e-mail reçu.";
  if (code === "expired") return "Ce code a expiré. Demande-en un nouveau.";
  if (code === "too_many") return "Trop d'essais. Demande un nouveau code.";
  if (code === "locked") return "Trop d'essais. Réessaie dans une heure.";
  return AGAIN;
}
