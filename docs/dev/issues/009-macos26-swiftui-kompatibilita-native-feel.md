# Issue 009 — macOS 26 SwiftUI kompatibilita a nativní feel checklist

## Stav

Plánováno / audit kompatibility.

## Cíl

Projít současnou Electron/React aplikaci a sepsat, co je potřeba změnit nebo přepsat, aby vznikla samostatná macOS verze ve **Swift + SwiftUI** s čistým nativním macOS 26 feel. Windows verze má zůstat ve stávajícím Electron/React stacku.

Tento dokument navazuje na obecnější issue:

- [`008 — macOS nativní verze ve SwiftUI, Windows Electron ponechat`](./008-macos-swiftui-native-port.md)

Issue 008 řeší strategii a port jako celek. Tento dokument je konkrétnější checklist kompatibility a nativního macOS feelu.

---

## Rychlý závěr

SwiftUI port je proveditelný, ale současná appka není jen webové UI. Je to Electron aplikace, kde:

- React renderer zobrazuje UI,
- Electron main proces je aplikační backend,
- SQLite a pravidla závodu jsou v TypeScriptu,
- PDF export je navázaný na Electron tisk,
- Excel import je navázaný na SheetJS,
- stopky jsou samostatné Electron okno s persistentním stavem.

Pro čistý macOS 26 feel nestačí přepsat CSS. Nejčistší řešení je nová SwiftUI aplikace s vlastním Swift core modulem a kompatibilní SQLite/backup vrstvou.

---

## Co dnes brání čistému nativnímu macOS feelu

### 1. UI je webové, i když vizuálně imituje macOS

Soubor:

```text
src/renderer/src/styles/mac.css
```

Současný stav:

- používá CSS tokeny pro macOS vzhled,
- používá `-apple-system` font,
- imituje vibrancy, grouped background, hairline, segmented controls,
- používá vlastní scrollbary a webové animace.

Problém:

- není to skutečný `NSWindow`, `NSToolbar`, `NavigationSplitView`, `Table`, `Menu`, `Settings`, `Sheet`, `Popover`, `Command` stack,
- chybí systémové chování nativních tabulek, focus ringů, accessibility, menu commandů a toolbar itemů,
- webová emulace se bude vždy lišit od macOS 26.

SwiftUI cíl:

- CSS nahradit nativními SwiftUI/AppKit komponentami,
- používat systémové materiály, barvy, toolbar, sheets, popovers, commands,
- neimitovat vibrancy ručně.

### 2. Electron BrowserWindow není nativní SwiftUI okno

Soubor:

```text
src/main/index.ts
```

Současný stav:

- hlavní okno je `BrowserWindow`,
- macOS menu je ručně definované přes Electron `Menu`,
- obsah je načten přes dev server nebo HTML soubor,
- macOS build řeší Electron helpery, hardened runtime a better-sqlite3.

SwiftUI cíl:

- použít `@main App`, `WindowGroup`, `Settings`, případně samostatný `Window` pro stopky,
- použít nativní `Commands`,
- použít AppKit delegate jen tam, kde SwiftUI nestačí,
- odstranit macOS Electron-specific balení, helper workaroundy a browser preload koncept pro macOS verzi.

### 3. UI je silně napojené na `window.api`

Soubory:

```text
src/preload/index.ts
src/shared/types.ts
src/main/ipc.ts
src/renderer/src/**/*.tsx
```

Současný stav:

- React UI volá desítky metod přes `window.api`,
- preload bridge mapuje UI volání na Electron IPC,
- `CasomiraApi` je fakticky contract celé aplikace.

SwiftUI cíl:

- nahradit IPC vrstvu Swift services/repositories,
- zachovat podobný use-case contract, ale ve Swiftu:

```swift
protocol RaceRepository {
  func listZavody() throws -> [ZavodInfo]
  func listKategorie(zavodId: Int64) throws -> [Kategorie]
  func getRosty(kategorieId: Int64, typ: KoloTyp) throws -> RostKolo
  func setVysledek(_ input: SetVysledekInput) throws -> VysledekJizda
}
```

Doporučení:

- použít `CasomiraApi` jako checklist funkcí, které musí Swift app umět,
- nevytvářet SwiftUI obrazovky přímo nad SQL dotazy.

---

