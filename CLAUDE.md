# Semper · landing page

Landing page de liste d'attente de Semper (calendrier éditorial des créateurs de contenu). Next.js 16, sans Tailwind, CSS dans `app/globals.css`. Toujours en français, jamais de tiret long.

## Direction artistique
Clair par défaut : fond `#F5F5F5`, texte `#0E0E0E`, or `#FFC508` en accent rare. Sombre via `ThemeToggle` (`data-theme="dark"` sur `<html>`, localStorage). Suisse Intl seulement (Light 300, Bold 700, Black 900) : `.b` = Black, `.w` = Light pour le second mot des titres. Pas de Suisse Works. Logo complet `app/Logo.tsx`, le signe seul `app/Mark.tsx` pour les animations. Tailles de texte mesurées, référence Alytics (Framer) : h1 72 px max, h2 46 px max, corps 16 px.

Toutes les couleurs passent par les variables (`--bg --card --ink --ink2 --muted --fgr --bgr --line`). Une section `.s.dark` inverse tout via les `--alt-*` (dans le thème sombre elle devient claire). Jamais de couleur en dur dans un composant.

Le voyage : fond façon Sinergia (`.grid-bg` : zones d'or floues qui dérivent, quadrillage en pointillés de la couleur de la page par-dessus donc visible seulement sur la couleur, tache d'or qui suit la souris via `--mx/--my`), barre de progression or en haut, hero centré style SaaS, `AppView.tsx` (barre latérale, chiffres de la semaine, onglets, cartes flottantes hors cadre, inclinaison au survol via `data-tilt`) couché sur le dos à l'arrivée, charnière en bas, le haut vient vers le visiteur au scroll (`Stand.tsx` pose `--stand` sur `.mock-wrap`, transform sur `.app-shell`), qui déborde sur la section sombre « Le vrai problème » (avec `Curve.tsx` : ligne de croissance or plus large que l'écran, mesurée sur le contenu réel, tracée au scroll via `--draw`, zone d'or dessous, quatre points qui pulsent ; révélée par un clipPath, pas par stroke-dasharray qui bugue dans Chrome avec l'étirement), ruban en boucle continue (4 passages, `translateX(-25%)`), cartes produit avec reflet qui suit le curseur (`data-spot`, géré par `Pointer.tsx`), trois gestes, fil vertical `Join` qui se trace au scroll, île sombre « La mission » (pastille et titre en or au survol), questions en `<details>`, dernier appel (le signe or suit la souris : `Tracker.tsx` fait tourner le point vers le curseur). Les chiffres du problème montent de 0 (`[data-count]`, géré dans `Reveal.tsx`). Pas d'étiquette de section au-dessus des titres (retirées le 22 sept). Menu d'ancres dans la barre (masqué sous 960 px).

## Le signe
`app/Mark.tsx` : cercle ouvert + point dans l'ouverture. Le point et l'ouverture tournent ensemble. `spin` = rotation continue (chargement). Le voile de chargement (`Loader.tsx`) s'efface après les polices (900 ms minimum, filet CSS à 2400 ms) ; les animations du haut de page ont des délais fixes calés dessus.

## Favicon
`app/icon.svg` : signe noir sur fond blanc, fixe (la version qui tournait a été retirée le 22 sept).

## Formulaire
`actions.ts` ajoute l'adresse à une audience Resend. Variables : `RESEND_API_KEY`, `RESEND_AUDIENCE_ID` (voir `.env.example`). Sans elles, le formulaire répond « les inscriptions ouvrent dans quelques heures ». Champ piège `site` contre les robots.

## Pages
`/` accueil · `/connexion` (lien e-mail, sans mot de passe ; répond « pas encore ouvert » tant que `SUPABASE_URL` est vide) · `/confidentialite` · `/conditions` · `/mentions-legales`. Infos éditeur dans `app/site.ts` (adresse : « Vaud, Suisse » pour l'instant, à préciser avant la mise en ligne définitive).

## Vérifier
`npm run dev -- -p 3200`, puis captures : `/Applications/Google Chrome.app/Contents/MacOS/Google Chrome --headless=new --screenshot=out.png --window-size=1440,3600 http://localhost:3200` (ajouter `--force-prefers-reduced-motion` pour tout afficher sans attendre les animations).

## Ce qui n'est pas promis sur la page
Publication automatique, connexion aux comptes Meta ou TikTok, date d'ouverture. Ne pas les ajouter sans décision de Gael.
