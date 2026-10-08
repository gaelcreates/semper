import { admin } from "../../server";
import { snapshot } from "../../instagram";
import { addToAudience } from "../../(start)/codes";

// Le passage quotidien, lancé par le cron de Vercel (vercel.json) avec CRON_SECRET :
// 1. filet de sécurité Resend : les comptes des 3 derniers jours sont (re)mis dans l'audience, au cas où l'ajout
//    de l'inscription aurait échoué (Resend ne crée pas de doublon) ;
// 2. relevé Instagram de tous les comptes.
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) return new Response("Non", { status: 401 });
  const since = new Date(Date.now() - 3 * 864e5).toISOString();
  const { data: recent } = await admin().from("profiles").select("email, first_name").gte("created_at", since);
  for (const p of recent ?? []) { await addToAudience(p.email, p.first_name); await new Promise((r) => setTimeout(r, 600)); }
  const { data } = await admin().from("profiles").select("handle").neq("handle", "");
  const handles = [...new Set((data ?? []).map((p) => p.handle.toLowerCase()))];
  let ok = 0;
  for (const h of handles) if (await snapshot(h)) ok++;
  return Response.json({ resend: recent?.length ?? 0, comptes: handles.length, releves: ok });
}
