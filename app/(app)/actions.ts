"use server";

import { admin, userFrom } from "../server";
import { metaLink, snapshot } from "../instagram";
import { addToAudience, issueCode, verifyCode } from "../(start)/codes";

// Relevé Instagram immédiat pour la personne connectée (au premier passage ou quand elle change de pseudo).
// « off » : Semper n'est pas encore relié à Meta. « absent » : le compte ne renvoie rien (perso, mauvais pseudo).
export async function refreshInstagram(token: string): Promise<"ok" | "off" | "absent"> {
  const user = await userFrom(token);
  if (!user) return "absent";
  if (!(await metaLink())) return "off";
  const { data } = await admin().from("profiles").select("handle").eq("id", user.id).single();
  return data?.handle && (await snapshot(data.handle.toLowerCase())) ? "ok" : "absent";
}

// Suppression du compte par la personne elle-même : le compte, ses contenus, son activité et sa ligne de
// prospection partent ensemble (cascade). Ses relevés Instagram aussi, si personne d'autre n'a ce pseudo.
export async function deleteAccount(token: string): Promise<boolean> {
  const user = await userFrom(token);
  if (!user) return false;
  const a = admin();
  const { data: p } = await a.from("profiles").select("handle, email").eq("id", user.id).single();
  const { error } = await a.auth.admin.deleteUser(user.id);
  if (error) return false;
  await a.storage.from("avatars").remove([`${user.id}/avatar.webp`]);
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
export type EmailStep = "ok" | "wait" | "taken" | "invalid" | "wrong" | "expired" | "too_many" | "error";

export async function requestEmail(token: string, raw: string): Promise<EmailStep> {
  const user = await userFrom(token);
  const email = raw.trim().toLowerCase();
  if (!user) return "error";
  if (!valid(email) || email === user.email) return "invalid";
  const { data: taken } = await admin().from("profiles").select("id").eq("email", email).maybeSingle();
  if (taken) return "taken";
  return issueCode(email);
}

export async function confirmEmail(token: string, raw: string, code: string): Promise<EmailStep> {
  const user = await userFrom(token);
  const email = raw.trim().toLowerCase();
  if (!user || !valid(email)) return "error";
  const r = await verifyCode(email, code);
  if (r !== "ok") return r;
  const a = admin();
  const { error } = await a.auth.admin.updateUserById(user.id, { email, email_confirm: true });
  if (error) return /already/i.test(error.message) ? "taken" : "error";
  const { data: p } = await a.from("profiles").update({ email }).eq("id", user.id).select("first_name").single();
  await addToAudience(email, p?.first_name);
  return "ok";
}
