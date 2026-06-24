#!/usr/bin/env bash
# Sestaví macOS .app bundle (zabalený jako .zip) pro Verdict (.NET/Avalonia).
# Spusť na macOS ve složce apps/desktop-net/.
#
# POZNÁMKA: Velopack na macOS produkuje přenosný .zip obsahující .app bundle.
# Uživatel zip rozbalí (nebo Finder to udělá automaticky) a .app přetáhne
# do /Applications. Pokud chceš .dmg, viz komentář na konci skriptu.
#
# Vyžaduje:
#   - .NET 9 SDK  (dotnet --version)
#   - vpk CLI     (dotnet tool install -g vpk)
#
# Výstup: release/Verdict-<verze>-osx.zip  (nebo podobný název)
#
# Pro produkci — universal binary (Intel + Apple Silicon):
#   Nelze řešit pouhou lipo-fusí hlavní binárky — nativní Avalonia knihovny
#   (.dylib) jsou architekturně specifické a musely by se lipo-ovat každá zvlášť.
#   Prozatím builduj pro nativní arch (arm64 na Apple Silicon, x64 na Intel).

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
CSPROJ="$ROOT/Verdict.Desktop/Verdict.Desktop.csproj"

# ── Verze z .csproj ───────────────────────────────────────────────────────────
VERSION=$(grep -oP '(?<=<Version>)[^<]+' "$CSPROJ" 2>/dev/null \
  || grep -oE '<Version>[^<]+' "$CSPROJ" | sed 's/<Version>//')
VERSION=$(echo "$VERSION" | head -1)
if [[ -z "$VERSION" ]]; then
  echo "Nepodařilo se načíst <Version> z .csproj" >&2; exit 1
fi
echo "Verze: $VERSION"

# Detekuj nativní architekturu
ARCH=$(uname -m)
if [[ "$ARCH" == "arm64" ]]; then
  RID="osx-arm64"
else
  RID="osx-x64"
fi
echo "Cílová architektura: $RID"

PUBLISH_DIR="$ROOT/publish/mac"
RELEASE_DIR="$ROOT/release"
ICON="$ROOT/build/icon.icns"

# ── 1. Publish ────────────────────────────────────────────────────────────────
echo ""
echo "[1/2] dotnet publish ($RID)..."
rm -rf "$PUBLISH_DIR"
dotnet publish "$CSPROJ" -c Release -r "$RID" --self-contained true -o "$PUBLISH_DIR"

# ── 2. vpk pack ───────────────────────────────────────────────────────────────
echo ""
echo "[2/2] vpk pack (macOS → .zip s .app bundlem)..."
mkdir -p "$RELEASE_DIR"

VPK_ARGS=(
  pack
  --packId      "Verdict"
  --packVersion "$VERSION"
  --packDir     "$PUBLISH_DIR"
  --mainExe     "Verdict"
  --outputDir   "$RELEASE_DIR"
  --packTitle   "Verdict"
)
if [[ -f "$ICON" ]]; then
  VPK_ARGS+=(--icon "$ICON")
fi

vpk "${VPK_ARGS[@]}"

# ── Výsledek ──────────────────────────────────────────────────────────────────
echo ""
echo "Hotovo — soubory v: $RELEASE_DIR"
ls -lh "$RELEASE_DIR"

# ── Volitelně: vytvoř .dmg z .zip ─────────────────────────────────────────────
# ZIP_FILE=$(ls "$RELEASE_DIR"/Verdict*.zip 2>/dev/null | head -1)
# if [[ -n "$ZIP_FILE" ]] && command -v create-dmg &>/dev/null; then
#   TMPDIR=$(mktemp -d)
#   unzip -q "$ZIP_FILE" -d "$TMPDIR"
#   create-dmg \
#     --volname "Verdict $VERSION" \
#     --window-size 600 400 \
#     --icon-size 100 \
#     "$RELEASE_DIR/Verdict-$VERSION-mac.dmg" \
#     "$TMPDIR"
#   rm -rf "$TMPDIR"
#   echo "DMG: $RELEASE_DIR/Verdict-$VERSION-mac.dmg"
# fi
