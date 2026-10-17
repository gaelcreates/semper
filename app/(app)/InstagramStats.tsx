"use client";

import { useEffect, useState } from "react";
import { refreshInstagram } from "./actions";
import { sb } from "../supabase";
import { DAYS, MONTHS_SHORT, addDays, dayKey } from "./lib";
import { useData } from "./store";
import type { Post } from "../instagram";

type Snap = {
  day: string; followers: number | null; media: number | null; avg_likes: number | null; avg_comments: number | null;
  profile: { name: string; bio: string; picture: string | null; follows: number | null } | null; posts: Post[] | null;
};

const num = (n: number) => String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, " ");
const signed = (n: number) => `${n > 0 ? "+" : n < 0 ? "−" : ""}${num(Math.abs(n))}`;
const dec = (n: number) => n.toLocaleString("fr-CH", { maximumFractionDigits: 1 });
const act = (p: Post) => p.likes + p.comments;
const mean = (a: number[]) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0);
const FULL = ["lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi", "dimanche"];
const FORMATS: { key: Post["type"]; label: string }[] = [{ key: "reel", label: "Reels" }, { key: "carrousel", label: "Carrousels" }, { key: "photo", label: "Photos" }];
const SLOTS = [
  { name: "Matin", from: 5, to: 12 }, { name: "Midi", from: 12, to: 15 },
  { name: "Après-midi", from: 15, to: 18 }, { name: "Soir", from: 18, to: 23 },
  { name: "Nuit", from: 23, to: 29 },
];

