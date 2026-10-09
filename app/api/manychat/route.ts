import { addToAudience } from "../../(start)/codes";
import { allow, ip } from "../../limit";

// Relais ManyChat vers Resend : l'action « External Request » de ManyChat (offre Pro) envoie ici
// l'adresse donnée en message privé, au format {"email": "...", "first_name": "..."}.
// Même ajout que l'inscription : une adresse déjà présente n'est pas touchée, un désabonné le reste.
export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const email = String(body?.email ?? "").trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) return Response.json({ ok: false }, { status: 400 });
  // Les appels viennent des serveurs de ManyChat (quelques IP partagées) : limite large, contre l'abus seulement.
  if (!(await allow(`manychat:${await ip()}`, 300, 3600))) return Response.json({ ok: false }, { status: 429 });
  // ok vaut true seulement si l'adresse est vraiment dans Resend : le test de ManyChat le vérifie de bout en bout.
  const ok = await addToAudience(email, String(body?.first_name ?? "").trim() || undefined);
  return Response.json({ ok }, { status: ok ? 200 : 502 });
}
