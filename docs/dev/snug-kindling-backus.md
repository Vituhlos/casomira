# Rebranding Časomíra → Verdict

## Context

Appka „Časomíra" se přejmenovává na **Verdict**. Hotové brand assety leží v
`docs/user/verdict/` (ikony `.ico`/`.icns`, favicony, SVG/PNG lockupy light/dark,
fonty, brand barva **Race Blue `#2563FF`**). Cíl: kompletní rebrand — viditelné
jméno, balení, ikony, logo i interní identifikátory v kódu — **bezpečně**, bez
ztráty dat existujících uživatelů.

**Rozhodnutí uživatele:**
- **Nový appId `cz.verdict.app`** → Verdict se instaluje *vedle* Časomíry (stará
  zůstane, žádná destruktivní odinstalace). Data se přesto zmigrují kopií.
- **Zůstat v `0.9.x-beta`** (žádný bump na 1.0.0).
- **Přejmenovat i kód** (typy, CSS třídy, klíče, DB soubor), ale **formát záloh
  nechat zpětně kompatibilní** (staré `.json` zálohy půjdou dál importovat).
- **GitHub repo přejmenovat až úplně na konec** (samostatná fáze 8) — GitHub
  přesměrovává staré URL i API, takže updater funguje po celou dobu rebrandu.

