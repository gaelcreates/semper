import { admin } from "./server";

// Relevé Instagram par l'API officielle de Meta (Business Discovery), interrogée avec le compte pro de Gael.
// Marche pour les comptes pro et créateur ; un compte perso ne renvoie rien.
// Ce que l'API donne : profil, abonnés, publications récentes avec vues, likes et commentaires. Pas la portée.
//
// Branchement : Gael colle une seule fois META_ACCESS_TOKEN (jeton utilisateur longue durée, droits instagram_basic,
// instagram_manage_insights, pages_show_list, pages_read_engagement). Au premier appel, on en tire l'identifiant de
// son compte Instagram et le jeton de sa page Facebook, qui n'expire pas, et on les garde dans meta_link.
const API = "https://graph.facebook.com/v23.0";
const FULL = "username,name,biography,profile_picture_url,followers_count,follows_count,media_count,media.limit(30){caption,like_count,comments_count,view_count,media_type,media_product_type,timestamp,permalink,media_url,thumbnail_url}";
const BASIC = "followers_count,media_count,media.limit(30){like_count,comments_count,media_type,timestamp,permalink}";

export type Post = { t: string; likes: number; comments: number; views: number | null; type: "reel" | "carrousel" | "photo"; link: string; img: string | null; caption: string };

type Media = {
  caption?: string; like_count?: number; comments_count?: number; view_count?: number; media_type?: string; media_product_type?: string;
  timestamp: string; permalink: string; media_url?: string; thumbnail_url?: string;
};

let cached: { id: string; token: string } | null = null;

// L'accès à Meta : gardé en base, sinon tiré du jeton collé par Gael. Null tant que rien n'est branché.
export async function metaLink() {
  if (cached) return cached;
  const a = admin();
  const { data } = await a.from("meta_link").select("ig_id, token").eq("id", 1).maybeSingle();
  if (data) return (cached = { id: data.ig_id, token: data.token });
  const user = process.env.META_ACCESS_TOKEN;
  if (!user) return null;
  const res = await fetch(`${API}/me/accounts?fields=access_token,instagram_business_account&access_token=${user}`, { cache: "no-store" });
  if (!res.ok) return null;
  const page = ((await res.json()).data ?? []).find((p: { instagram_business_account?: { id: string } }) => p.instagram_business_account);
  if (!page) return null;
  cached = { id: page.instagram_business_account.id, token: page.access_token };
  await a.from("meta_link").upsert({ id: 1, ig_id: cached.id, token: cached.token, updated_at: new Date().toISOString() });
  return cached;
}

async function ask(link: { id: string; token: string }, handle: string, fields: string) {
  const q = `business_discovery.username(${handle}){${fields}}`;
  const res = await fetch(`${API}/${link.id}?fields=${encodeURIComponent(q)}&access_token=${link.token}`, { cache: "no-store" });
  return res.ok ? (await res.json()).business_discovery ?? null : null;
}

export async function fetchIg(handle: string) {
  const link = await metaLink();
  if (!link || !/^[a-z0-9._]{1,30}$/i.test(handle)) return null;
  // Si Meta refuse un champ, on retombe sur l'essentiel plutôt que de ne rien avoir.
  const bd = (await ask(link, handle, FULL)) ?? (await ask(link, handle, BASIC));
  if (!bd) return null;
  const media: Media[] = bd.media?.data ?? [];
  const posts: Post[] = media.map((m) => ({
    t: m.timestamp, likes: m.like_count ?? 0, comments: m.comments_count ?? 0, views: m.view_count ?? null,
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
