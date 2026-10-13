// L'installation Mac en une ligne : curl -fsSL https://trysemper.app/mac | sh
// Un fichier téléchargé par curl n'est pas mis en quarantaine : macOS ouvre Semper sans « Ouvrir quand même ».
// Dans Applications si le dossier est accessible, sinon dans le dossier Applications de la personne.
const SCRIPT = `#!/bin/sh
set -e
D="\${SEMPER_DIR:-/Applications}"
mkdir -p "$D" 2>/dev/null || true
[ -w "$D" ] || { D="$HOME/Applications"; mkdir -p "$D"; }
T=$(mktemp -d)
trap 'hdiutil detach -quiet "$T/m" 2>/dev/null; rm -rf "$T"' EXIT
echo "Semper : téléchargement…"
curl -fsSL https://trysemper.app/telecharger/Semper.dmg -o "$T/semper.dmg"
hdiutil attach -quiet -nobrowse -readonly -mountpoint "$T/m" "$T/semper.dmg"
rm -rf "$D/Semper.app"
ditto "$T/m/Semper.app" "$D/Semper.app"
xattr -dr com.apple.quarantine "$D/Semper.app" 2>/dev/null || true
echo "Semper est installé dans $D. Ouverture…"
open "$D/Semper.app"
`;

export function GET() {
  return new Response(SCRIPT, { headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "public, max-age=300" } });
}
