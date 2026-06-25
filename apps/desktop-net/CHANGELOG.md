# Changelog — migrace na .NET / Avalonia

## Záloha/obnova + opravy datové vrstvy

### Přidáno
- **Záloha a obnova** — tlačítka „Záloha" a „Obnova" v toolbaru. Záloha uloží
  celou databázi (všechny závody + žebříček/pravidla/nastavení) do JSON souboru;
  obnova načte závody ze zálohy a **přidá je** (existující data se nemažou).
  Formát `verdict-backup` v1 je byte-kompatibilní s původní Electron verzí
  (čte i starší `casomira-backup`).
- `BackupService` (export/import přes Dapper), `BackupSerializer` (validace +
  serializace) a testy: validace formátu/verze + round-trip export→import přes
  reálnou SQLite databázi.

### Opraveno
- **Kritická chyba: aplikace spadla při startu na čerstvé databázi.** Krok migrace
  (`Migrations.Step`) volal příkazy bez předané transakce, zatímco na connection
  běžela provider-trackovaná transakce — Microsoft.Data.Sqlite to odmítl. Nahrazeno
  raw SQL transakcí (`BEGIN`/`COMMIT`/`ROLLBACK`).
- **Kritická chyba: migrace v3/v4 padaly na „duplicate column".** Baseline schéma
  už obsahuje `body_rucni` i `finale_velikost`, ale kroky je přidávaly znovu.
  Doplněn `HasColumn` guard (jako u kroku v8).
- **Kritická chyba: žádný databázový dotaz se nematerializoval.** Privátní DTO byly
  `record` s `int` parametry konstruktoru; SQLite vrací INTEGER jako `Int64` a Dapper
  zúžení `Int64→Int32` u parametrů konstruktoru nedělá (jen u property setterů) —
  každý `Query<T>` házel výjimku. DTO převedeny na třídy s `get/set` properties.

## Stopky

### Přidáno
- **Okno Stopky** otevíraná tlačítkem v toolbaru — pluje nezávisle vedle hlavního okna.
- **Výběr jízdy** ze všech jízd aktuálního závodu (přes všechny kategorie a kola).
- **Časomíra** s displejem `mm:ss.s` (aktualizace 100 ms), tlačítko Start/Stop.
- **Klik** — zaznamená průjezd v čase od startu; klávesová zkratka **Mezerník**,
  alternativně velké tlačítko v UI.
- **Vrátit poslední** — smaže poslední záznam; klávesová zkratka **Backspace / Delete**.
- **Přiřazení st. čísel** — inline editace buňky „St.č." v tabulce zaznamů;
  po zadání se doplní příjmení/jméno/značka; chybná nebo duplicitní čísla hlásí chybu.
- **Zapsat do výsledků** — propíše časy (záznamy s přiřazeným jezdcem) do tabulky
  výsledků dané jízdy a přepočítá pořadí + body; tlačítko aktivní, jakmile mají
  všechny záznamy přiřazené st. číslo.
- **Persistence stavu časomíry** v DB tabulce `mereni_timer` — po znovuotevření
  okna se timer obnoví do uloženého stavu (pozastaveno, celkový čas zachován).
- Nové metody v `IRaceService` a `RaceService` pro veškerou práci se stopkami
  (`GetStopkyJizdy`, `GetMereni`, `PridejMereni`, `VratPosledniMereni`,
   `SetMereniStCislo`, `ZapisMereniDoVysledku`, `GetTimerStav`, `UlozTimerStav`, …).


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
