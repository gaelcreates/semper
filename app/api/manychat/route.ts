import { addToAudience } from "../../(start)/codes";

// Relais ManyChat vers Resend : l'action « External Request » de ManyChat (offre Pro) envoie ici
// l'adresse donnée en message privé, au format {"email": "...", "first_name": "..."}.
// Même ajout que l'inscription : une adresse déjà présente n'est pas touchée, un désabonné le reste.
export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const email = String(body?.email ?? "").trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) return Response.json({ ok: false }, { status: 400 });
  await addToAudience(email, String(body?.first_name ?? "").trim() || undefined);
  return Response.json({ ok: true });
}
