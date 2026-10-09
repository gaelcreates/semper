"use server";

import { admin, userFrom } from "../server";
import { metaLink, snapshot } from "../instagram";
import { addToAudience, issueCode, moveInAudience, verifyCode } from "../(start)/codes";
import { allow, ip } from "../limit";

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
