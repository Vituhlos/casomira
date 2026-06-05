# Issue 008 — macOS nativní verze ve SwiftUI, Windows Electron ponechat

## Stav

Plánováno / technická analýza.

## Cíl

Zvážit a naplánovat vytvoření nové nativní macOS verze aplikace Časomíra ve **Swift + SwiftUI**, aby na macOS působila čistě nativně a odpovídala macOS 26 feelu. Současnou Electron/React verzi ponechat pro Windows.

Cílový stav:

```text
Windows → stávající Electron + React + TypeScript aplikace
macOS   → nová nativní SwiftUI aplikace
```

Důležitý princip: nativní macOS verze nesmí změnit pravidla závodu, výpočty výsledků ani datový model bez záměru. Musí být kompatibilní s existujícími daty, zálohami a workflow.

---

## Shrnutí náročnosti

### Celkové hodnocení

Náročnost je **vysoká**. Nejde jen o „překreslení UI“, protože v dnešní aplikaci je hodně produktové logiky v TypeScriptu na Electron main straně a UI přes `window.api` volá mnoho aplikačních operací.

Odhad:

| Varianta | Popis | Náročnost | Riziko |
| --- | --- | --- | --- |
| A | Ponechat Electron, jen zlepšit macOS CSS/HIG | nízká až střední | malé |
| B | SwiftUI shell + volání původního Node/Electron backendu | střední | střední, nepůsobí plně čistě |
| C | Plnohodnotná SwiftUI app + port core logiky do Swiftu | vysoká | vysoké, ale nejlepší nativní výsledek |

Doporučení: pokud je cílem opravdu čistý macOS feel, zvolit **variantu C**, ale dělat ji fázovaně a s testy proti současné aplikaci.

---

## Aktuální stav aplikace podle kontroly kódu

### Technologie

Aplikace je dnes Electron desktop s React/Vite/TypeScript UI, lokální SQLite přes `better-sqlite3`, PDF exportem přes Electron tisk a Excel importem přes SheetJS.

Hlavní NPM skripty a závislosti ukazují, že současná appka je jedna Electron codebase pro Windows i macOS:

```text
Electron + Vite + React + TypeScript
better-sqlite3
xlsx
Electron Builder pro Windows/macOS balíčky
```

### Aplikační vrstvy

Současné rozdělení:

```text
src/main        Electron main proces, DB, migrace, repo logika, PDF, Excel, backup, IPC
src/preload     bezpečný bridge window.api
src/shared      sdílené typy
src/renderer    React UI, obrazovky, komponenty, stopky UI
```

Prakticky to znamená:

- UI není jen statické; hodně obrazovek přímo volá `window.api`.
- Main proces je faktická aplikační služba.
- Databázová logika je centralizovaná v `src/main/repo.ts`.
- Pravidla závodu jsou v `src/main/scoring.ts`, `src/main/zaver.ts` a částečně v `repo.ts`.
- PDF a Excel import jsou nativně navázané na Node/Electron knihovny.

---

## Co by se muselo portovat do Swiftu

### 1. Datový model a SQLite

Soubory ke srovnání / portu:

```text
src/main/db/schema.ts
src/main/db/migrate.ts
src/main/db/seed.ts
src/main/db/connection.ts
src/shared/types.ts
```

Co převést:

- SQLite schema,
- migrace a `user_version`,
- seed dat,
- modely `Zavod`, `Kategorie`, `Jezdec`, `Kolo`, `Jizda`, `Vysledek`, `Mereni`, backup typy,
- aplikační nastavení (`nastaveni`, logo, PDF root, aktivní závod),
- kompatibilita se stávající DB souborem v app-data adresáři.

Doporučené Swift řešení:

- použít `GRDB` nebo přímé `SQLite3`,
- vytvořit Swift modul `CasomiraCore`,
- držet SQLite schema kompatibilní s Electron verzí minimálně po přechodnou dobu,
- používat stejné `PRAGMA user_version` migrace.

Pozor:

- Staré Electron DB soubory mohou používat WAL.
- Je potřeba přesně rozhodnout cestu k DB na macOS (`Application Support/Časomíra/casomira.db`).
- Pokud má macOS SwiftUI verze otevřít starou DB, musí umět všechny dosavadní migrace.

### 2. Repository vrstva

Největší port je `src/main/repo.ts`.

Obsahuje mimo jiné:

- správu závodů,
- správu kategorií,
- správu jezdců,
- import jezdců,
- generování roštů,
- výsledky jízd,
- ruční přepisy bodů,
- penalizace,
- audit log,
- agregáty Q1/Q2,
- klasifikace,
- semifinále/finále,
- celkové výsledky,
- stopky/měření,
- nastavení.