## Kompatibilita podle oblastí

### 1. Databáze a migrace

Soubory:

```text
src/main/db/schema.ts
src/main/db/migrate.ts
src/main/db/seed.ts
src/main/db/connection.ts
```

Kompatibilita:

- SQLite je kompatibilní se Swiftem,
- schema lze přenést,
- migrace přes `PRAGMA user_version` lze zachovat,
- problém je přepsat migrace přesně a bezpečně.

Co je potřeba udělat:

- vybrat Swift SQLite knihovnu (`GRDB` doporučeno, případně raw `SQLite3`),
- portovat schema a migrace,
- udělat test otevření existující Electron DB,
- před prvním otevřením Swift beta verzí vytvořit automatickou zálohu DB,
- zachovat stejnou DB cestu nebo jasně rozhodnout o importu kopie.

Doporučení:

```text
MVP SwiftUI verze má otevřít kopii DB, ne rovnou produkční DB.
```

Teprve po ověření migrací povolit práci s reálnou DB.

### 2. Sdílené typy a modely

Soubor:

```text
src/shared/types.ts
```

Kompatibilita:

- TypeScript typy lze převést na Swift `struct`, `enum`, `Codable`, `Identifiable`,
- pozor na `number | null`, volitelné hodnoty a union typy,
- pozor na staré legacy typy `SOTOLINA`, `F_A`, `F_B`, pokud budou odstraněné podle issue 007.

Swift cíl:

```swift
enum RaceType: String, Codable { case rac = "RAC", rx = "RX" }
enum KoloTyp: String, Codable { case q1 = "Q1", q2 = "Q2", q3 = "Q3", sf = "SF", f = "F" }
struct Zavod: Codable, Identifiable { ... }
struct Kategorie: Codable, Identifiable { ... }
```

Co upravit před portem:

- nejdřív dokončit sjednocení Šotoliny na standardní pravidla,
- zjednodušit aktivní typy,
- vyrobit jeden stabilní model contract pro Swift.

### 3. Repository a business logika

Soubor:

```text
src/main/repo.ts
```

Kompatibilita:

- logiku lze portovat,
- ale `repo.ts` je rozsáhlý a kombinuje SQL, business pravidla a aplikační use-casy,
- přímý mechanický port by byl rizikový.

Co udělat:

- rozdělit doménové use-casy do seznamu,
- nejprve portovat read-only metody:
  - závody,
  - kategorie,
  - jezdci,
  - rošty,
  - výsledky,
  - klasifikace,
- až potom write metody:
  - editace jezdců,
  - zápis roštů,
  - zadání výsledků,
  - penalizace,
  - stopky.

Swift cíl:

```text
CasomiraCore/Repositories/RaceRepository.swift
CasomiraCore/Repositories/ResultsRepository.swift
CasomiraCore/Repositories/TimingRepository.swift
CasomiraCore/Repositories/SettingsRepository.swift
```

Nutné testy:

- porovnání výstupu Swift repository proti TypeScript repository na stejných fixtures.

### 4. Pravidla závodu

Soubory:

```text
src/main/scoring.ts
src/main/zaver.ts
src/main/repo.ts
```

Kompatibilita:

- pravidla jsou portovatelná velmi dobře, pokud budou oddělená od SQLite,
- nejlepší kandidát pro první Swift port.

Co udělat:

- portovat čisté funkce do `CasomiraCore/RaceRules`,
- vytvořit fixtures:
  - DNF/DNS/DQ,
  - shody bodů,
  - Q1/Q2/Q3 klasifikace,
  - semifinále,
  - finále,
  - celkově.

Swift cíl:

```text
CasomiraCore/RaceRules/Scoring.swift
CasomiraCore/RaceRules/Qualification.swift
CasomiraCore/RaceRules/Finale.swift
CasomiraCore/RaceRules/Overall.swift
```

Nutné před portem:

- vyřešit issues 003, 004, 005, 006, 007, aby se neportovala stará nebo chybná pravidla.

### 5. React obrazovky → SwiftUI obrazovky

Soubory:

```text
src/renderer/src/App.tsx
src/renderer/src/screens/*.tsx
src/renderer/src/components/*.tsx
```

SwiftUI ekvivalenty:

| Současná část | SwiftUI/AppKit náhrada |
| --- | --- |
| Sidebar kategorií | `NavigationSplitView` sidebar |
| Toolbar | `.toolbar` + `ToolbarItemGroup` |
| Segment fází | `Picker(.segmented)` nebo toolbar segmented control |
| Tabulky | `Table`, `Grid`, případně vlastní `NSTableView` bridge |
| Modal | `.sheet`, `.confirmationDialog`, `NSPanel` |
| PDF menu | toolbar menu / `Menu` |
| Nastavení | `Settings` scene |
| Hotkeys | `Commands` |
| Toasty | SwiftUI overlay nebo status area |

Co bude potřeba přepsat:

- všechny obrazovky,
- všechny komponenty,
- layout shell,
- modaly,
- tabulky,
- inline editace,
- hotkeys,
- theme handling.

Doporučení pro macOS 26 feel:

- nepřenášet pixel-perfect web layout,
- nepoužívat vlastní „falešné“ window chrome,
- použít nativní toolbar a sidebar,
- tabulky udělat co nejvíc systémově,
- nastavení přes systémové Preferences/Settings okno.

### 6. Stopky

Soubor:

```text
src/renderer/src/StopkyApp.tsx
```

Kompatibilita:

- funkčně portovatelné,
- rizikové kvůli přesnosti, klávesovým zkratkám a persistence při zavření.

SwiftUI/AppKit cíl:

- samostatné okno přes `WindowGroup(id:)`,
- timer přes `ContinuousClock` nebo monotonic čas,
- `NSWindowDelegate` pro ochranu zavření,
- lokální keyboard shortcuts v okně,
- persistence timerů do SQLite.

Doporučení:

- stopky neportovat v prvním MVP,
- nejdřív portovat read/write výsledky,
- pak vytvořit stopky jako samostatný milestone.

### 7. PDF export a tisk

Soubor:

```text
src/main/pdf.ts
```

Kompatibilita:

- PDF obsah lze zachovat,
- technologie se musí změnit, protože Electron `webContents.printToPDF` ve SwiftUI není.

Možnosti:

| Varianta | Popis | Doporučení |
| --- | --- | --- |
| WKWebView HTML → PDF | nejbližší dnešku | nejlepší pro MVP |
| SwiftUI render → PDF | nativnější, víc práce | později |
| CoreGraphics/PDFKit ručně | největší kontrola | až když bude potřeba |

Doporučení:

- první Swift verze PDF generuje přes HTML šablony a `WKWebView`,
- zachovat stejné názvy souborů,
- zachovat stejné tabulky a nadpisy,
- vzhled lze později přepsat do SwiftUI/PDFKit.

### 8. Excel import

Soubor:

```text
src/main/excel.ts
```

Kompatibilita:

- `.xlsx` je portovatelné,
- `.xls` může být problém podle Swift knihovny.

Doporučení:

- prověřit Swift knihovny pro `.xlsx`,
- zvážit CSV fallback,
- v první Swift beta klidně import vynechat a používat Electron verzi pro založení dat,
- později doplnit import podle reálných souborů.

### 9. Backup/restore

Soubory:

```text
src/main/backup/*
src/shared/backup.ts
```

Kompatibilita:

- JSON backup je dobře portovatelný,
- musí zůstat stejný formát a verze.

Co udělat:

- Swift `Codable` model pro backup,
- test Electron export → Swift import,
- test Swift export → Electron import,
- při budoucích změnách formátu zvýšit backup version.

### 10. Sportity integrace

Dokument:

```text
docs/dev/issues/001-sportity-integrace.md
```

Doporučení:

- Sportity zatím neportovat do prvního SwiftUI MVP,
- nejdřív dokončit v Electron/Windows nebo počkat na stabilní macOS core,
- pokud se má dělat ve Swiftu, použít `URLSession`, Keychain a nativní network stack.

---

## Nativní macOS 26 feel — konkrétní požadavky

### 1. Okna

Použít:

- `WindowGroup` pro hlavní okno,
- samostatné `WindowGroup`/`Window` pro stopky,
- nativní titlebar/toolbar,
- žádný custom web window shell.

Požadavky:

- správné chování Docku,
- správné zavírání oken,
- správné Cmd+W / Cmd+Q,
- restore okna po kliknutí na Dock ikonu,
- bez ručního emulování titlebaru.