**Klíčové riziko — migrace dat:** data leží v `%APPDATA%\Časomíra\casomira.db`
(Windows; userData = `appData` + productName). Po změně productName na `Verdict`
hledá appka v `%APPDATA%\Verdict\` → prázdno. Řešení: jednorázová **kopie** staré
DB při prvním startu (orig zůstane jako záloha). Ověřeno: WAL je zapnutý
([connection.ts:20](src/main/db/connection.ts)), takže kopírovat i `-wal`/`-shm`.

---

## Fáze 0 — Předstartovní záloha a pojistky

Než se začne měnit identita/balení:

- **Zavřít aplikaci Časomíra i Stopky** (a ideálně ověřit, že neběží žádný
  proces `Casomira`/`Časomíra`). Kopie SQLite s WAL je nejbezpečnější, když stará
  appka zrovna nezapisuje.
- **Git pojistka:** založit pracovní branch pro rebrand (např.
  `codex/verdict-rebrand`) a uložit výchozí stav (`git status --short`). Protože
  assety ve `docs/user/verdict/` jsou teď necommitnuté, samotný commit aktuálního
  `HEAD` nestačí — před startem buď commitnout plán+assety, nebo udělat archiv
  celého pracovního stromu včetně untracked souborů.
- **Datová záloha:** zkopírovat fyzickou složku
  `%APPDATA%\Časomíra\` do timestampované zálohy mimo app-data, např.
  `bordel/backups/pre-verdict-YYYYMMDD-HHMMSS/Časomíra/`. Pokud už existuje
  `%APPDATA%\Verdict\`, zazálohovat i ji.
- **Logická záloha:** pokud aktuální appka startuje, udělat navíc export
  „Zálohovat všechny závody" do `.json`. Fyzická kopie chrání runtime data,
  JSON export chrání přenositelnost/importní scénář.
- **Obnova:** do poznámky k záloze uložit, odkud byla kopírována a kam se má
  vrátit. Při rollbacku se nepřepisuje stará Časomíra bez vědomého rozhodnutí.

---

## Fáze 1 — Identita a balení

- **[electron-builder.yml](electron-builder.yml):** `appId` → `cz.verdict.app`;
  `productName` → `Verdict`; `copyright` → `Copyright © Verdict`;
  `win.executableName` → `Verdict`; `win.artifactName` → `Verdict-Setup-${version}.${ext}`;
  `mac.artifactName` → `Verdict-${version}-mac-universal.${ext}`;
  `nsis.shortcutName` / `uninstallDisplayName` → `Verdict`; `dmg.title` → `Verdict ${version}`.
  Cesty k ikonám (`build/icon.*`) zůstávají — vyměníme jejich obsah (Fáze 4).
- **[package.json](package.json):** `name` `casomira` → `verdict`; `description`;
  `author`. Stejnou změnu propsat i do **[package-lock.json](package-lock.json)**.
  URL repa (`repository`/`homepage`/`bugs`) → **Fáze 8**; `docs:word` výstupní
  názvy řešit už s user-facing dokumentací ve **Fázi 6**.
- **[scripts/generate-build-info.mjs](scripts/generate-build-info.mjs):**
  `productName: 'Časomíra'` → `'Verdict'` (přegeneruje `buildInfo.generated.ts` při buildu;
  `version.ts` `APP_NAME` z něj čte automaticky).

## Fáze 2 — Migrace databáze (bezpečnostně kritické)

V [src/main/db/connection.ts](src/main/db/connection.ts):
- DB soubor `casomira.db` → `verdict.db` (v `getDb()` i `dbPath()`).
- Před otevřením přidat jednorázovou migraci `migrateLegacyData()`:
  - nová cesta = `join(userData, 'verdict.db')`; pokud **neexistuje**:
  - legacy = `join(app.getPath('appData'), 'Časomíra', 'casomira.db')`; pokud existuje →
    kopie legacy → nová (a stejně tak `casomira.db-wal`, `casomira.db-shm`, pokud jsou).
  - **kopie, ne přesun** (originál zůstane jako záloha); idempotentní (po vytvoření
    `verdict.db` se přeskočí); logovat přes existující `startup.log` vzor z
    [index.ts](src/main/index.ts).
  - guard `app.isPackaged` — v dev nech čisté (dev userData je `%APPDATA%\verdict`).
- Aktualizovat komentář o cestě (zmínka „Časomíra" → „Verdict").

**Pojistky migrace:**
- Migrovat až po `mkdirSync(userData)` a **před** `new DatabaseSync(...)`.
- Neimportovat `logStartup` z `index.ts` (hrozil by import cyklus); v DB vrstvě
  použít malý lokální helper se stejným principem zápisu do `startup.log`.
- Nekopírovat rovnou do finálního `verdict.db`: nejdřív vytvořit dočasnou složku
  pod `userData`, zkopírovat tam trio jako `verdict.db`, `verdict.db-wal`,
  `verdict.db-shm`, otevřít kopii a spustit `PRAGMA integrity_check`.
- Teprve když integrity check vrátí `ok`, atomicky přesunout/rename do finální
  cesty. Při chybě nemazat legacy data, zalogovat důvod a spadnout s čitelnou
  chybou místo vytvoření poloviční databáze.
- Pokud finální `verdict.db` už existuje, migraci přeskočit. Pokud existuje, ale
  integrity check nové DB selže, nesahat na legacy kopii a ukázat chybu.

## Fáze 3 — Viditelné texty

- **[src/main/index.ts](src/main/index.ts):** titulek hlavního okna, 3 chybové
  dialogy, macOS menu (`O Verdictu` / `Skrýt Verdict` / `Ukončit Verdict`).
- **[src/main/windows.ts](src/main/windows.ts):** `Stopky — Verdict` (prefix
  „Stopky" **musí zůstat** — detekuje ho [stopkyClose.ts](src/main/stopkyClose.ts) při zavírání).
- **[src/renderer/index.html](src/renderer/index.html):** `<title>` + přidat favicon link.
- **[src/renderer/src/App.tsx](src/renderer/src/App.tsx):** `document.title` (3×).
- **[src/renderer/src/screens/DevKit.tsx](src/renderer/src/screens/DevKit.tsx):** nadpis (dev).
- **Backup dialogy/texty:** `Záloha Časomíry (.json)` a validační hlášky přepsat
  na Verdict, ale u legacy importu v chybě jasně zmínit, že starý formát
  `casomira-backup` je dál podporovaný.

## Fáze 4 — Assety (ikony, logo, favicon, barva)

- **App ikony** → kopírovat z `docs/user/verdict/app-icons/`:
  `windows/casomira.ico` → `build/icon.ico`; `macos/casomira.icns` → `build/icon.icns`;
  vhodné PNG (např. `windows/png/casomira-256.png`) → `build/icon.png`.
  (Pozn.: assety mají v `verdict/` u ikon ještě starý název souboru, kopíruje se obsah.)
- **In-app logo:** obsah `docs/user/verdict/logo/verdict-lockup-horizontal-{light,dark}.svg`
  → nahradit + **přejmenovat** `src/renderer/src/assets/brand/casomira-lockup-*.svg`
  na `verdict-lockup-*.svg`; upravit importy v
  [ShellSidebar.tsx](src/renderer/src/components/ShellSidebar.tsx) a
  [RaceList.tsx](src/renderer/src/screens/RaceList.tsx) + `alt="Verdict"`.
- **Favicon:** zkopírovat `docs/user/verdict/favicon/favicon.ico` do rendereru a nalinkovat v `index.html`.
- **Brand barva:** lockupy nesou vlastní `#2563FF`. Volitelně sladit přízvukovou
  barvu HeroUI primary na Race Blue (mimo nutný rozsah — označit jako volitelné).
- **README/GitHub obrázky:** pokud README přestane používat staré `assets/brand/casomira-*`,
  doplnit nové Verdict obrázky (např. z `docs/user/verdict/github/`) nebo staré
  root brand assety nahradit novým obsahem tak, aby alt text i obraz seděly.

## Fáze 5 — Interní přejmenování v kódu

- **Typy:** `CasomiraApi` → `VerdictApi` ([types.ts](src/shared/types.ts),
  [preload/index.ts](src/preload/index.ts), [preload/index.d.ts](src/preload/index.d.ts));
  `CasomiraBackupFile` → `VerdictBackupFile` ([backup/](src/main/backup)).