Doporučení:

- neportovat mechanicky 1:1 bez testů,
- nejdřív z `repo.ts` vytvořit mapu use-casů,
- pro každý use-case vytvořit Swift service metodu,
- výsledky ověřovat proti fixture datům ze stávající appky.

Navržený Swift modul:

```text
CasomiraCore
├── Models
├── Database
├── Repositories
├── RaceRules
├── Scoring
├── Rosty
├── Results
├── Backup
└── ImportExport
```

### 3. Bodování a pravidla závodu

Soubory:

```text
src/main/scoring.ts
src/main/zaver.ts
src/main/repo.ts
```

Co převést:

- výpočet pořadí jízdy,
- DNF/DNS/DQ penalizace,
- body podle žebříčku,
- ruční posun pořadí,
- časové a bodové penalizace,
- klasifikace po Q1/Q2/Q3,
- kvalifikace do SF/finále,
- nasazení SF,
- nasazení finále,
- celkové pořadí.

Doporučení:

- portovat jako čisté Swift funkce bez UI a bez SQLite,
- napsat unit testy v Swiftu,
- vytvořit golden testy porovnáním s dnešní TypeScript logikou.

### 4. React UI přepsat do SwiftUI

Soubory / obrazovky:

```text
src/renderer/src/App.tsx
src/renderer/src/StopkyApp.tsx
src/renderer/src/screens/StartList.tsx
src/renderer/src/screens/Grids.tsx
src/renderer/src/screens/RostGrid.tsx
src/renderer/src/screens/Results.tsx
src/renderer/src/screens/Standings.tsx
src/renderer/src/screens/Semifinale.tsx
src/renderer/src/screens/Finale.tsx
src/renderer/src/screens/Overall.tsx
src/renderer/src/screens/RaceDialog.tsx
src/renderer/src/screens/Settings.tsx
```

SwiftUI ekvivalenty:

```text
NavigationSplitView     levý sidebar kategorií
Toolbar                 nativní macOS toolbar
Table / Grid            tabulky jezdců, roštů, výsledků
Sheet                   import, nastavení, penalizace, úpravy závodu
WindowGroup             hlavní okno + samostatné okno stopek
Commands                macOS menu, klávesové zkratky
Settings scene          nativní Preferences/Settings
```

UI, které by se muselo přepsat:

- úvodní launcher / seznam závodů,
- levý sidebar kategorií,
- toolbar a fáze,
- startovní listina,
- rošty,
- výsledky,
- klasifikace,
- semifinále,
- finále,
- celkové výsledky,
- nastavení,
- import dialog,
- backup/restore,
- penalizace,
- audit log,
- stopky jako samostatné okno.

Poznámka: SwiftUI port je příležitost zrušit ručně emulovaný macOS vzhled v CSS a použít skutečné nativní prvky.

### 5. Stopky a měření

Soubor:

```text
src/renderer/src/StopkyApp.tsx
```

Současné stopky mají:

- samostatné okno,
- výběr jízdy/kategorie/kola,
- více kanálů,
- persistentní timer stav,
- záznam kliků,
- opravy časů,
- přiřazení startovních čísel,
- zápis měření do výsledků,
- ochranu proti zavření s neuloženými daty.

SwiftUI/AppKit řešení:

- samostatný `WindowGroup` nebo AppKit `NSWindow`,
- timer přes `ContinuousClock`/`Timer` podle požadované přesnosti,
- ukládání timer stavu do SQLite stejně jako dnes,
- globální/nativní klávesové zkratky přes `Commands`, případně lokálně ve window scene,
- upozornění při zavírání přes `NSWindowDelegate`.

Riziko: stopky jsou provozně kritická část. Portovat až po stabilizaci core logiky a psát extra testy.

### 6. PDF export a tisk

Soubor:

```text
src/main/pdf.ts
```

Současný stav:

- PDF se generuje jako HTML a tiskne se přes Electron `webContents.printToPDF`,
- exportuje se jeden list nebo hromadně všechny listy,
- používá logo a cílovou PDF složku,
- má vlastní HTML/CSS layout pro tisk.

SwiftUI/macOS možnosti:

1. **SwiftUI view → PDF**
   - generovat tiskové SwiftUI views a renderovat přes AppKit/PDF context.
2. **HTML template → WKWebView → PDF**
   - nejbližší dnešnímu řešení,
   - snazší zachovat vzhled PDF.
