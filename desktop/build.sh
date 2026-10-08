#!/bin/bash
# Construit Semper.app et Semper.dmg à partir de zéro.
# Besoin : Command Line Tools (swiftc), pas besoin de Xcode.
set -euo pipefail

DIR="$(cd "$(dirname "$0")" && pwd)"
BUILD="$DIR/build"
APP="$BUILD/Semper.app"
ICON_SRC="$DIR/../public/icon-512.png"
DMG_OUT="$DIR/../public/telecharger/Semper.dmg"

# Repart d'un dossier propre
rm -rf "$BUILD"
mkdir -p "$APP/Contents/MacOS" "$APP/Contents/Resources"

# Compile pour Apple Silicon et Intel, puis fusionne.
# Intel : les Command Line Tools n'ont pas les libs de compatibilité x86_64,
# on s'en passe (l'app n'utilise pas async/await).
swiftc -O -swift-version 5 -target arm64-apple-macos12.0 \
  -o "$BUILD/Semper-arm64" "$DIR/Semper.swift"
swiftc -O -swift-version 5 -target x86_64-apple-macos12.0 -runtime-compatibility-version none \
  -o "$BUILD/Semper-x86_64" "$DIR/Semper.swift"
lipo -create "$BUILD/Semper-arm64" "$BUILD/Semper-x86_64" -output "$APP/Contents/MacOS/Semper"

# Info.plist
cp "$DIR/Info.plist" "$APP/Contents/Info.plist"
printf 'APPL????' > "$APP/Contents/PkgInfo"

# Icône : toutes les tailles depuis icon-512.png (source intacte)
ICONSET="$BUILD/Semper.iconset"
mkdir -p "$ICONSET"
for S in 16 32 128 256 512; do
  sips -z $S $S "$ICON_SRC" --out "$ICONSET/icon_${S}x${S}.png" >/dev/null
  D=$((S * 2))
  sips -z $D $D "$ICON_SRC" --out "$ICONSET/icon_${S}x${S}@2x.png" >/dev/null
done
iconutil -c icns "$ICONSET" -o "$APP/Contents/Resources/Semper.icns"

# Signature ad hoc (pas de certificat)
codesign --force --deep --sign - "$APP"
codesign --verify --deep --strict "$APP"

# DMG : l'app + un raccourci vers Applications
STAGE="$BUILD/dmg"
mkdir -p "$STAGE"
cp -R "$APP" "$STAGE/"
ln -s /Applications "$STAGE/Applications"
mkdir -p "$(dirname "$DMG_OUT")"
rm -f "$DMG_OUT"
hdiutil create -volname "Semper" -srcfolder "$STAGE" -format UDZO \
  -imagekey zlib-level=9 -ov "$DMG_OUT" >/dev/null

# Nettoie les intermédiaires
rm -rf "$ICONSET" "$STAGE" "$BUILD"/Semper-*

echo "OK : $APP"
echo "OK : $DMG_OUT ($(du -h "$DMG_OUT" | cut -f1))"
