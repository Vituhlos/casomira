# Instalátory Časomíry (Windows + Mac)

> Veřejný přehled projektu: [README.md](../../README.md)

## Co dostaneš

| Systém | Soubor | Kde vznikne |
|--------|--------|-------------|
| **Windows** | `Casomira-Setup-0.9.0.exe` | složka `release/` |
| **Mac** | `Casomira-0.9.0-mac-universal.dmg` | složka `release/` (Intel x64 + Apple Silicon; jen na Macu nebo v CI) |

Instalátor na Windows přidá program do menu Start, zástupce na plochu (volitelně) a odinstalaci v Nastavení.

---

## Na tvém Windows PC (nejčastější)

1. Otevři terminál ve složce projektu.
2. Jednorázově nainstaluj závislosti (už máš z vývoje):

   ```bash
   npm install
   ```

3. Sestav instalátor:

   ```bash
   npm run dist:win
   ```

4. Výsledek: `release/Casomira-Setup-0.9.0.exe` — ten pošli časoměřiči nebo ho spusť na testovacím PC.

**Rychlý test bez instalátoru** (složka s programem, ne Setup.exe):

```bash
npm run dist:win:dir
```

→ `release/win-unpacked/Casomira.exe`

---

## Časté problémy při buildu

**EPERM / „operation not permitted“ na `better_sqlite3.node`**

Zavři běžící Časomíru i `npm run dev` (Electron drží soubor otevřený). Pak:

```bash
npm run rebuild
npm run dist:win
```

**`npm install` padá na postinstall**

Stejná příčina — ukonči appku, znovu `npm install`.

**Varování o winCodeSign / symlinky**

V `electron-builder.yml` je `signAndEditExecutable: false` — instalátor se sestaví bez podpisu kódu (pro závod u vás doma stačí). Podpis lze doplnit později s certifikátem.

**`npmRebuild: false`**

Balení nepřebuilduje native moduly automaticky. Před `dist:win` na čistém stroji stačí jednou `npm run rebuild` po `npm install`. V GitHub Actions obvykle není zamčený `.node` soubor.

---

## Mac (DMG)

DMG musíš zabalit **na Macu** (nebo nechat GitHub Actions — viz níže):

```bash
npm install
npm run dist:mac
```

→ `release/Casomira-0.9.0-mac-universal.dmg` (jeden soubor pro **Intel i Apple Silicon**)

Bez Apple Developer účtu může Mac při prvním spuštění ukázat varování — to se řeší později notarizací (není nutné pro závod u tebe doma).

**Mac padá hned po startu (SIGTRAP / exit 133)**

Typicky chybí **ad-hoc podpis s entitlements** u nepodepsaného buildu. V `electron-builder.yml` je `mac.identity: '-'` + `entitlements.mac.plist` (`disable-library-validation` pro `better-sqlite3`). V CI musí být před balením `npm run rebuild`. Ověření:

```bash
codesign -d --entitlements :- release/mac-arm64/*.app | grep disable-library-validation
```

Upgrade Electronu (37 → 39) tento problém sám neřeší — jde o macOS hardened runtime, ne o verzi Chromium.

**macOS 26: exit 133 hned po startu (Helper apps)**

Na macOS 26 může pád **nesouviset s better-sqlite3**, ale s bugem electron-builder: Helper bundly se přejmenují na `Časomíra Helper`, ale Electron binárka pořád hledá `Electron Helper` → fatální chyba při startu (SIGTRAP / exit 133). Viz [electron-builder#9771](https://github.com/electron-userland/electron-builder/issues/9771).

Workaround v repu: `scripts/afterPack-mac-helpers.cjs` (hook `afterPack` v `electron-builder.yml`).

Ověření z terminálu (místo dvojkliku):

```bash
"release/mac-arm64/Časomíra.app/Contents/MacOS/Časomíra"
# očekávaná fatální hláška před fixem: Unable to find helper app
```

---

## Obě platformy najednou (GitHub Actions)

Workflow [`.github/workflows/release.yml`](./.github/workflows/release.yml) sestaví **Windows Setup.exe** i **macOS DMG** a přiloží je k [GitHub Release](https://github.com/Vituhlos/casomira/releases).
Podrobný release proces a diagnostika jsou v [RELEASE.md](./RELEASE.md).

**Postup:**

1. Uprav verzi v `package.json` (např. `0.9.0`).
2. Doplň sekci stejné verze v `CHANGELOG.md`.
3. Ověř release metadata:

   ```bash
   npm run check:release -- v0.9.0
   npm run typecheck
   npm test
   ```

4. Commitni a pushni na GitHub.
5. Vytvoř tag se stejnou verzí (s prefixem `v`):

   ```bash
   git tag v0.9.0
   git push origin v0.9.0
   ```

6. V repu **Actions → Release** sleduj běh (2 joby: Windows + macOS, pak Publish).
7. Hotové soubory najdeš u **Releases** u daného tagu.

**Ruční spuštění:** Actions → **Release** → **Run workflow** → zadej tag (např. `v0.9.0`). Tag musí na GitHubu existovat (`git push origin v0.9.0`), jinak krok Publish selže.

Mac DMG v CI je **universal** (x64 + arm64) a jede **bez notarizace** (`CSC_IDENTITY_AUTO_DISCOVERY=false`) — na cizím Macu může Gatekeeper vyžadovat „Otevřít přesto“ v System Settings. Build na Macu trvá déle než samotný arm64.

---

## Ikona aplikace (volitelné)

Teď se použije výchozí Electron ikona. Až budeš mít logo:

1. Připrav **PNG 512×512** (průhledné pozadí).
2. Ulož jako `build/icon.png`.
3. Vygeneruj `.ico` / `.icns` (např. [cloudconvert.com](https://cloudconvert.com/png-to-ico)) do `build/icon.ico` a `build/icon.icns`.
4. Odkomentuj řádky `installerIcon` / `icon` v `electron-builder.yml`.

---

## Příkazy

| Příkaz | Co dělá |
|--------|---------|
| `npm run build` | Zkompiluje appku do `out/` (bez instalátoru) |
| `npm run dist:win` | Windows instalátor NSIS |
| `npm run dist:mac` | macOS DMG |
| `npm run dist` | Balíček pro aktuální OS |