// Les chiffres Instagram, dans le Profil : tout ce que l'API officielle laisse lire, rangé pour décider quoi publier et quand.
export default function InstagramStats() {
  const d = useData()!;
  const handle = d.profile.handle.toLowerCase();
  const [rows, setRows] = useState<Snap[] | null>(null);
  const [state, setState] = useState<"ok" | "off" | "absent" | "later">("ok");

  useEffect(() => {
    let off = false;
    (async () => {
      if (!handle) return setRows([]);
      const q = () => sb().from("ig_snapshots").select("*").eq("handle", handle).order("day", { ascending: false }).limit(90);
      let { data } = await q();
      if (!data?.length || data[0].day !== new Date().toISOString().slice(0, 10)) {
        const { data: { session } } = await sb().auth.getSession();
        const r = session ? await refreshInstagram(session.access_token) : "absent";
        if (!off) setState(r);
        if (r === "ok") ({ data } = await q());
      }
      if (!off) setRows((data ?? []) as Snap[]);
    })();
    return () => { off = true; };
  }, [handle]);

  const head = (
    <header className="sub-head">
      <h2>Instagram</h2>
      {handle && <a className="muted" href={`https://www.instagram.com/${handle}/`} target="_blank" rel="noreferrer">@{handle}</a>}
      {rows?.[0]?.followers != null && <span className="lbl push">Relevé du {new Date(rows[0].day).getDate()} {MONTHS_SHORT[new Date(rows[0].day).getMonth()]}</span>}
    </header>
  );
  if (!handle) return <>{head}<section className="box pf"><p>Ajoute ton pseudo Instagram ci-dessus pour voir tes chiffres.</p></section></>;
  if (rows === null) return null;
  const last = rows[0];
  if ((!last || last.followers == null) && state === "off") return (
    <>{head}
      <section className="box pf">
        <h3>Bientôt ici</h3>
        <p>Semper n&apos;est pas encore relié à Instagram. Tes chiffres apparaîtront ici dès que c&apos;est fait, sans rien à faire de ton côté.</p>
      </section></>
  );
  // Trop de relevés demandés dans l'heure : le pseudo n'y est pour rien, on le dit sans l'accuser.
  if ((!last || last.followers == null) && state === "later") return (
    <>{head}
      <section className="box pf">
        <h3>Relevé en attente</h3>
        <p>Reviens dans une heure.</p>
      </section></>
  );
  if (!last || last.followers == null) return (
    <>{head}
      <section className="box pf">
        <h3>Chiffres indisponibles</h3>
        <p>Instagram ne partage les chiffres que des comptes professionnels ou créateur. Le passage est gratuit et se fait en une minute :</p>
        <ol className="how"><li>Instagram, ton profil, le menu en haut à droite</li><li>Type de compte et outils</li><li>Passer à un compte professionnel</li></ol>
        <p className="muted">Vérifie aussi que le pseudo ci-dessus est exactement le bon.</p>
      </section></>
  );

  const posts = last.posts ?? [];
  const ago = (days: number) => {
    const limit = dayKey(addDays(new Date(), -days));
    const r = rows.find((x) => x.day <= limit);
    return r?.followers != null ? last.followers! - r.followers : null;
  };
  // L'évolution sur 30 jours, sinon depuis le plus ancien relevé.
  const old = rows[rows.length - 1];
  const m30 = ago(30) ?? (old && old !== last && old.followers != null ? last.followers! - old.followers : null);
  const since = ago(30) != null ? "en 30 jours" : old ? `depuis le ${new Date(old.day).getDate()} ${MONTHS_SHORT[new Date(old.day).getMonth()]}` : "";
  const viewed = posts.filter((p) => p.views != null);
  const views = viewed.length ? mean(viewed.map((p) => p.views!)) : null;
  const month = addDays(new Date(), -30);
  const recent = posts.filter((p) => new Date(p.t) >= month).length;

  // Ce qui marche : trois phrases, seulement quand il y a assez de publications pour comparer.
  const formats = FORMATS.map((f) => { const l = posts.filter((p) => p.type === f.key); return { ...f, n: l.length, v: mean(l.map(act)) }; }).filter((f) => f.n >= 2).sort((x, y) => y.v - x.v);
  const days = DAYS.map((label, i) => { const l = posts.filter((p) => (new Date(p.t).getDay() + 6) % 7 === i); return { label, n: l.length, v: mean(l.map(act)) }; }).filter((x) => x.n >= 2).sort((x, y) => y.v - x.v);
  const slots = SLOTS.map((sl) => { const l = posts.filter((p) => { const h = new Date(p.t).getHours(); const x = h < 5 ? h + 24 : h; return x >= sl.from && x < sl.to; }); return { ...sl, n: l.length, v: mean(l.map(act)) }; }).filter((x) => x.n >= 2).sort((x, y) => y.v - x.v);
  const lines: string[] = [];
  if (formats.length >= 2 && formats[1].v > 0) {
    const r = formats[0].v / formats[1].v;
    lines.push(r >= 1.3 ? `Tes ${formats[0].label.toLowerCase()} font ${dec(r)} fois plus de réactions que tes ${formats[1].label.toLowerCase()}.` : `${formats[0].label} et ${formats[1].label.toLowerCase()} font à peu près autant de réactions.`);
  }
  if (days.length >= 2) lines.push(`Ton meilleur jour : le ${FULL[DAYS.indexOf(days[0].label)]}.`);
  if (slots.length >= 2) lines.push(`Ton meilleur moment : ${slots[0].name.toLowerCase()} (${slots[0].from % 24} h à ${slots[0].to % 24} h).`);
  const top = [...posts].sort((a, b) => act(b) - act(a)).slice(0, 6);

  return (
    <>
      {head}

      <div className="cs-stats">
        <div className="box stat"><span className="lbl">Abonnés</span><b className="disp">{num(last.followers!)}</b><span className="unit">{m30 == null ? "L'évolution dès demain" : `${signed(m30)} ${since}`}</span></div>
        <div className="box stat"><span className="lbl">Publications</span><b className="disp">{recent}</b><span className="unit">ces 30 derniers jours · objectif : {d.profile.rythme} par semaine</span></div>
        <div className="box stat"><span className="lbl">Vues</span><b className="disp">{views == null ? "·" : num(views)}</b><span className="unit">en moyenne par publication</span></div>
      </div>

      {lines.length > 0 && (
        <section className="box pf ig-say">
          <h2>Ce qui marche</h2>
          <ul>{lines.map((l) => <li key={l}>{l}</li>)}</ul>
          <small className="muted">Réactions : likes et commentaires, sur tes {posts.length} dernières publications.</small>
        </section>
      )}

      {top.length > 0 && (
        <section className="box pf">
          <h2>Tes meilleures publications</h2>
          <div className="tops">
            {top.map((p) => (
              <a key={p.link} href={p.link} target="_blank" rel="noreferrer" className="top">
                <span className="thumb">{p.img ? <img src={p.img} alt="" referrerPolicy="no-referrer" loading="lazy" /> : <span className="lbl">{p.type}</span>}</span>
                <span className="top-n">{p.views != null && <><b className="disp">{num(p.views)}</b> vues · </>}<b className="disp">{num(p.likes)}</b> likes</span>
              </a>
            ))}
          </div>
        </section>
      )}
    </>
  );
}
