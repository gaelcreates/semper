// Met le site à jour avec les lettres du dossier Newsletter. Tourne seul tous les jours à 20 h (launchd,
// app.trysemper.lettre), et à la main quand on veut :
//
//   node scripts/lettre.mjs          dans le dossier courant (pour tester en local)
//   node scripts/lettre.mjs --push   dans ~/Projects/semper-lp-en-ligne (branche main), puis commit et push
//                                    s'il y a du nouveau : Vercel met en ligne.
//
// 1. Toutes les images partent, envoyées ou non, parce que les e-mails pointent sur trysemper.app/newsletter/.
// 2. Une édition a sa page dès qu'elle est envoyée : un broadcast Resend « sent » avec le même objet,
//    ou date_envoi dans son contenu.py. Jamais l'annonce, jamais une édition marquée "site": False.
//    Il lui faut titre_web et description dans contenu.py, sinon elle attend et le journal le dit.
import { execFileSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

const SRC = join(homedir(), "Desktop/SEMPER/Newsletter");
const EDITIONS = join(SRC, "editions");
const REPO = join(homedir(), "Projects/semper-lp");
const LIVE = join(homedir(), "Projects/semper-lp-en-ligne");
const PUSH = process.argv.includes("--push");

// Mêmes noms que gabarit/build.py.
const BANNIERES = { annonce: "l-annonce", calendrier: "le-calendrier-de", regle: "la-regle", coulisses: "les-coulisses", piege: "le-piege", chiffre: "le-chiffre" };

const git = (cwd, ...args) => execFileSync("git", args, { cwd, encoding: "utf8" }).trim();
const png = (dir) => (existsSync(dir) ? readdirSync(dir).filter((f) => f.endsWith(".png")) : []);
const log = (...m) => console.log(new Date().toISOString().slice(0, 16), ...m);

// Les objets déjà envoyés par Resend, avec leur date.
async function envois() {
  const key = readFileSync(join(REPO, ".env.local"), "utf8").match(/^RESEND_API_KEY=(.+)$/m)?.[1]?.trim();
  if (!key) return new Map();
  const get = (path) => fetch(`https://api.resend.com${path}`, { headers: { Authorization: `Bearer ${key}` } }).then((r) => r.json());
  const sent = new Map();
  for (const b of (await get("/broadcasts")).data ?? []) {
    if (b.status !== "sent") continue;
    const d = await get(`/broadcasts/${b.id}`);
    if (d.subject) sent.set(d.subject.trim(), (d.sent_at ?? d.created_at).slice(0, 10));
  }
  return sent;
}

// Le dossier où écrire : le dossier courant, ou la copie de main réservée à la mise en ligne.
let ROOT = process.cwd();
if (PUSH) {
  if (!existsSync(LIVE)) git(REPO, "worktree", "add", LIVE, "main");
  git(LIVE, "pull", "--ff-only", "origin", "main");
  ROOT = LIVE;
}
const PUBLIC = join(ROOT, "public/newsletter");
const CONTENT = join(ROOT, "content/lettre");
mkdirSync(PUBLIC, { recursive: true });
mkdirSync(CONTENT, { recursive: true });

// 1. Les images.
for (const f of png(join(SRC, "visuels/matricielle"))) cpSync(join(SRC, "visuels/matricielle", f), join(PUBLIC, f));
const slugs = readdirSync(EDITIONS).filter((s) => existsSync(join(EDITIONS, s, "contenu.py")));
for (const slug of slugs) {
  const points = join(EDITIONS, slug, "points");
  if (png(points).length) {
    mkdirSync(join(PUBLIC, slug), { recursive: true });
    for (const f of png(points)) cpSync(join(points, f), join(PUBLIC, slug, f));
  }
  // Les captures d'une édition : build.py les adresse à la racine de /newsletter.
  for (const f of png(join(EDITIONS, slug, "captures"))) cpSync(join(EDITIONS, slug, "captures", f), join(PUBLIC, f));
}

// 2. Les pages des éditions envoyées.
const sent = await envois();
const index = [];
for (const slug of slugs) {
  const md = join(EDITIONS, slug, `${slug}.md`);
  if (!existsSync(md)) continue;
  const ed = JSON.parse(execFileSync("python3", ["-c", "import json,runpy,sys; print(json.dumps(runpy.run_path(sys.argv[1])['EDITION']))", join(EDITIONS, slug, "contenu.py")], { encoding: "utf8" }));
  if (ed.format === "annonce" || ed.site === false) continue;
  const date = ed.date_envoi || sent.get(ed.objet?.trim());
  if (!date || date > new Date().toISOString().slice(0, 10)) continue;
  if (!ed.titre_web || !ed.description || ed.titre_web === ed.objet) {
    log(`${slug} : envoyée, mais titre_web et description manquent (ou titre_web = objet). Pas de page.`);
    continue;
  }
  cpSync(md, join(CONTENT, `${slug}.md`));
  index.push({ slug, titre: ed.titre_web, description: ed.description, etiquette: ed.etiquette ?? "", banniere: ed.banniere || BANNIERES[ed.format] || ed.format, date });
}
index.sort((a, b) => b.date.localeCompare(a.date));
writeFileSync(join(CONTENT, "editions.json"), JSON.stringify(index, null, 2) + "\n");
for (const f of readdirSync(CONTENT)) if (f.endsWith(".md") && !index.some((e) => `${e.slug}.md` === f)) rmSync(join(CONTENT, f));
log(`${index.length} lettre(s) sur le site :`, index.map((e) => e.slug).join(", ") || "aucune");

// 3. La mise en ligne, seulement s'il y a du nouveau.
if (PUSH) {
  git(ROOT, "add", "content/lettre", "public/newsletter");
  if (git(ROOT, "diff", "--cached", "--name-only")) {
    git(ROOT, "commit", "-m", "La lettre : mise à jour automatique");
    git(ROOT, "push", "origin", "main");
    log("Poussé sur main, Vercel met en ligne.");
  }
}