- **Formát záloh (zpětně kompatibilní):** v [backup/types.ts](src/main/backup/types.ts)
  `BACKUP_FORMAT` → `'verdict-backup'` + přidat `LEGACY_BACKUP_FORMAT = 'casomira-backup'`;
  ve [validate.ts](src/main/backup/validate.ts) přijímat **oba** formáty (čte staré,
  zapisuje nové).
- **CSS:** přejmenovat soubor `theme/casomira.css` → `theme/verdict.css` (+ `@import`
  v [main.css](src/renderer/src/styles/main.css)); třídy `.casomira-logo*` → `.verdict-logo*`.
- **Klíče/prefixy:** `casomira:theme` → `verdict:theme` ([useTheme.ts](src/renderer/src/hooks/useTheme.ts));
  `casomira:generate-rost` → `verdict:generate-rost` ([hotkeys.ts](src/renderer/src/lib/hotkeys.ts));
  `casomira.preferovanaTiskarna` → `verdict.preferovanaTiskarna`
  ([App.tsx](src/renderer/src/App.tsx));
  savepoint `casomira_sp_` → `verdict_sp_` ([transaction.ts](src/main/db/transaction.ts));
  temp tiskové soubory `casomira-print-*` → `verdict-print-*` ([pdf.ts](src/main/pdf.ts)).
  (Pozn.: `casomira:theme` se resetne na default — userData se stejně mění, je to neznatelné.)

## Fáze 6 — CI workflow + dokumentace (jde s rebrandem, NE s repem)

- **CI artefakty/jména** (musí ladit s novými `artifactName` z Fáze 1):
  [release.yml](.github/workflows/release.yml) (`artifact_glob` Casomira-* → Verdict-*,
  název Release), [smoke-test.yml](.github/workflows/smoke-test.yml) (macOS spustitelný
  `Verdict`), [release.md](.github/ISSUE_TEMPLATE/release.md),
  [release-notes.mjs](scripts/release-notes.mjs).
- **Docs:** [README.md](README.md) (nadpis, alt, jména instalátorů),
  [CHANGELOG.md](CHANGELOG.md) (záznam do `[Nevydáno]` o rebrandu),
  [CLAUDE.md](CLAUDE.md) (zmínky instalátoru), `docs:word` výstupní názvy v
  [package.json](package.json). Historické plánovací docs v `docs/dev/**`
  necháme (nejsou produkční) — volitelný úklid později.

## Fáze 7 — Ověření

- `npm run typecheck` a `npm test` — musí zůstat zelené.
- **Unit testy záloh:** přidat/ověřit, že import přijme starý
  `casomira-backup` i nový `verdict-backup`; export zapisuje pouze
  `verdict-backup`.
- **Test migrace (nejdůležitější):** dočasně vytvořit `%APPDATA%\Časomíra\casomira.db`
  s ukázkovými daty (nebo zkopírovat existující), spustit appku, ověřit: závody se
  načtou, vznikne `%APPDATA%\Verdict\verdict.db`, originál zůstal nedotčen. Druhý
  start migraci přeskočí.
- **Test poškozené/částečné migrace:** simulovat chybějící nebo poškozený legacy
  soubor/WAL a ověřit, že nevznikne poloviční finální `verdict.db`, legacy data
  zůstanou beze změny a chyba je čitelně zalogovaná.
- **Vizuál:** titulek okna, ikona v liště, logo v sidebaru/RaceList, okno Stopek,
  panel O aplikaci = Verdict.
- **Balení:** `npm run build`; volitelně `npm run dist:win:dir` → ověřit `Verdict.exe`,
  `Verdict-Setup` název a oddělený appId (Časomíra zůstane).
- **Zálohy:** import staré `casomira-backup` `.json` funguje; export zapisuje `verdict-backup`.

## Fáze 8 — DEFEROVÁNO (až po ověření celého rebrandu)

Až vše výše projde a otestuje se, přejmenovat GitHub repo `Vituhlos/casomira` →
`verdict` (na GitHubu) a jedním commitem doladit: `REPO` v
[updater.ts](src/main/updater.ts) (+ `User-Agent`), URL repa v
[package.json](package.json), odkazy v [README.md](README.md)/docs.

---

## Riziková pojistka (shrnutí)

- Migrace **kopíruje**, nemaže → stará data zůstanou v `%APPDATA%\Časomíra`.
- **Nový appId** → instalátor Verdictu nepřepíše ani neodinstaluje Časomíru.
- **Formát záloh zpětně kompatibilní** → staré zálohy importovatelné.
- Migrace se testuje **před** vydáním (Fáze 7).
- Repo rename až **na konci**, izolovaně.

## Commit strategie

Logické commity po fázích (česky, dle konvence): identita+balení / migrace DB /
viditelné texty / assety / interní přejmenování / CI+docs. Fáze 8 samostatně později.
