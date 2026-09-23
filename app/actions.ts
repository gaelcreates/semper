"use server";

export type JoinState = { ok: boolean; message: string } | null;

// Inscription à la liste d'attente : l'adresse est ajoutée à l'audience Resend.
// Variables attendues : RESEND_API_KEY et RESEND_AUDIENCE_ID.
export async function join(_prev: JoinState, form: FormData): Promise<JoinState> {
  // Champ piège : seuls les robots le remplissent.
  if (form.get("site")) return { ok: true, message: "C'est noté. Tu seras prévenu à l'ouverture." };

  const email = String(form.get("email") ?? "").trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
    return { ok: false, message: "Vérifie ton adresse e-mail." };
  }

  const key = process.env.RESEND_API_KEY;
  const audience = process.env.RESEND_AUDIENCE_ID;
  if (!key || !audience) {
    return { ok: false, message: "Les inscriptions ouvrent dans quelques heures. Reviens vite." };
  }

  const res = await fetch(`https://api.resend.com/audiences/${audience}/contacts`, {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ email, unsubscribed: false }),
  });

  if (!res.ok) return { ok: false, message: "Ça n'a pas marché. Réessaie dans un instant." };
  return { ok: true, message: "C'est noté. Tu seras prévenu à l'ouverture." };
}

export type LoginState = { ok: boolean; message: string } | null;

// Connexion par lien envoyé par e-mail. Tant que l'espace membre n'est pas branché
// (pas de SUPABASE_URL), la page répond honnêtement que la connexion n'est pas encore ouverte.
export async function login(_prev: LoginState, form: FormData): Promise<LoginState> {
  if (form.get("site")) return { ok: true, message: "Regarde ta boîte mail." };

  const email = String(form.get("email") ?? "").trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
    return { ok: false, message: "Vérifie ton adresse e-mail." };
  }

  if (!process.env.SUPABASE_URL) {
    return { ok: false, message: "L'espace Semper n'est pas encore ouvert. Rejoins la liste pour être prévenu." };
  }

  return { ok: true, message: "Regarde ta boîte mail, ton lien de connexion arrive." };
}
