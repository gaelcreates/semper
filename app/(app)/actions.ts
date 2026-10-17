"use server";

import { admin, userFrom } from "../server";
import { igRead, igSyncUser, metaLink, snapshot } from "../instagram";
import { cleanHandle } from "./lib";
import type { IgPost } from "./jour";
import { addToAudience, issueCode, moveInAudience, verifyCode } from "../(start)/codes";
import { allow, ip } from "../limit";
import { createHash, randomBytes } from "crypto";
import { headers } from "next/headers";
import { site } from "../site";

// Relevé Instagram immédiat pour la personne connectée (au premier passage ou quand elle change de pseudo).
// « off » : Semper n'est pas encore relié à Meta. « absent » : le compte ne renvoie rien (perso, mauvais pseudo).
// Le relevé du jour déjà pris suffit ; sinon trois appels à Meta par heure et par compte au plus
// (de quoi corriger une faute dans le pseudo, pas de quoi vider le quota partagé).
// « later » : cette limite est atteinte, rien à reprocher au pseudo.
export async function refreshInstagram(token: string): Promise<"ok" | "off" | "absent" | "later"> {
  const user = await userFrom(token);
  if (!user) return "absent";
  if (!(await metaLink())) return "off";
  const a = admin();
  const { data } = await a.from("profiles").select("handle").eq("id", user.id).single();
  const handle = data?.handle?.toLowerCase();
  if (!handle) return "absent";
  const { data: today } = await a.from("ig_snapshots").select("day").eq("handle", handle).eq("day", new Date().toISOString().slice(0, 10)).maybeSingle();
  if (today) return "ok";
  if (!(await allow(`ig:${user.id}`, 3, 3600))) return "later";
  return (await snapshot(handle)) ? "ok" : "absent";
}

// Suppression du compte par la personne elle-même : le compte, ses contenus, son activité et sa ligne de
// prospection partent ensemble (cascade), ses fichiers aussi. Ses relevés Instagram, si personne d'autre n'a ce pseudo.
export async function deleteAccount(token: string): Promise<boolean> {
  const user = await userFrom(token);
  if (!user) return false;
  const a = admin();
  const { data: p } = await a.from("profiles").select("handle, email").eq("id", user.id).single();
  const { error } = await a.auth.admin.deleteUser(user.id);
  if (error) return false;
  const { data: files } = await a.storage.from("avatars").list(user.id);
  if (files?.length) await a.storage.from("avatars").remove(files.map((f) => `${user.id}/${f.name}`));
  if (p?.email) await a.from("login_codes").delete().eq("email", p.email);
  const handle = p?.handle?.toLowerCase();
  if (handle) {
    const { count } = await a.from("profiles").select("id", { count: "exact", head: true }).ilike("handle", handle);
    if (!count) await a.from("ig_snapshots").delete().eq("handle", handle);
  }
  return true;
}

// Changer d'adresse : un code part sur la nouvelle adresse, l'adresse ne change qu'une fois le code tapé.
const valid = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(e);
// Mêmes refus que la connexion (voir SendFail et CheckFail dans (start)/auth.ts).
export type EmailStep = "ok" | "wait" | "hour" | "day" | "taken" | "invalid" | "wrong" | "expired" | "too_many" | "locked" | "error";

export async function requestEmail(token: string, raw: string): Promise<EmailStep> {
  const user = await userFrom(token);
  const email = raw.trim().toLowerCase();
  if (!user) return "error";
  if (!valid(email) || email === user.email) return "invalid";
  // Même limite que la connexion : dix codes par heure et par adresse IP.
  const hour = await allow(`code:${await ip()}`, 10, 3600);
  if (!hour) return hour === null ? "error" : "hour";
  const { data: taken } = await admin().from("profiles").select("id").eq("email", email).limit(1).maybeSingle();
  if (taken) return "taken";
  return issueCode(email);
}

export async function confirmEmail(token: string, raw: string, code: string): Promise<EmailStep> {
  const user = await userFrom(token);
  const email = raw.trim().toLowerCase();
  if (!user || !valid(email)) return "error";
  const { r } = await verifyCode(email, code);
  if (r !== "ok") return r;
  const a = admin();
  const { error } = await a.auth.admin.updateUserById(user.id, { email, email_confirm: true });
  if (error) return /already/i.test(error.message) ? "taken" : "error";
  const { data: p } = await a.from("profiles").update({ email }).eq("id", user.id).select("first_name").single();
  // La lettre suit l'adresse : même choix d'abonnement, l'ancienne quitte l'audience.
  if (user.email) await moveInAudience(user.email.toLowerCase(), email, p?.first_name);
  else await addToAudience(email, p?.first_name);
  return "ok";
}

