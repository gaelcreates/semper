# Semper · landing page

Landing page de liste d'attente de Semper (calendrier éditorial des créateurs de contenu). Next.js 16, sans Tailwind, CSS dans `app/globals.css`. Toujours en français, jamais de tiret long.

## Direction artistique : « Suisse matricielle » (décidée le 23 sept 2026, branche `pixel`)
Le mélange de deux univers, nommé par Gael et moi : le style suisse (papier, grille, grotesque, une couleur) et l'affichage matriciel (points ronds façon afficheur à LED, Nothing). Règle en une phrase : **le papier porte, la matrice compte.**
- Papier : Suisse Intl pour tout ce qui se lit, titres compris (Black + Light). Fond `#F5F5F5` nu, halos d'or qui dérivent, coins 20 px, ombres douces, mouvement fluide.
- Matrice : Doto (Google Fonts, variable, `ROND` 100, toujours **900**) pour tout ce qui compte : chiffres (20 à 60 px, jamais plus), étiquettes (12 px, capitales, 0.1em), ruban, pastille, signature. Coins 4 px, pas d'ombre, mouvement par pas (`steps(8)`). Icônes bitmap 5×5 (`DotIcon.tsx`), signe voir section « Le signe et le logo ». Jamais de points dans un titre ou une phrase.
- Unité : 8 px. Le fond bat à 24 px mais reste éteint : la trame ne s'allume qu'autour du curseur (`.grid-bg .spot`, rayon 340 px, or).
- Le sujet : la lune en trame tonale (`Matrix.tsx`), fixe derrière toute la page, bord droit, rayon 0,39 × min(largeur, hauteur), relief calculé (bruit + 250 cratères), lumière qui glisse, construction par tranches sans bloquer, fondu à l'arrivée, masquée sous 860 px. Justification : le premier calendrier de l'humanité, la régularité par nature, ne récompense pas le volume. Phrase au pied de page (`.lunar`).
- Page de travail `/style` (hors index) : tout le système à plat. Mesures prises dans le code de Nothing : Ndot entre 14 et 60 px seulement, corps en grotesque, jaune 255 199 0.
- Ce qu'on ne fait pas : points dans un titre, or à deux endroits sur un écran, pixels carrés, scanlines, néon, CRT, carte qui mélange papier et afficheur.
- `main` porte encore l'ancienne version (Suisse Intl seule, trame Sinergia). Ne pas fusionner `pixel` sans l'accord de Gael.

## Direction artistique (version publiée sur main)
Clair par défaut : fond `#F5F5F5`, texte `#0E0E0E`, or `#FFC508` en accent rare. Sombre via `ThemeToggle` (`data-theme="dark"` sur `<html>`, localStorage). Suisse Intl seulement (Light 300, Bold 700, Black 900) : `.b` = Black, `.w` = Light pour le second mot des titres. Pas de Suisse Works. Logo complet `app/Logo.tsx`, le signe seul `app/Mark.tsx` pour les animations. Tailles de texte mesurées, référence Alytics (Framer) : h1 72 px max, h2 46 px max, corps 16 px.

Toutes les couleurs passent par les variables (`--bg --card --ink --ink2 --muted --fgr --bgr --line`). Une section `.s.dark` inverse tout via les `--alt-*` (dans le thème sombre elle devient claire). Jamais de couleur en dur dans un composant.

Le voyage : fond façon Sinergia (`.grid-bg` : zones d'or floues qui dérivent, quadrillage en pointillés de la couleur de la page par-dessus donc visible seulement sur la couleur, tache d'or qui suit la souris via `--mx/--my`), barre de progression or en haut, hero centré style SaaS, `AppView.tsx` (barre latérale, chiffres de la semaine, onglets, cartes flottantes hors cadre, inclinaison au survol via `data-tilt`) couché sur le dos à l'arrivée, charnière en bas, le haut vient vers le visiteur au scroll (`Stand.tsx` pose `--stand` sur `.mock-wrap`, transform sur `.app-shell`), qui déborde sur la section sombre « Le vrai problème » (avec `Curve.tsx` : ligne de croissance or plus large que l'écran, mesurée sur le contenu réel, tracée au scroll via `--draw`, zone d'or dessous, quatre points qui pulsent ; révélée par un clipPath, pas par stroke-dasharray qui bugue dans Chrome avec l'étirement), ruban en boucle continue (4 passages, `translateX(-25%)`), cartes produit avec reflet qui suit le curseur (`data-spot`, géré par `Pointer.tsx`), trois gestes, fil vertical `Join` qui se trace au scroll, île sombre « La mission » (pastille et titre en or au survol), questions en `<details>`, dernier appel (le symbole or en orbite lente, `Orbit.tsx`). Les chiffres du problème montent de 0 (`[data-count]`, géré dans `Reveal.tsx`). Pas d'étiquette de section au-dessus des titres (retirées le 22 sept). Menu d'ancres dans la barre (masqué sous 960 px).

