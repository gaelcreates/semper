"use client";

import { useEffect, useState } from "react";
import { refreshInstagram } from "./actions";
import { sb } from "../supabase";
import { DAYS, MONTHS_SHORT, addDays, dayKey, isoWeek, startOfWeek } from "./lib";
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
const FORMATS: { key: Post["type"]; label: string }[] = [{ key: "reel", label: "Reels" }, { key: "carrousel", label: "Carrousels" }, { key: "photo", label: "Photos" }];
const SLOTS = [
  { name: "Matin", phrase: "du matin", from: 5, to: 12 }, { name: "Midi", phrase: "de midi", from: 12, to: 15 },
  { name: "Après-midi", phrase: "de l'après-midi", from: 15, to: 18 }, { name: "Soir", phrase: "du soir", from: 18, to: 23 },
  { name: "Nuit", phrase: "de nuit", from: 23, to: 29 },
];

// Les chiffres Instagram, dans le Profil : tout ce que l'API officielle laisse lire, rangé pour décider quoi publier et quand.
export default function InstagramStats() {
  const d = useData()!;
  const handle = d.profile.handle.toLowerCase();
  const [rows, setRows] = useState<Snap[] | null>(null);
  const [state, setState] = useState<"ok" | "off" | "absent">("ok");

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
  const w7 = ago(7), m30 = ago(30);
  const eng = last.followers ? ((last.avg_likes ?? 0) + (last.avg_comments ?? 0)) / last.followers * 100 : 0;
  const viewed = posts.filter((p) => p.views != null);
  const views = viewed.length ? mean(viewed.map((p) => p.views!)) : null;

  // Rythme réel sur 8 semaines, à partir des dates de publication
  const cur = startOfWeek(new Date());
  const weeks = Array.from({ length: 8 }, (_, i) => addDays(cur, -7 * (7 - i)));
  const perWeek = weeks.map((w) => posts.filter((p) => { const t = new Date(p.t); return t >= w && t < addDays(w, 7); }).length);
  const real = mean(perWeek.slice(3, 7)); // les 4 dernières semaines complètes

  const formats = FORMATS.map((f) => { const l = posts.filter((p) => p.type === f.key); return { ...f, n: l.length, v: mean(l.map(act)) }; }).filter((f) => f.n);
  const days = DAYS.map((label, i) => ({ label, v: mean(posts.filter((p) => (new Date(p.t).getDay() + 6) % 7 === i).map(act)) }));
  const slots = SLOTS.map((s) => ({ ...s, v: mean(posts.filter((p) => { const h = new Date(p.t).getHours(); const x = h < 5 ? h + 24 : h; return x >= s.from && x < s.to; }).map(act)) }));
  const top = [...posts].sort((a, b) => act(b) - act(a)).slice(0, 6);

  // La lecture : quelques phrases, seulement quand les données les soutiennent
  const read: string[] = [];
  const f = [...formats].filter((x) => x.n >= 2).sort((a, b) => b.v - a.v);
  if (f.length >= 2 && f[1].v > 0 && f[0].v / f[1].v >= 1.3) read.push(`Tes ${f[0].label.toLowerCase()} font ${dec(f[0].v / f[1].v)} fois plus d'interactions que tes ${f[1].label.toLowerCase()}.`);
  const bestDay = [...days].sort((a, b) => b.v - a.v)[0];
  if (posts.length >= 8 && bestDay.v) read.push(`Le ${bestDay.label.replace(".", "")} est ton meilleur jour.`);
  const bestSlot = [...slots].sort((a, b) => b.v - a.v)[0];
  if (posts.length >= 8 && bestSlot.v) read.push(`Tes publications ${bestSlot.phrase} marchent le mieux.`);
  read.push(`Sur Instagram, tu tiens ${dec(real)} publication${real >= 2 ? "s" : ""} par semaine. Ton rythme visé : ${d.profile.rythme}.`);

  const series = [...rows].reverse().filter((r) => r.followers != null);

  return (
    <>
      {head}

      <div className="cs-stats four">
        <div className="box stat"><span className="lbl">Abonnés</span><b className="disp">{num(last.followers!)}</b><span className="unit">{w7 == null ? "Évolution dès demain" : `${signed(w7)} sur 7 jours${m30 == null ? "" : ` · ${signed(m30)} sur 30`}`}</span></div>
        <div className="box stat"><span className="lbl">Vues moyennes</span><b className="disp">{views == null ? "·" : num(views)}</b><span className="unit">par publication récente</span></div>
        <div className="box stat"><span className="lbl">Engagement</span><b className="disp">{dec(eng)}<i>%</i></b><span className="unit">likes et commentaires par abonné</span></div>
        <div className="box stat"><span className="lbl">Par semaine</span><b className="disp">{dec(real)}<i>/{d.profile.rythme}</i></b><span className="unit">publications, 4 dernières semaines</span></div>
      </div>

      <section className="box pf">
        <h2>Abonnés</h2>
        {series.length >= 2 ? <DotLine values={series.map((r) => r.followers!)} /> : <p className="muted">La courbe se dessine à partir du deuxième relevé, demain matin.</p>}
      </section>

      <div className="ig-two">
        <section className="box pf">
          <h2>Formats</h2>
          <div className="bars">
            {formats.map((x) => <Bar key={x.key} label={x.label} sub={`${x.n} publ.`} v={x.v} max={Math.max(...formats.map((y) => y.v))} />)}
          </div>
        </section>
        <section className="box pf">
          <h2>Rythme réel</h2>
          <DotCols values={perWeek} labels={weeks.map((w) => `S${isoWeek(w)}`)} />
        </section>
      </div>

      <div className="ig-two">
        <section className="box pf">
          <h2>Jours</h2>
          <DotCols values={days.map((x) => x.v)} labels={days.map((x) => x.label.slice(0, 3))} />
        </section>
        <section className="box pf">
          <h2>Moments</h2>
          <div className="bars">
            {slots.map((x) => <Bar key={x.name} label={x.name} v={x.v} max={Math.max(...slots.map((y) => y.v))} />)}
          </div>
        </section>
      </div>

      {top.length > 0 && (
        <section className="box pf">
          <h2>Meilleures publications</h2>
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

      <section className="box advice">
        <span className="lbl">Lecture</span>
        <ul className="read">{read.map((r) => <li key={r}>{r}</li>)}</ul>
      </section>
    </>
  );
}

// Courbe en points : une colonne par jour, un point allumé à la hauteur du chiffre.
function DotLine({ values }: { values: number[] }) {
  const R = 9, v = values.slice(-60), lo = Math.min(...v), hi = Math.max(...v);
  const lvl = (x: number) => (hi === lo ? Math.floor(R / 2) : Math.round(((x - lo) / (hi - lo)) * (R - 1)));
  return (
    <div className="dline">
      <span className="dl-y disp"><i>{num(hi)}</i><i>{num(lo)}</i></span>
      <svg viewBox={`0 0 ${v.length * 10} ${R * 10}`} preserveAspectRatio="none" aria-label={`De ${num(v[0])} à ${num(v[v.length - 1])} abonnés`}>
        {v.flatMap((x, i) => Array.from({ length: R }, (_, r) => (
          <circle key={`${i}-${r}`} cx={i * 10 + 5} cy={(R - 1 - r) * 10 + 5} r={r === lvl(x) ? 3.2 : 1.3}
            className={r === lvl(x) ? (i === v.length - 1 ? "g" : "on") : ""} />
        )))}
      </svg>
    </div>
  );
}

// Colonnes de points : un chiffre par colonne, en hauteur.
function DotCols({ values, labels }: { values: number[]; labels: string[] }) {
  const R = 8, hi = Math.max(1, ...values);
  return (
    <div className="dcols">
      {values.map((x, i) => {
        const n = Math.round((x / hi) * R);
        return (
          <div key={labels[i] + i} className="dcol" title={dec(x)}>
            <span className="dots">{Array.from({ length: R }, (_, r) => <i key={r} className={R - r <= n ? "on" : ""} />)}</span>
            <span className="lbl">{labels[i]}</span>
          </div>
        );
      })}
    </div>
  );
}

// Barre horizontale en points : 24 points, allumés en proportion.
function Bar({ label, sub, v, max }: { label: string; sub?: string; v: number; max: number }) {
  const n = max ? Math.round((v / max) * 24) : 0;
  return (
    <div className="bar-r">
      <span className="bar-l">{label}{sub && <small>{sub}</small>}</span>
      <span className="dots">{Array.from({ length: 24 }, (_, i) => <i key={i} className={i < n ? "on" : ""} />)}</span>
      <b className="disp">{num(v)}</b>
    </div>
  );
}
