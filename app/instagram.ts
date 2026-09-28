import { admin } from "./server";

// Relevé Instagram par l'API officielle de Meta (Business Discovery), interrogée avec le compte pro de Gael.
// Marche pour les comptes pro et créateur ; un compte perso ne renvoie rien. Variables : META_IG_USER_ID, META_ACCESS_TOKEN.
// Ce que l'API donne : profil, abonnés, publications récentes avec likes et commentaires. Pas les vues ni la portée.
const API = "https://graph.facebook.com/v23.0";
const FULL = "username,name,biography,profile_picture_url,followers_count,follows_count,media_count,media.limit(30){caption,like_count,comments_count,media_type,media_product_type,timestamp,permalink,media_url,thumbnail_url}";
const BASIC = "followers_count,media_count,media.limit(30){like_count,comments_count,media_type,timestamp,permalink}";

export type Post = { t: string; likes: number; comments: number; type: "reel" | "carrousel" | "photo"; link: string; img: string | null; caption: string };

type Media = {
  caption?: string; like_count?: number; comments_count?: number; media_type?: string; media_product_type?: string;
  timestamp: string; permalink: string; media_url?: string; thumbnail_url?: string;
};

async function ask(handle: string, fields: string) {
  const id = process.env.META_IG_USER_ID, token = process.env.META_ACCESS_TOKEN;
  const q = `business_discovery.username(${handle}){${fields}}`;
  const res = await fetch(`${API}/${id}?fields=${encodeURIComponent(q)}&access_token=${token}`, { cache: "no-store" });
  return res.ok ? (await res.json()).business_discovery ?? null : null;
}

export async function fetchIg(handle: string) {
  if (!process.env.META_IG_USER_ID || !process.env.META_ACCESS_TOKEN || !/^[a-z0-9._]{1,30}$/i.test(handle)) return null;
  // Si Meta refuse un champ, on retombe sur l'essentiel plutôt que de ne rien avoir.
  const bd = (await ask(handle, FULL)) ?? (await ask(handle, BASIC));
  if (!bd) return null;
  const media: Media[] = bd.media?.data ?? [];
  const posts: Post[] = media.map((m) => ({
    t: m.timestamp, likes: m.like_count ?? 0, comments: m.comments_count ?? 0,
    type: m.media_product_type === "REELS" || m.media_type === "VIDEO" ? "reel" : m.media_type === "CAROUSEL_ALBUM" ? "carrousel" : "photo",
    link: m.permalink, img: m.thumbnail_url ?? (m.media_type !== "VIDEO" ? m.media_url ?? null : null), caption: (m.caption ?? "").slice(0, 160),
  }));
  const avg = (k: "likes" | "comments") => (posts.length ? Math.round(posts.reduce((a, p) => a + p[k], 0) / posts.length) : 0);
  return {
    followers: bd.followers_count ?? 0, media: bd.media_count ?? 0, avg_likes: avg("likes"), avg_comments: avg("comments"),
    profile: { name: bd.name ?? "", bio: bd.biography ?? "", picture: bd.profile_picture_url ?? null, follows: bd.follows_count ?? null },
    posts,
  };
}

// Un relevé par compte et par jour : relancer le même jour remplace le chiffre.
export async function snapshot(handle: string) {
  const s = await fetchIg(handle);
  if (!s) return null;
  const day = new Date().toISOString().slice(0, 10);
  await admin().from("ig_snapshots").upsert({ handle: handle.toLowerCase(), day, ...s });
  return { followers: s.followers };
}