// Connecteur Claude : une adresse personnelle (api/mcp/<jeton>). Le jeton n'est montré qu'une fois, à la création ;
// la base n'en garde que l'empreinte. En recréer une révoque l'ancienne.
export async function claudeState(token: string): Promise<{ on: boolean; used: string | null } | null> {
  const user = await userFrom(token);
  if (!user) return null;
  const { data } = await admin().from("mcp_tokens").select("used_at").eq("user_id", user.id).maybeSingle();
  return { on: !!data, used: data?.used_at ?? null };
}
export async function claudeCreate(token: string): Promise<string | null> {
  const user = await userFrom(token);
  if (!user || !(await allow(`mcp-new:${user.id}`, 10, 3600))) return null;
  const secret = `smp_${randomBytes(32).toString("base64url")}`;
  const hash = createHash("sha256").update(secret).digest("hex");
  const { error } = await admin().from("mcp_tokens").upsert({ user_id: user.id, hash, created_at: new Date().toISOString(), used_at: null });
  if (error) return null;
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "trysemper.app";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}/api/mcp/${secret}`;
}
export async function claudeRevoke(token: string): Promise<boolean> {
  const user = await userFrom(token);
  if (!user) return false;
  const { error } = await admin().from("mcp_tokens").delete().eq("user_id", user.id);
  return !error;
}

// ---------- Instagram relié, pour vérifier les publications
// 1. La personne donne son pseudo : un code lui est donné, à coller dans sa bio.
// 2. Semper lit la bio : le code y est, le compte est à elle. Ses publications sont relevées et reliées au calendrier.
// Personne ne peut relier une publication à la main dans la base : seul ce fichier écrit ig_links et ig_post.
type Row = Record<string, unknown>;
export type IgStep = { state: "ok" | "off" | "absent" | "nocode" | "later" | "error"; link?: Row | null; rows?: Row[] };

export async function igStart(token: string, raw: string): Promise<Row | null> {
  const user = await userFrom(token);
  const handle = cleanHandle(raw).toLowerCase();
  if (!user || !handle || !(await allow(`ig-start:${user.id}`, 10, 3600))) return null;
  const code = `SMP-${String(randomBytes(2).readUInt16BE(0) % 9000 + 1000)}`;
  const a = admin();
  const { data } = await a.from("ig_links").upsert({ user_id: user.id, handle, code, verified_at: null, synced_at: null, posts: [] }).select("*").single();
  await a.from("profiles").update({ handle }).eq("id", user.id);
  return data;
}

export async function igCheck(token: string): Promise<IgStep> {
  const user = await userFrom(token);
  if (!user) return { state: "error" };
  if (!(await allow(`ig-check:${user.id}`, 10, 3600))) return { state: "later" };
  const a = admin();
  const { data: l } = await a.from("ig_links").select("*").eq("user_id", user.id).maybeSingle();
  if (!l) return { state: "error" };
  const r = await igRead(l.handle);
  if (r === "off") return { state: "off" };
  if (!r) return { state: "absent" };
  if (!r.bio.toUpperCase().includes(l.code)) return { state: "nocode" };
  await a.from("ig_links").update({ verified_at: new Date().toISOString() }).eq("user_id", user.id);
  return igSyncUser(user.id);
}

// Relevé à la demande (« Vérifier maintenant », ouverture de l'espace) : douze par heure au plus.
export async function igSync(token: string): Promise<IgStep> {
  const user = await userFrom(token);
  if (!user) return { state: "error" };
  if (!(await allow(`ig-sync:${user.id}`, 12, 3600))) return { state: "later" };
  return igSyncUser(user.id);
}

// Relier une vidéo à une publication choisie par la personne, même si la date ne colle pas.
export async function igLink(token: string, contentId: string, postId: string): Promise<Row | null> {
  const user = await userFrom(token);
  if (!user) return null;
  const a = admin();
  const { data: l } = await a.from("ig_links").select("verified_at, posts").eq("user_id", user.id).maybeSingle();
  const post = (l?.posts as IgPost[] | undefined)?.find((p) => p.id === postId);
  if (!l?.verified_at || !post) return null;
  const { data: other } = await a.from("contents").select("id").eq("user_id", user.id).eq("ig_post->>id", postId).neq("id", contentId).limit(1);
  if (other?.length) return null;
  const { data: c } = await a.from("contents").select("published_at").eq("id", contentId).eq("user_id", user.id).maybeSingle();
  if (!c) return null;
  const { data } = await a.from("contents").update({ ig_post: post, published_at: c.published_at ?? post.at, updated_at: new Date().toISOString() })
    .eq("id", contentId).eq("user_id", user.id).select("*").single();
  return data;
}

export async function igForget(token: string): Promise<boolean> {
  const user = await userFrom(token);
  if (!user) return false;
  const { error } = await admin().from("ig_links").delete().eq("user_id", user.id);
  return !error;
}

// Un retour écrit depuis l'espace : gardé en base (lu dans l'admin), puis envoyé par e-mail à Semper.
// Dix par heure et par compte au plus. Un e-mail qui échoue ne fait pas échouer l'envoi : le retour est en base.
export async function sendFeedback(token: string, body: string, page: string): Promise<boolean> {
  const user = await userFrom(token);
  const text = body.trim().slice(0, 2000);
  if (!user || !text) return false;
  if (!(await allow(`feedback:${user.id}`, 10, 3600))) return false;
  const where = page.replace(/[^\w/-]/g, "").slice(0, 80) || null;
  const { error } = await admin().from("feedback").insert({ user_id: user.id, email: user.email ?? null, body: text, page: where });
  if (error) return false;
  const key = process.env.RESEND_API_KEY;
  if (key) {
    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: "Semper <contact@trysemper.app>", to: site.contactEmail, subject: `Feedback · ${user.email ?? "Semper"}`, text: `${text}\n\n${user.email ?? ""} · ${where ?? ""}` }),
    }).catch(() => null);
  }
  return true;
}