3. **PDFKit/CoreGraphics ručně**
   - největší kontrola,
   - nejvíc práce.

Doporučení pro MVP Swift portu:

- pro první verzi použít HTML template + `WKWebView`/print operation, aby PDF výstupy byly co nejpodobnější dnešním,
- později zvážit čisté SwiftUI/PDFKit šablony.

### 7. Excel import

Soubor:

```text
src/main/excel.ts
```

Současný stav:

- import `.xls/.xlsx` přes SheetJS,
- hledání hlavičky,
- mapování sloupců,
- mapování sheetů na kategorie,
- náhled konfliktů.

Swift možnosti:

- použít Swift knihovnu pro `.xlsx`,
- nebo použít CSV jako meziformát,
- nebo v první fázi zachovat import jen přes `.xlsx` knihovnu a explicitně omezit `.xls`, pokud nebude dobrá podpora.

Riziko: Excel import je často zdroj edge-case problémů. Nutné testovat na reálných souborech.

### 8. Backup/restore

Soubory:

```text
src/main/backup/*
src/shared/backup.ts
```

Co převést:

- JSON formát záloh,
- export jednoho závodu,
- export celé databáze,
- preview restore,
- collision handling,
- import global tables.

Doporučení:

- zachovat přesně stejný JSON backup formát,
- napsat cross-platform test:
  - Electron export → Swift import,
  - Swift export → Electron import.

### 9. Nastavení, logo, soubory, systémové integrace

Současné Electron části:

- nativní file dialogs,
- otevření složky v systému,
- logo do PDF,
- PDF root,
- backup dialogy,
- macOS menu,
- quit guard pro stopky.

SwiftUI/AppKit ekvivalenty:

- `FileImporter` / `FileExporter`,
- `NSOpenPanel` / `NSSavePanel`,
- `NSWorkspace.open`,
- `Settings` scene,
- `Commands`,
- AppKit delegate pro zavírání oken.

---

## Doporučená architektura repa

Zachovat Windows appku beze změny a přidat vedle ní macOS nativní projekt.

Navržená struktura:

```text
src/                         stávající Electron/Windows app
macos/
  Casomira.xcodeproj nebo Package.swift
  CasomiraMac/
    App/
    Views/
    Windows/
    Resources/
  CasomiraCore/
    Models/
    Database/
    Repositories/
    Rules/
    ImportExport/
    Backup/
  CasomiraCoreTests/
```

Alternativa se Swift Package Managerem:

```text
macos/Package.swift
macos/Sources/CasomiraCore
macos/Sources/CasomiraMac
macos/Tests/CasomiraCoreTests
```

Doporučení:

- core logiku dát do testovatelného Swift package,
- UI dát do Xcode app targetu,
- CI pro macOS build vést odděleně od Electron Windows buildu.

---

## Kompatibilita s Windows verzí

Windows Electron verze má zůstat zachovaná.

To znamená:

- nezrušit `package.json` workflow,
- nezrušit Electron main/renderer,
- nezrušit stávající DB migrace,
- nezměnit backup formát bez verze/migrace,
- při změně pravidel nejdřív sjednotit obě platformy.

Dlouhodobě budou dvě implementace stejné domény:

```text
TypeScript core pro Windows Electron
Swift core pro macOS SwiftUI
```

To je riziko dvojí údržby. Proto je zásadní mít:

- sdílené test fixtures,
- stejný SQLite schema versioning,
- stejný backup JSON formát,
- checklist pro změny pravidel na obou platformách.

---

## Varianty realizace

### Varianta A — jen vylepšit Electron macOS skin

Co by se dělalo:

- upravit CSS,
- použít nativnější spacing, typografii, toolbar,
- ponechat Electron.

Výhody:

- nejrychlejší,
- jedna codebase,
- minimální riziko rozdílných pravidel.

Nevýhody:

- nikdy to nebude plně nativní macOS aplikace,
- tabulky, menu a interakce zůstanou webové.

### Varianta B — SwiftUI shell + původní backend

Co by se dělalo:

- SwiftUI UI,
- backend by zůstal Node/TypeScript jako helper proces,
- komunikace přes lokální IPC/JSON.

Výhody:

- není nutné hned portovat pravidla,
- SwiftUI UI může být nativnější.

Nevýhody:

- složitá distribuce,
- pořád závislost na Node runtime,
- horší debug,
- není to čistý macOS native stack.

### Varianta C — plný SwiftUI port

Co by se dělalo:

- SwiftUI app,
- Swift core,
- Swift SQLite vrstva,
- Swift PDF/import/backup.

