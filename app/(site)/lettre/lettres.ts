import { readFileSync } from "fs";
import { join } from "path";
import editions from "../../../content/lettre/editions.json";

// Les lettres publiées sur le site. Rien ne s'ajoute ici à la main : scripts/lettre.mjs copie le .md
// de l'édition et remplit editions.json (titre web, description, bannière, date).
export type Lettre = { slug: string; titre: string; description: string; etiquette: string; banniere: string; date: string };
export type Bloc =
  | { t: "p" | "retenir" | "h"; html: string }
  | { t: "etapes"; items: string[] }
  | { t: "bouton"; texte: string; href: string }
  | { t: "img"; src: string; alt: string };

export const lettres = editions as Lettre[];
export const lettre = (slug: string) => lettres.find((l) => l.slug === slug);

export const dateFr = (d: string) => new Date(`${d}T12:00:00`).toLocaleDateString("fr-CH", { day: "numeric", month: "long", year: "numeric" });

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
// Le gras et les liens, comme dans contenu.py. Le reste est échappé.
const inline = (s: string) =>
  esc(s)
    .replace(/\*\*(.+?)\*\*/g, "<b>$1</b>")
    .replace(/\[(.+?)\]\((https?:\/\/[^)\s]+)\)/g, '<a href="$2">$1</a>');

// Le .md suit construis_md de build.py : titre, objet, chapô, ---, corps, ---, signature, PS.
export function lire(slug: string) {
  const md = readFileSync(join(process.cwd(), "content/lettre", `${slug}.md`), "utf8");
  const parts = md.split(/\n---\n/);
  const head = parts[0], fin = parts[parts.length - 1], corps = parts.slice(1, -1).join("\n");
  const chapo = head.match(/\*\*Chapo et pre-en-tete\.\*\* (.+)/)?.[1] ?? "";

  const blocs: Bloc[] = [];
  for (const raw of corps.split(/\n{2,}/)) {
    const p = raw.trim();
    if (!p) continue;
    let m: RegExpMatchArray | null;
    if ((m = p.match(/^## (.+)$/))) blocs.push({ t: "h", html: inline(m[1]) });
    else if ((m = p.match(/^\[ (.+) \]\((.+)\)$/))) blocs.push({ t: "bouton", texte: m[1], href: m[2] });
    else if ((m = p.match(/^!\[(.*)\]\(captures\/(.+)\)$/))) blocs.push({ t: "img", alt: m[1], src: `/newsletter/${m[2]}` });
    else if (/^01\. /.test(p)) blocs.push({ t: "etapes", items: p.split("\n").map((l) => inline(l.replace(/^\d+\. /, ""))) });
    else if ((m = p.match(/^\*\*([^*]+)\*\*$/))) blocs.push({ t: "retenir", html: inline(m[1]) });
    else blocs.push({ t: "p", html: inline(p) });
  }
  const ps = fin.split(/\n{2,}/).map((s) => s.trim()).filter((s) => s && !/^Gael\nCréer, toujours$/.test(s));
  return { chapo, blocs, ps: ps.map((s) => inline(s)) };
}
