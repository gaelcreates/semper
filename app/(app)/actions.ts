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

// Nouveau compte : l'adresse rejoint l'audience Resend (celle de la liste d'attente).
export async function syncSignup(token: string) {
  const user = await userFrom(token);
  const key = process.env.RESEND_API_KEY, audience = process.env.RESEND_AUDIENCE_ID;
  if (!user?.email || !key || !audience) return;
  await fetch(`https://api.resend.com/audiences/${audience}/contacts`, {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ email: user.email, first_name: user.user_metadata?.first_name || undefined, unsubscribed: false }),
  });
}