### 2. Sidebar

Použít:

- `NavigationSplitView`,
- systémový sidebar style,
- automatické vibrancy/material chování.

Požadavky:

- kategorie jako sidebar items,
- počet jezdců jako secondary text/badge,
- výběr má působit jako macOS selection, ne web pill.

### 3. Toolbar

Použít:

- SwiftUI `.toolbar`,
- `ToolbarItem` / `ToolbarItemGroup`,
- nativní toolbar buttons,
- menu buttons pro PDF/tisk.

Požadavky:

- `Stopky`, `Uložit PDF`, `Tisk`, `Nastavení` jako toolbar actions,
- žádné absolutní webové menu přes portal,
- správná disabled/active states.

### 4. Fázová navigace

Možnosti:

- segmented `Picker`,
- toolbar segmented control,
- případně sidebar/TabView podle HIG.

Požadavky:

- Q1/Q2/Q3/SF/Finále/Celkově jasně přepínatelné,
- horizontální přetékání řešit nativně,
- žádné useknuté labely.

### 5. Tabulky

Použít:

- `Table` pro macOS 12+ tam, kde stačí,
- případně `NSTableView` wrapper pro pokročilé inline editace.

Požadavky:

- nativní výběr řádků,
- keyboard navigation,
- inline editace,
- tabular numbers,
- správná accessibility.

Poznámka:

SwiftUI `Table` nemusí stačit pro všechny současné inline editace a rošty. Kritické tabulky mohou potřebovat AppKit bridge.

### 6. Dialogy a nastavení

Použít:

- `Settings` scene pro nastavení,
- `.sheet` pro modaly,
- `NSOpenPanel` / `NSSavePanel` pro soubory,
- `confirmationDialog` pro potvrzení.

Požadavky:

- nastavení nepůsobí jako web modal,
- import/backup/file picker jsou systémové,
- potvrzení mazání a přegenerování jsou nativní.

### 7. Klávesové zkratky a menu

Použít:

- `Commands`,
- `CommandMenu`,
- `.keyboardShortcut`,
- standardní Edit/Window/App menu.

Požadavky:

- Cmd+C/V/Z fungují systémově,
- menu bar není ručně emulovaný,
- stopky mají jasné shortcuty,
- PDF/tisk je v menu i toolbaru.

### 8. Tisk a PDF

Použít:

- `NSPrintPanel`,
- PDF export přes WKWebView/CoreGraphics,
- nativní save panels.

Požadavky:

- tisk působí jako macOS tisk,
- export PDF používá systémové ukládání,
- hromadný export zachová strukturu složek.

### 9. Dark mode a accent color

Použít:

- systémový color scheme,
- `Color.accentColor`,
- nativní materials.

Požadavky:

- nepoužívat ručně vynucené CSS dark/light tokeny jako zdroj pravdy,
- app respektuje systémový dark mode,
- volitelně umožní override, pokud je to potřeba.

### 10. Accessibility

Požadavky:

- VoiceOver labels pro tabulky a tlačítka,
- keyboard-only ovládání,
- správné focus rings,
- Dynamic Type tam, kde dává smysl,
- dostatečný kontrast.

---

## Co upravit v repu před začátkem SwiftUI portu

### 1. Stabilizovat pravidla

Nejdřív dokončit nebo rozhodnout issues:

- 003 tiebreak Q3,
- 004 kvalifikační podmínka finále,
- 005 náhradníci,
- 006 přegenerování celkových výsledků,
- 007 odstranění Šotolina special rules.

Důvod: neportovat do Swiftu pravidla, která se budou hned měnit.

### 2. Vytvořit fixtures

Přidat:

```text
test-fixtures/
  sqlite/
  backup-json/
  expected-results/
```

Obsah:

- DB pro malý závod,
- DB pro plný závod,
- DB se shodami bodů,
- DB s penalizacemi,
- DB s neuloženými stopkami,
- očekávané JSON výstupy pro klíčové výpočty.

### 3. Oddělit core logiku od Electronu

I pro Windows verzi by pomohlo rozdělit:

```text
src/main/repo.ts
```

na menší části:

```text
src/main/repositories/*
src/main/rules/*
src/main/services/*
```

Důvod: snazší port do Swiftu a snazší testování.

