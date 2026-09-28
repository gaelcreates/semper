import { admin } from "../../server";
import { snapshot } from "../../instagram";

// Relevé quotidien de tous les comptes, lancé par le cron de Vercel (vercel.json) avec CRON_SECRET.
export async function GET(req: Request) {
  if (req.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) return new Response("Non", { status: 401 });
  const { data } = await admin().from("profiles").select("handle").neq("handle", "");
  const handles = [...new Set((data ?? []).map((p) => p.handle.toLowerCase()))];
  let ok = 0;
  for (const h of handles) if (await snapshot(h)) ok++;
  return Response.json({ comptes: handles.length, releves: ok });
}
