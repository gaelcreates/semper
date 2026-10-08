"use server";

import { admin, userFrom } from "../server";
import { metaLink, snapshot } from "../instagram";

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
  if (p?.email) await a.from("login_codes").delete().eq("email", p.email);
  const handle = p?.handle?.toLowerCase();
  if (handle) {
    const { count } = await a.from("profiles").select("id", { count: "exact", head: true }).ilike("handle", handle);
    if (!count) await a.from("ig_snapshots").delete().eq("handle", handle);
  }
  return true;
}
