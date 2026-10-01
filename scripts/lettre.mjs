// Copie les lettres du dossier Newsletter vers le site.
//
//   node scripts/lettre.mjs            met à jour les images (bannières et PNG Doto de toutes les éditions)
//   node scripts/lettre.mjs <slug>     publie aussi cette édition sur trysemper.app/lettre/<slug>
//
// Les images partent toutes, publiées ou non, parce que les e-mails pointent sur trysemper.app/newsletter/.
// Une page n'est créée que pour une édition désignée, avec titre_web et description remplis dans son contenu.py.
import { execFileSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

const SRC = join(homedir(), "Desktop/SEMPER/Newsletter");
const EDITIONS = join(SRC, "editions");
const PUBLIC = "public/newsletter";
const CONTENT = "content/lettre";
const INDEX = join(CONTENT, "editions.json");

// Mêmes noms que gabarit/build.py.
const BANNIERES = { annonce: "l-annonce", calendrier: "le-calendrier-de", regle: "la-regle", coulisses: "les-coulisses", piege: "le-piege", chiffre: "le-chiffre" };

const png = (dir) => (existsSync(dir) ? readdirSync(dir).filter((f) => f.endsWith(".png")) : []);

// 1. Images servies aux adresses des e-mails.
mkdirSync(PUBLIC, { recursive: true });
for (const f of png(join(SRC, "visuels/matricielle"))) cpSync(join(SRC, "visuels/matricielle", f), join(PUBLIC, f));
for (const slug of readdirSync(EDITIONS)) {
  const points = join(EDITIONS, slug, "points");
  if (!png(points).length) continue;
  mkdirSync(join(PUBLIC, slug), { recursive: true });
  for (const f of png(points)) cpSync(join(points, f), join(PUBLIC, slug, f));
  // Les captures d'une édition : build.py les adresse à la racine de /newsletter.
  for (const f of png(join(EDITIONS, slug, "captures"))) cpSync(join(EDITIONS, slug, "captures", f), join(PUBLIC, f));
}
console.log("Images à jour dans", PUBLIC);

// 2. Les éditions désignées.
const index = existsSync(INDEX) ? JSON.parse(readFileSync(INDEX, "utf8")) : [];
for (const slug of process.argv.slice(2)) {
  const dir = join(EDITIONS, slug);
  const py = join(dir, "contenu.py");
  const md = join(dir, `${slug}.md`);
  if (!existsSync(py) || !existsSync(md)) throw new Error(`${slug} : contenu.py ou ${slug}.md manquant`);
  const ed = JSON.parse(execFileSync("python3", ["-c", "import json,runpy,sys; print(json.dumps(runpy.run_path(sys.argv[1])['EDITION']))", py], { encoding: "utf8" }));
  if (ed.format === "annonce") throw new Error(`${slug} : l'annonce ne se publie pas sur le site`);
  if (!ed.titre_web || !ed.description) throw new Error(`${slug} : remplis titre_web et description dans contenu.py`);
  if (ed.titre_web === ed.objet) throw new Error(`${slug} : titre_web doit être différent de l'objet du mail`);

  mkdirSync(CONTENT, { recursive: true });
  cpSync(md, join(CONTENT, `${slug}.md`));
  const prev = index.find((e) => e.slug === slug);
  const entry = {
    slug,
    titre: ed.titre_web,
    description: ed.description,
    etiquette: ed.etiquette ?? "",
    banniere: ed.banniere || BANNIERES[ed.format] || ed.format,
    date: prev?.date ?? new Date().toISOString().slice(0, 10),
  };
  if (prev) Object.assign(prev, entry);
  else index.push(entry);
  console.log("Publiée :", `/lettre/${slug}`);
}
index.sort((a, b) => b.date.localeCompare(a.date));
if (process.argv.length > 2) writeFileSync(INDEX, JSON.stringify(index, null, 2) + "\n");
