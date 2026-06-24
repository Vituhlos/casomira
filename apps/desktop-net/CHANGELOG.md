# Changelog — migrace na .NET / Avalonia

Průběh přepisu Verdictu z Electron/TypeScript na nativní .NET + AvaloniaUI.
Žije odděleně od kořenového [`CHANGELOG.md`](../../CHANGELOG.md), který sleduje
vydané verze produkční (Electron) aplikace. Tady se vede přehled o postupu
migrace po fázích, dokud se .NET port nestane vydávaným produktem — pak se
fáze složí do hlavního changelogu jako jedno vydání.

Formát dle [Keep a Changelog](https://keepachangelog.com/cs/1.1.0/), nejnovější
fáze nahoře. Plán migrace: [`docs/dev/plan-avalonia-migrace.md`](../../docs/dev/plan-avalonia-migrace.md).

## Fáze 5 — Klasifikace po Q2/Q3 + tiebreaky

### Přidáno
- **Klasifikace po kvalifikaci** — součet bodů přes odjetá kola (po Q2: Q1+Q2;
  po Q3: Q1+Q2+Q3), seřazeno sestupně. Započítávají se jen jezdci s losem.
- **Tiebreak při shodě bodů** — rozhoduje lepší výsledek v pozdějším kole
  (Q3 → Q2 → Q1), 1:1 dle „časoměřičské bible" (CLAUDE.md §7).
- **Obrazovka Klasifikace** se sloupci za jednotlivá kola + Celkem; sloupce se
  staví dynamicky podle započítaných kol.
- 8 unit testů tiebreaku (port z `tiebreak.test.ts`).

## Fáze 4 — Rošty a Výsledky jízd

### Přidáno
- **Rošty** — zadání startovního čísla doplní jméno/značku/model z listiny;
  hlídá duplicity a neznámá čísla; více jízd na kolo.
- **Výsledky** — paste-box pro hromadné vložení časů z Free Stopwatch; editace
  času/stavu automaticky přepočítá pořadí a body včetně stavů DNF/DNS/DQ.
- **CasParser** — parsování a formát času `mm:ss.sss`.
- Service vrstva pro kola, jízdy, rošty a výsledky; přepočet napojený na
  existující bodovací engine.

## Fáze 3 — Startovní listina + import z Excelu

### Přidáno
- **Startovní listina** — inline editace jezdců (los, st. č., jméno, značka,
  model) s ukládáním po buňkách.
- **Import `.xls`/`.xlsx`** přes ExcelDataReader — párování listů na kategorie,
  detekce sloupců, náhled a politika přepisu/přeskočení při kolizi st. čísla.

## Fáze 2 — Avalonia shell

### Přidáno
- Kostra aplikace: DI kontejner, service vrstva, levý sidebar s kategoriemi,
  segmentový přepínač fází a routing obsahu přes ViewLocator.

## Fáze 1 — datová vrstva a bodovací engine

### Přidáno
- SQLite schéma + migrace, datové modely a bodovací engine (`ScoringEngine`)
  portované 1:1 z TypeScriptu, kryté unit testy.

## Fáze 0 — scaffold

### Přidáno
- Založení řešení `Verdict.sln` (Core / Desktop / Tests), AvaloniaUI + ShadUI,
  CommunityToolkit.Mvvm, Dapper, Microsoft.Data.Sqlite.