## Le signe et le logo (kit du 25 sept 2026, `~/Desktop/SEMPER-logos`)
Symbole : un anneau vu en perspective, ouvert en haut (30° à 330°), épais devant, effilé aux pointes. Toute la géométrie vit dans `app/brand.ts` (`LOGO_PATH` calculé, `SYMBOL_BOX`, peintres canvas). `Mark.tsx` = symbole seul, hauteur 0,558 em posée sur la ligne de base (`full` pour la grille 100 entière). `Logo.tsx` = symbole + « semper » en minuscules Suisse Intl Black, interlettrage -0,035 em, écart 0,16 em ; la taille se règle par `font-size` sur `.logo`. Animations : `Loader.tsx` (voile avec le symbole en orbite, 36 px, 900 ms minimum), `Orbit.tsx` (chargement en orbite avec traînée, prend la couleur du parent : formulaires en 16 px, dernier appel en noir 96 px, tour en 6 s). L'ancien cercle ouvert à point, `MarkDots` et `Tracker` sont supprimés. Favicon `app/icon.svg` et `public/og.png` refaits avec le nouveau logo.

## Favicon
`app/icon.svg` : signe noir sur fond blanc, fixe (la version qui tournait a été retirée le 22 sept).

## Formulaire
`actions.ts` ajoute l'adresse à une audience Resend. Variables : `RESEND_API_KEY`, `RESEND_AUDIENCE_ID` (voir `.env.example`). Sans elles, le formulaire répond « les inscriptions ouvrent dans quelques heures ». Champ piège `site` contre les robots.

## Domaine et déploiement
Domaine `trysemper.app` (Hostinger, DNS chez Hostinger, e-mail pro sur le même domaine donc ne jamais changer les nameservers). Dépôt `gaelcreates/semper`, déployé sur Vercel (projet `semper`, adresse de secours semper-psi.vercel.app). Un push sur `main` redéploie.

## Pages
`/` accueil · `/connexion` (lien e-mail, sans mot de passe ; répond « pas encore ouvert » tant que `SUPABASE_URL` est vide) · `/confidentialite` · `/conditions` · `/mentions-legales`. Infos éditeur dans `app/site.ts` (adresse : « Vaud, Suisse » pour l'instant, à préciser avant la mise en ligne définitive).

## Vérifier
`npm run dev -- -p 3200`, puis captures : `/Applications/Google Chrome.app/Contents/MacOS/Google Chrome --headless=new --screenshot=out.png --window-size=1440,3600 http://localhost:3200` (ajouter `--force-prefers-reduced-motion` pour tout afficher sans attendre les animations).

## Ce qui n'est pas promis sur la page
Publication automatique, connexion aux comptes Meta ou TikTok, date d'ouverture. Ne pas les ajouter sans décision de Gael.

## SEO et référencement IA (23 sept 2026)
- `app/sitemap.ts` (4 pages, sans /connexion), `app/robots.ts` (tout ouvert, robots IA compris, sauf /connexion et /api), `public/llms.txt`.
- Données structurées JSON-LD dans `app/page.tsx` (Organization, WebSite, SoftwareApplication, FAQPage à partir de `faq`).
- Phrase d'identité dans le pied de page (`.about`), /connexion en noindex, `public/og.png` régénéré (H1 actuel, logo, fond clair).
- À faire par Gael : Google Search Console et Bing Webmaster Tools avec le sitemap.
