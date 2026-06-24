# Changelog — migrace na .NET / Avalonia

Průběh přepisu Verdictu z Electron/TypeScript na nativní .NET + AvaloniaUI.
Žije odděleně od kořenového [`CHANGELOG.md`](../../CHANGELOG.md), který sleduje
vydané verze produkční (Electron) aplikace. Tady se vede přehled o postupu
migrace po fázích, dokud se .NET port nestane vydávaným produktem — pak se
fáze složí do hlavního changelogu jako jedno vydání.

Formát dle [Keep a Changelog](https://keepachangelog.com/cs/1.1.0/), nejnovější
fáze nahoře. Plán migrace: [`docs/dev/plan-avalonia-migrace.md`](../../docs/dev/plan-avalonia-migrace.md).

## Auto-seedování roštů (§6)

### Přidáno
- **Automatické nasazení Q1–Q3** tlačítkem „Navrhnout rošt":
  - **Q1** dle losu (jezdci bez losu nevstupují),
  - **Q2** obráceně — zachová skupiny z Q1, otočí pořadí jízd i jezdců v nich,
  - **Q3** dle Klasifikace po Q2, „nejpomalejší skupina jede první".
- Rovnoměrné dělení do jízd (strop 8 na jízdu, bez „nečisté" osmičky:
  15 → 5+5+5, 16 → 8+8).
- 10 unit testů seedovací matematiky (`RostSeeder`).

## Založení závodu

### Přidáno
- **Dialog „Nový závod"** — název, datum, místo, typ RAC/RX a výběr kategorií
  z nabídky dle typu (chips) + přidání vlastní. Doplňuje chybějící základ MVP;
  appka už nejede jen na seed datech.
- **Výběr a přepínání závodů** — v sidebaru přibyl seznam závodů; přepnutí
  načte kategorie a fáze daného závodu.
- Výchozí kategorie dle typu (`RaceDefaults`, port z `raceDefaults.ts`) —
  RX Cup nemá Šotolinu, RAC ji nabízí jako volitelnou (CLAUDE.md §3).

## Fáze 6 — Semifinále, Finále a Celkové výsledky

### Přidáno
- **Kvalifikace do závěru** — jezdec postupuje, má-li aspoň jednu Q jízdu
  kompletní (dojel s časem) a zároveň aspoň dvě, do kterých nastoupil
  (OK/DNF; DNS a DQ se nepočítají). CLAUDE.md §8.
- **Automatické nasazení semifinále** — z Klasifikace po Q3 jdou liché pozice
  do 1. jízdy, sudé do 2. (max 16 jezdců). Tlačítkem „Navrhnout semifinále".
- **Automatické nasazení finále** — z postupujících SF (spárováno dle bodů po
  Q3), nebo při < 12 kvalifikovaných rovnou prvních N z Klasifikace po Q3;
  velikost finále 8/10. Doplní i náhradníky.
- **Celkové výsledky** — pořadí řídí finále (nesčítá body): finalisté dle
  finále, za nimi nepostupující ze semifinále, pak zbytek dle Q3. CLAUDE.md §9.
- 11 unit testů závěru (port z `kvalifikace.test.ts` + scénáře nasazení a
  celkového pořadí).

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
