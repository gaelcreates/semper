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