### 4. Zpřesnit contract mezi UI a core

Použít `CasomiraApi` jako základ a sepsat stabilní use-case API:

```text
RaceService
CategoryService
RosterService
ResultsService
TimingService
ExportService
BackupService
```

To pak půjde portovat do Swift protokolů.

### 5. Vyřešit DB kompatibilitu

Rozhodnout:

- Swift app otevře stejnou DB,
- nebo vytvoří kopii,
- nebo používá import/export backup jako přechod.

Doporučení pro beta:

```text
Swift beta pracuje s kopií DB a vždy před migrací vytvoří backup.
```

---

## Doporučené MVP macOS SwiftUI appky

První MVP nemá být plná náhrada v den závodu.

### MVP 1 — read-only + core parity

Musí umět:

- otevřít kopii existující DB,
- zobrazit závody,
- zobrazit kategorie,
- zobrazit startovní listinu,
- zobrazit rošty,
- zobrazit výsledky,
- zobrazit klasifikaci,
- zobrazit finále/celkově,
- spustit Swift unit testy proti fixtures.

Nemusí umět:

- editovat,
- stopky,
- import,
- PDF,
- backup,
- Sportity.

### MVP 2 — editace závodu

Doplnit:

- inline editace jezdců,
- zadání výsledků,
- DNF/DNS/DQ,
- generování roštů,
- finále,
- penalizace.

### MVP 3 — provozní parity

Doplnit:

- stopky,
- import Excel,
- PDF/tisk,
- backup/restore,
- nastavení,
- release build.

---

## Akceptační kritéria pro nativní macOS feel

SwiftUI macOS verze splní cíl jen pokud:

- nepoužívá Electron/WebView pro hlavní UI,
- používá nativní okna a toolbar,
- používá nativní sidebar,
- používá systémové dialogy a nastavení,
- má nativní menu commands,
- respektuje system dark mode,
- tabulky mají keyboard navigation a focus chování,
- stopky běží v samostatném nativním okně,
- PDF/tisk používá systémové panely,
- aplikace je buildovatelná a notarizovatelná jako normální macOS app.

---

## Největší rizika a mitigace

### Riziko: dvojí pravidla Windows vs macOS

Mitigace:

- fixtures,
- Swift tests,
- TypeScript tests,
- stejný backup formát,
- checklist pro každou změnu pravidel.

### Riziko: SwiftUI `Table` nebude stačit

Mitigace:

- proof-of-concept nejkritičtější tabulky,
- případně použít AppKit `NSTableView` wrapper.

### Riziko: Excel import nebude kompatibilní

Mitigace:

- test reálných souborů,
- CSV fallback,
- import dodělat až po core MVP.

### Riziko: PDF bude vypadat jinak

Mitigace:

- MVP přes HTML + WKWebView,
- pozdější SwiftUI/PDFKit šablony.

### Riziko: DB migrace poškodí data

Mitigace:

- Swift beta pracuje s kopií DB,
- automatický backup před migrací,
- testy migrací na reálných DB kopiích.

---

## Otevřené otázky

- Chceme SwiftUI appku jako paralelní beta, nebo rovnou jako náhradu Electron macOS buildu?
- Má macOS SwiftUI beta pracovat se stejnou DB, nebo vždy s kopií?
- Má se pro Swift použít GRDB, nebo raw SQLite3?
- Má PDF v MVP vznikat přes WKWebView, nebo rovnou přes SwiftUI/PDFKit?
- Má Excel import podporovat `.xls`, nebo stačí `.xlsx` + CSV fallback?
- Má být Sportity implementované nejdřív v Electronu, nebo čekat na Swift core?
- Jak dlouho budeme udržovat Electron macOS build paralelně?

---

## Doporučený další krok

Než se začne psát SwiftUI appka, udělat malý technický spike:

1. Založit minimální `macos/` SwiftUI projekt.
2. Připojit SQLite knihovnu.
3. Otevřít kopii současné `casomira.db`.
4. Zobrazit seznam závodů a kategorií v `NavigationSplitView`.
5. Zobrazit jednu tabulku startovní listiny nativní SwiftUI `Table`.
6. Ověřit, jestli tabulka a inline editace působí dostatečně nativně.

Teprve po tom rozhodnout, jestli pokračovat plným portem.
