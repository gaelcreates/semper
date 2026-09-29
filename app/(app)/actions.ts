"use server";

import { admin, userFrom } from "../server";
import { snapshot } from "../instagram";

// Relevé Instagram immédiat pour la personne connectée (au premier passage ou quand elle change de pseudo).
export async function refreshInstagram(token: string) {
  const user = await userFrom(token);
  if (!user) return null;
  const { data } = await admin().from("profiles").select("handle").eq("id", user.id).single();
  return data?.handle ? snapshot(data.handle.toLowerCase()) : null;
}
