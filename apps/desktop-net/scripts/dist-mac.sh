#!/usr/bin/env bash
# Sestaví macOS .app + .dmg pro Verdict (.NET/Avalonia).
# Spusť na macOS ve složce apps/desktop-net/.
#
# Vyžaduje:
#   - .NET 9 SDK  (dotnet --version)
#   - vpk CLI     (dotnet tool install -g vpk)
#   - create-dmg  (brew install create-dmg)   # volitelné, hezčí DMG
#
# Výstup: release/Verdict-<verze>-mac-universal.dmg

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
CSPROJ="$ROOT/Verdict.Desktop/Verdict.Desktop.csproj"

# ── Verze z .csproj ───────────────────────────────────────────────────────────
VERSION=$(grep -oP '(?<=<Version>)[^<]+' "$CSPROJ" | head -1)
if [[ -z "$VERSION" ]]; then
  echo "Nepodařilo se načíst <Version> z .csproj" >&2; exit 1
fi
echo "Verze: $VERSION"

PUBLISH_X64="$ROOT/publish/mac-x64"
PUBLISH_ARM64="$ROOT/publish/mac-arm64"
RELEASE_DIR="$ROOT/release"
ICON="$ROOT/build/icon.icns"

# ── 1. Publish x64 + arm64 ────────────────────────────────────────────────────
echo ""
echo "[1/3] dotnet publish (osx-x64)..."
rm -rf "$PUBLISH_X64"
dotnet publish "$CSPROJ" -c Release -r osx-x64 --self-contained true -o "$PUBLISH_X64"

echo ""
echo "[2/3] dotnet publish (osx-arm64)..."
rm -rf "$PUBLISH_ARM64"
dotnet publish "$CSPROJ" -c Release -r osx-arm64 --self-contained true -o "$PUBLISH_ARM64"

# ── Universal binary (lipo) ───────────────────────────────────────────────────
PUBLISH_UNI="$ROOT/publish/mac-universal"
rm -rf "$PUBLISH_UNI"
cp -R "$PUBLISH_X64" "$PUBLISH_UNI"

# Sloučit hlavní binárku do universal binary pomocí lipo
if command -v lipo &>/dev/null; then
  echo "Slučuji do universal binary (lipo)..."
  lipo -create \
    "$PUBLISH_X64/Verdict" \
    "$PUBLISH_ARM64/Verdict" \
    -output "$PUBLISH_UNI/Verdict"
else
  echo "lipo nenalezeno — přeskakuji universal binary, použiji pouze x64"
fi

# ── 3. vpk pack ───────────────────────────────────────────────────────────────
echo ""
echo "[3/3] vpk pack (macOS)..."
mkdir -p "$RELEASE_DIR"

VPK_ARGS=(
  pack
  --packId      "Verdict"
  --packVersion "$VERSION"
  --packDir     "$PUBLISH_UNI"
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
