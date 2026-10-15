import { timingSafeEqual } from "crypto";
import { admin } from "../../server";
import { igSyncUser, snapshot } from "../../instagram";
import { addToAudience } from "../../(start)/codes";

// Le passage quotidien, lancé par le cron de Vercel (vercel.json) avec CRON_SECRET :
// 1. filet de sécurité Resend : les comptes des 3 derniers jours sont (re)mis dans l'audience, au cas où l'ajout
//    de l'inscription aurait échoué (Resend ne crée pas de doublon) ;
// 2. waitlist : les inscriptions que Resend avait refusées sont envoyées ;
// 3. relevé Instagram de tous les comptes ;
// 4. comptes reliés : leurs publications sont relevées et reliées au calendrier (vérification).
// Le secret se compare en temps constant : la durée de la réponse ne dit rien de sa valeur.
// Assez de temps pour les relevés et le rattrapage de la waitlist (150 adresses au plus par passage).
export const maxDuration = 60;

export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  const given = Buffer.from(req.headers.get("authorization") ?? ""), want = Buffer.from(`Bearer ${secret}`);
  if (!secret || given.length !== want.length || !timingSafeEqual(given, want)) return new Response("Non", { status: 401 });
  const since = new Date(Date.now() - 3 * 864e5).toISOString();
  const { data: recent } = await admin().from("profiles").select("email, first_name").gte("created_at", since);
  for (const p of recent ?? []) { await addToAudience(p.email, p.first_name); await new Promise((r) => setTimeout(r, 600)); }
  // Waitlist : ce que Resend avait refusé (trop d'appels, panne) part maintenant, au plus 10 par seconde.
  const { data: wait } = await admin().from("waitlist").select("email").is("synced_at", null).order("created_at").limit(150);
  let rattrapes = 0;
  for (const w of wait ?? []) {
    if (await addToAudience(w.email)) { await admin().from("waitlist").update({ synced_at: new Date().toISOString() }).eq("email", w.email); rattrapes++; }
    await new Promise((r) => setTimeout(r, 250));
  }
  const { data } = await admin().from("profiles").select("handle").neq("handle", "");
  const handles = [...new Set((data ?? []).map((p) => p.handle.toLowerCase()))];
  let ok = 0;
  for (const h of handles) if (await snapshot(h)) ok++;
  const { data: links } = await admin().from("ig_links").select("user_id").not("verified_at", "is", null);
  let relies = 0;
  for (const l of links ?? []) relies += (await igSyncUser(l.user_id)).rows.length;
  return Response.json({ resend: recent?.length ?? 0, waitlist: rattrapes, comptes: handles.length, releves: ok, verifies: links?.length ?? 0, relies });
}
