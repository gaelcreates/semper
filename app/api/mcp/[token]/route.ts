import { createHash } from "crypto";
import { admin } from "../../../server";
import { allow } from "../../../limit";
import { Oops, TOOLS } from "../tools";

// Le connecteur Claude (MCP, transport HTTP « streamable », sans session) : Claude envoie du JSON-RPC en POST,
// Semper répond en JSON. L'adresse est personnelle : le jeton qu'elle contient désigne le compte. Il n'est gardé
// que chiffré (mcp_tokens) et se révoque depuis le Profil. Pas de flux SSE : GET et DELETE répondent 405.

export const dynamic = "force-dynamic";

const VERSIONS = ["2025-11-25", "2025-06-18", "2025-03-26", "2024-11-05"];
const INSTRUCTIONS =
  "Semper est le calendrier éditorial du créateur : chaque vidéo a une date de publication et trois étapes (écriture, tournage, montage) posées à rebours. " +
  "Lis lire_organisation avant de remplir des champs ou un script. Les dates sont en heure locale, AAAA-MM-JJTHH:MM. " +
  "Avant de supprimer un contenu, un champ ou une structure, demande confirmation au créateur. " +
  "Semper ne publie rien sur les réseaux : il organise et compte les semaines tenues.";

type Msg = { jsonrpc?: string; id?: string | number | null; method?: string; params?: Record<string, unknown> };
const ok = (id: Msg["id"], result: unknown) => ({ jsonrpc: "2.0", id, result });
const fail = (id: Msg["id"], code: number, message: string) => ({ jsonrpc: "2.0", id: id ?? null, error: { code, message } });
const json = (body: unknown, status = 200) => Response.json(body, { status, headers: { "Cache-Control": "no-store" } });

async function owner(token: string) {
  if (!/^smp_[A-Za-z0-9_-]{30,60}$/.test(token)) return null;
  const hash = createHash("sha256").update(token).digest("hex");
  const { data } = await admin().from("mcp_tokens").select("user_id, used_at").eq("hash", hash).maybeSingle();
  if (!data) return null;
  // L'heure du dernier passage, au plus une écriture par heure : le Profil affiche « utilisé récemment ».
  if (!data.used_at || Date.now() - new Date(data.used_at).getTime() > 3600e3) await admin().from("mcp_tokens").update({ used_at: new Date().toISOString() }).eq("hash", hash);
  return { uid: data.user_id as string, key: hash.slice(0, 24) };
}

async function handle(m: Msg, uid: string): Promise<object | null> {
  if (m.id === undefined) return null; // notification (initialized, cancelled) : rien à répondre
  switch (m.method) {
    case "initialize": {
      const asked = String(m.params?.protocolVersion ?? "");
      return ok(m.id, {
        protocolVersion: VERSIONS.includes(asked) ? asked : VERSIONS[0],
        capabilities: { tools: { listChanged: false } },
        serverInfo: { name: "semper", title: "Semper", version: "1.1.0" },
        instructions: INSTRUCTIONS,
      });
    }
    case "ping": return ok(m.id, {});
    case "tools/list": return ok(m.id, { tools: TOOLS.map(({ run: _run, ...t }) => t) }); // eslint-disable-line @typescript-eslint/no-unused-vars
    case "tools/call": {
      const tool = TOOLS.find((t) => t.name === m.params?.name);
      if (!tool) return fail(m.id, -32602, `Outil inconnu : ${String(m.params?.name)}`);
      const args = (m.params?.arguments ?? {}) as Record<string, unknown>;
      try {
        const out = await tool.run({ uid }, args);
        return ok(m.id, { content: [{ type: "text", text: JSON.stringify(out, null, 1) }] });
      } catch (e) {
        const text = e instanceof Oops ? e.message : "Semper n'a pas pu répondre. Réessaie dans un instant.";
        if (!(e instanceof Oops)) console.error("mcp", tool.name, e);
        return ok(m.id, { content: [{ type: "text", text }], isError: true });
      }
    }
    default: return fail(m.id, -32601, `Méthode non prise en charge : ${String(m.method)}`);
  }
}

export async function POST(req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const who = await owner(token);
  if (!who) return json(fail(null, -32001, "Adresse Semper invalide ou révoquée. Crée une nouvelle adresse dans Semper, Profil, Claude."), 401);
  if (!(await allow(`mcp:${who.key}`, 600, 3600))) return json(fail(null, -32002, "Trop de demandes. Réessaie dans une heure."), 429);

  let body: unknown;
  try { body = await req.json(); } catch { return json(fail(null, -32700, "JSON illisible"), 400); }
  const batch = Array.isArray(body);
  const msgs = (batch ? body : [body]) as Msg[];
  if (!msgs.length || msgs.length > 20) return json(fail(null, -32600, "Requête vide ou trop grande"), 400);
  const out = (await Promise.all(msgs.map((m) => (m && typeof m === "object" ? handle(m, who.uid) : Promise.resolve(fail(null, -32600, "Requête invalide"))))))
    .filter((x): x is object => x !== null);
  if (!out.length) return new Response(null, { status: 202 });
  return json(batch ? out : out[0]);
}

const no = () => new Response(null, { status: 405, headers: { Allow: "POST" } });
export const GET = no;
export const DELETE = no;
