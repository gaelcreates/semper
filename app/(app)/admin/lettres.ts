"use server";

import { admin, userFrom } from "../../server";

// Les lettres envoyées par Resend (broadcasts) et leurs chiffres, pour l'admin seulement.
// Resend ne donne pas de taux tout faits : on compte les destinataires par événement (livrés, ouverts, cliqués…),
// cent par page, avec une courte pause entre deux appels pour rester sous la limite de débit.

const KEY = () => process.env.RESEND_API_KEY ?? "";
const pause = (ms: number) => new Promise((r) => setTimeout(r, ms));
async function get<T>(path: string): Promise<T | null> {
  const r = await fetch(`https://api.resend.com${path}`, { headers: { Authorization: `Bearer ${KEY()}` }, cache: "no-store" }).catch(() => null);
  await pause(150);
  return r?.ok ? ((await r.json()) as T) : null;
}
async function isAdmin(token: string) {
  const user = await userFrom(token);
  if (!user) return false;
  const { data } = await admin().from("admins").select("user_id").eq("user_id", user.id).maybeSingle();
  return !!data;
}

export type Letter = { id: string; subject: string; status: string; sentAt: string | null; createdAt: string };
export async function listLetters(token: string): Promise<{ letters: Letter[]; tracking: { open: boolean; click: boolean } } | null> {
  if (!(await isAdmin(token)) || !KEY()) return null;
  const list = await get<{ data: { id: string; name: string; status: string; sent_at: string | null; created_at: string }[] }>("/broadcasts");
  const letters: Letter[] = [];
  for (const b of (list?.data ?? []).slice(0, 30)) {
    const d = await get<{ subject: string | null }>(`/broadcasts/${b.id}`);
    letters.push({ id: b.id, subject: d?.subject || b.name || "Sans objet", status: b.status, sentAt: b.sent_at, createdAt: b.created_at });
  }
  letters.sort((a, b) => (b.sentAt ?? b.createdAt).localeCompare(a.sentAt ?? a.createdAt));
  const doms = await get<{ data: { name: string; open_tracking?: boolean; click_tracking?: boolean }[] }>("/domains");
  const dom = doms?.data.find((x) => x.name === "trysemper.app");
  return { letters, tracking: { open: !!dom?.open_tracking, click: !!dom?.click_tracking } };
}

const TYPES = ["sent", "delivered", "opened", "clicked", "bounced", "unsubscribed"] as const;
export type LetterStats = Record<(typeof TYPES)[number], number> & { links: { url: string; clicks: number; unique: number }[] };
export async function letterStats(token: string, id: string): Promise<LetterStats | null> {
  if (!(await isAdmin(token)) || !KEY() || !/^[\w-]+$/.test(id)) return null;
  const out = { links: [] } as unknown as LetterStats;
  for (const t of TYPES) {
    let n = 0, after = "";
    for (let page = 0; page < 60; page++) {
      const r = await get<{ data: { id: string }[]; has_more: boolean }>(`/broadcasts/${id}/recipients?type=${t}&limit=100${after ? `&after=${after}` : ""}`);
      if (!r) break;
      n += r.data.length;
      if (!r.has_more || !r.data.length) break;
      after = r.data[r.data.length - 1].id;
    }
    out[t] = n;
  }
  const links = await get<{ data: { url: string; clicks: number; unique_clicks: number }[] }>(`/broadcasts/${id}/clicked-links?limit=5`);
  out.links = (links?.data ?? []).map((l) => ({ url: l.url, clicks: l.clicks, unique: l.unique_clicks }));
  return out;
}
