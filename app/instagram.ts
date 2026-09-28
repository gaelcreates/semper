import { admin } from "./server";

// Relevé Instagram par l'API officielle de Meta (Business Discovery), interrogée avec le compte pro de Gael.
// Marche pour les comptes pro et créateur ; un compte perso ne renvoie rien. Variables : META_IG_USER_ID, META_ACCESS_TOKEN.
const API = "https://graph.facebook.com/v23.0";

export type Snapshot = { followers: number; media: number; avg_likes: number; avg_comments: number };

export async function fetchIg(handle: string): Promise<Snapshot | null> {
  const id = process.env.META_IG_USER_ID, token = process.env.META_ACCESS_TOKEN;
  if (!id || !token || !/^[a-z0-9._]{1,30}$/i.test(handle)) return null;
  const fields = `business_discovery.username(${handle}){followers_count,media_count,media.limit(12){like_count,comments_count}}`;
  const res = await fetch(`${API}/${id}?fields=${encodeURIComponent(fields)}&access_token=${token}`, { cache: "no-store" });
  if (!res.ok) return null;
  const bd = (await res.json()).business_discovery;
  if (!bd) return null;
  const media: { like_count?: number; comments_count?: number }[] = bd.media?.data ?? [];
  const avg = (k: "like_count" | "comments_count") => (media.length ? Math.round(media.reduce((a, m) => a + (m[k] ?? 0), 0) / media.length) : 0);
  return { followers: bd.followers_count ?? 0, media: bd.media_count ?? 0, avg_likes: avg("like_count"), avg_comments: avg("comments_count") };
}

// Un relevé par compte et par jour : relancer le même jour remplace le chiffre.
export async function snapshot(handle: string) {
  const s = await fetchIg(handle);
  if (!s) return null;
  const day = new Date().toISOString().slice(0, 10);
  await admin().from("ig_snapshots").upsert({ handle: handle.toLowerCase(), day, ...s });
  return s;
}