Výhody:

- nejlepší macOS feel,
- menší runtime balík,
- nativní menu, okna, tabulky, nastavení, tisk.

Nevýhody:

- nejvíc práce,
- dvojí údržba s Windows verzí,
- vysoké riziko odchylky v pravidlech, pokud nebudou testy.

Doporučení: pro cíl „čistý nativní macOS 26 feel“ dává smysl varianta C, ale realizovat ji postupně.

---

## Navržený implementační plán

### Fáze 0 — Zmrazit pravidla a vytvořit test fixtures

Cíl: než se začne portovat, mít jistotu, že Swift bude počítat stejně jako současná appka.

Úkoly:

- připravit několik testovacích SQLite databází nebo JSON fixture:
  - malá kategorie 5 jezdců,
  - běžná kategorie 16 jezdců,
  - kategorie s DNF/DNS/DQ,
  - kategorie se shodou bodů,
  - kategorie se semifinále,
  - kategorie s finále,
  - backup/restore fixture,
  - import Excel fixture.
- v TypeScriptu vygenerovat očekávané výstupy:
  - rošty,
  - výsledky,
  - klasifikace,
  - finále,
  - celkově,
  - PDF seznam listů.

Výstup:

- `fixtures/` nebo `docs/dev/fixtures/`,
- sada očekávaných JSON výsledků.

### Fáze 1 — Swift project skeleton

Úkoly:

- přidat `macos/` složku,
- založit SwiftUI app target,
- založit `CasomiraCore` Swift package,
- nastavit unit test target,
- nastavit základní CI build na macOS,
- sjednotit verzi aplikace se stávajícím `package.json` nebo zavést sdílený version file.

Výstup:

- prázdná nativní macOS appka, která se spustí.

### Fáze 2 — SQLite a modely

Úkoly:

- portovat modely ze `src/shared/types.ts`,
- implementovat SQLite connection,
- implementovat migrace,
- implementovat seed,
- otevřít existující DB soubor,
- načíst seznam závodů a kategorií.

Výstup:

- SwiftUI app zobrazí seznam závodů a kategorií z reálné databáze.

### Fáze 3 — Core pravidla a repository

Úkoly:

- portovat scoring,
- portovat generování roštů,
- portovat výsledky,
- portovat klasifikace,
- portovat semifinále/finále,
- portovat celkové pořadí,
- portovat penalizace a audit log.

Výstup:

- Swift unit testy pro core logiku procházejí proti fixture výstupům z TypeScript verze.

### Fáze 4 — Základní SwiftUI UI

Úkoly:

- NavigationSplitView se závody/kategoriemi,
- toolbar,
- fázová navigace,
- Startovní listina,
- Rošty,
- Výsledky,
- Klasifikace,
- Semifinále,
- Finále,
- Celkově.

Výstup:

- macOS appka umožní projít celý závod bez PDF/importu/stopek.

### Fáze 5 — Editace a provozní workflow

Úkoly:

- inline editace jezdců,
- ruční úpravy roštů,
- ruční zadávání časů,
- DNF/DNS/DQ,
- penalizace,
- nastavení závodu,
- mazání/přidávání závodů a kategorií.

Výstup:

- appka je použitelná pro ruční správu závodu.

### Fáze 6 — Stopky

Úkoly:

- samostatné okno stopek,
- timer kanály,
- klávesové zkratky,
- persistentní timer stav,
- záznam měření,
- oprava časů,
- zápis do výsledků,
- ochrana proti zavření s neuloženými daty.

Výstup:

- nativní stopky funkčně odpovídají Electron verzi.

### Fáze 7 — Import, backup, PDF, tisk

Úkoly:

- Excel import,
- JSON backup/restore,
- PDF export,
- hromadný export,
- tisk,
- logo v PDF,
- cílová složka PDF.

Výstup:

- macOS app má kompletní provozní feature parity.

### Fáze 8 — macOS polish a distribuce

Úkoly:

- nativní Settings,
- menu commands,
- klávesové zkratky,
- Dock/menu chování,
- notarizace,
- Sparkle nebo jiný update mechanismus, pokud bude potřeba,
- DMG/notarized release,
- uživatelský návod pro macOS SwiftUI verzi.

Výstup:

- beta macOS SwiftUI release.

---

## Doporučené MVP pro první SwiftUI verzi

První SwiftUI MVP by nemělo hned nahrazovat produkční Electron macOS build v den závodu.

Doporučený MVP:

- otevřít existující DB,
- zobrazit závody/kategorie,
- zobrazit startovní listinu,
- zobrazit a generovat rošty,
- zobrazit a zadávat výsledky,
- spočítat klasifikaci,
- spočítat finále/celkově,
- mít unit testy core logiky.

Mimo první MVP:

- stopky,
- PDF,
- Excel import,
- backup/restore,
- Sportity,
- notarizovaný release.

Důvod: nejprve ověřit, že port pravidel a databáze sedí.

---

## Největší rizika

### 1. Dvojí implementace pravidel

Windows bude mít TypeScript logiku, macOS Swift logiku. Každá změna pravidel se musí udělat dvakrát.

Mitigace:

- golden fixtures,
- cross-platform testy,
- checklist v PR šabloně,
- sdílený popis pravidel v docs.

### 2. Kompatibilita SQLite DB

Swift app musí otevřít existující DB a respektovat migrace.

Mitigace:

- testovat na kopiích reálných DB,
- nikdy nemigrovat DB destruktivně bez backupu,
- před první Swift betou udělat automatickou zálohu DB.

### 3. PDF rozdíly

PDF z macOS SwiftUI může vypadat jinak než Electron PDF.

Mitigace:

- v první verzi použít HTML/WKWebView přístup,
- porovnat výstupy vizuálně,
- zamknout názvy souborů a obsah tabulek.

### 4. Excel import

SheetJS je robustní; Swift knihovna nemusí pokrýt všechny případy.

Mitigace:

- otestovat na reálných přihláškách,
- zvážit podporu CSV jako fallback,
- v první fázi držet import v Electron verzi, dokud Swift import není ověřen.

### 5. Stopky

Stopky jsou kritické při závodě.

Mitigace:

- portovat později,
- udělat dlouhodobý test přesnosti,
- test zavření/obnovení okna,
- test neuložených měření.

---

## Co by se mělo změnit ve stávajícím repu

### Přidat macOS složku

```text
macos/
```

### Přidat sdílené fixture testy

```text
test-fixtures/
  races/
  expected/
```

### Přidat dokumentaci buildů

```text
docs/dev/BUILD-MACOS-SWIFT.md
```

### Upravit CI

Přidat samostatný workflow:

```text
.github/workflows/macos-swift.yml
```

Ten by dělal:

- Swift build,
- Swift tests,
- případně Xcode archive bez podpisu.

### Zachovat stávající Windows/Electron workflow

Stávající `package.json`, `electron-builder.yml` a Electron buildy pro Windows nemazat.

---

## Akceptační kritéria pro rozhodnutí „jdeme do SwiftUI portu“

Před zahájením plného portu by mělo být splněno:

- Existují fixtures pro hlavní pravidla závodu.
- Je rozhodnuto, jestli Swift app bude otevírat stejnou DB, nebo vlastní migrovanou kopii.
- Je vybraná SQLite knihovna pro Swift.
- Je potvrzený způsob PDF exportu.
- Je potvrzený způsob Excel importu.
- Je jasné, kdo bude udržovat dvojí implementaci pravidel.
- Windows Electron verze zůstává buildovatelná a releasovatelná.

---

## Otevřené otázky

- Má SwiftUI macOS verze nahradit Electron macOS úplně, nebo běžet paralelně jako beta?
- Má macOS SwiftUI verze používat stejnou DB cestu, nebo importovat kopii DB?
- Jak dlouho budeme udržovat Electron macOS build?
- Má se portovat nejdřív UI, nebo core pravidla?
- Jakou Swift SQLite knihovnu zvolit?
- Jakou cestou generovat PDF?
- Má Excel import podporovat i staré `.xls`, nebo stačí `.xlsx`?
- Budou se pravidla závodu dál měnit tak často, že dvojí implementace bude problém?
- Má Sportity integrace vzniknout jen v Electron verzi, nebo rovnou i ve Swift verzi?

---

## Doporučený závěr

SwiftUI macOS port je proveditelný, ale je to větší projekt než běžná úprava UI. Nejrozumnější postup:

1. Zachovat Windows Electron verzi.
2. Přidat SwiftUI macOS větev/projekt jako paralelní beta.
3. Nejdřív portovat core logiku a databázi s testy.
4. Teprve potom stavět nativní SwiftUI obrazovky.
5. Stopky, PDF a import nechat až po ověření core parity.

Pokud je cílem pouze „hezčí macOS vzhled“, je levnější vylepšit Electron UI. Pokud je cílem opravdu **nativní macOS 26 aplikace**, SwiftUI port dává smysl, ale musí být řízený jako samostatný multiplatformní produktový krok.
