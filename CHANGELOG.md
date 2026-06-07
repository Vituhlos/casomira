# Changelog

Všechny podstatné změny v aplikaci **Časomíra**. Formát vychází z
[Keep a Changelog](https://keepachangelog.com/cs/1.1.0/), čísla verzí dle
[SemVer](https://semver.org/lang/cs/). Nejnovější verze je nahoře.

## [Nevydáno]

## [0.9.9-beta] – 2026-06-07

### Přidáno
- **Jezdci bez přejímky** — jezdci importovaní z Excelu bez vyplněného losu jsou
  nově vizuálně odlišeni v Startovní listině: šedivý odznak „Bez přejímky" a ztlumený
  řádek. Do roštů (Q1–Q3, Semifinále, Finále) a klasifikace nevstupují. Jakmile operátor
  los ručně doplní, jezdec se automaticky aktivuje a do roštů vstoupí normálně.
- **Upozornění při importu** — ImportDialog nově zobrazuje pro každý list počet jezdců
  bez losu s informací, že budou naimportováni, ale do roštů nezařazeni.
- **Windows 11 Mica efekt** — na Windows 11 (build ≥ 22000) appka využívá
  nativní DWM Mica materiál; sidebar a toolbar mají solidní barvy (stejný přístup
  jako VS Code / Teams), Mica prosvítá pouze přes titlebar.
- **macOS nativní vibrancy** — sidebar a toolbar využívají `setVibrancy('sidebar')`;
  na macOS 26 (a starších) je obsah průhledný vůči desktopu.

### Změněno
- **Migrace databáze: better-sqlite3 → node:sqlite** — SQLite je nyní vestavěný
  přímo v Node.js (experimentální API od Node 22.5). Odpadá nativní `.node` modul,
  který musel být rebuildován pro každou verzi Electronu a způsoboval problémy
  s podepisováním na macOS. Databázová vrstva i migrace jsou plně kompatibilní;
  existující data zůstávají beze změny.
- **Electron 39 → 42** — aktuální stabilní verze; přináší opravy zabezpečení
  a výkonnostní zlepšení.
- **PDF export konzistentní DPI** — explicitní `scaleFactor: 100` + `dpi: 150`
  zabraňuje rozdílné velikosti textu na HiDPI displejích (změna výchozího chování v E42).
- **ASAR integrita** — `integrity: true` v electron-builderu; spustitelný soubor
  ověřuje integritu ASAR archivu při startu (ochrana proti manipulaci).

## [0.9.8-beta] – 2026-06-05

### Přidáno
- **Zapamatování tiskárny** — appka si pamatuje naposledy zvolenou tiskárnu; při dalším tisku
  tiskne rovnou bez výběrového dialogu. Shift+klik na ikonu tiskárny vynutí výběr znovu
  (a novou volbu uloží).
- **Sportity integrace** — publikování výsledkových listů přímo do Sportity kanálu
  bez ručního nahrávání. V Nastavení: zadání API klíče, výběr závodu a složky s výsledky,
  automatické párování kategorií podle názvu, publikování jednoho listu nebo celé kategorie
  najednou. Historie posledních akcí s časovými razítky a stavem (ok / chyba).
- **Sportity setup při zakládání závodu** — pokud je API klíč nastaven a spojení funguje,
  zobrazí se v dialogu „Nový závod" sekce pro výběr kanálu a složky; mapování se uloží
  automaticky při vytvoření závodu.
- **Závodní tiskový preset** — jedno tlačítko v Nastavení vytiskne předdefinovanou sadu
  listů rovnou na tiskárnu (bez PDF dialogu): startovní listina 1×, rošty Q1/Q2/Q3/Finále
  4×, výsledky Finále 1×. Funguje pro více kategorií najednou.
- **Tisk přímo z toolbaru** — ikona tiskárny vedle tlačítka Stopky tiskne aktuálně
  zobrazený list na tiskárnu. Počet kopií dle závodního presetu (rošty 4×, ostatní 1×).
  Pokud je připojeno více tiskáren, zobrazí se výběr; při jedné tiskárně tiskne okamžitě.
- **Přegenerovat celkové výsledky** — tlačítko na obrazovce Celkově nyní jasně popisuje
  akci; celkové výsledky se navíc automaticky přepočítají při každé změně dat v kategorii.
- **ISO datum v názvu složky PDF** — složka závodu se nyní jmenuje např.
  `2026-06-15 Rally Morava` místo pouhého `Rally Morava`; složky se v průzkumníku
  řadí chronologicky automaticky.

### Opraveno
- **Tisk na tiskárnu nefungoval** — dvě rozbití způsobená Electron 39:
  (1) `webContents.getPrinters()` byla odstraněna, nahrazena `getPrintersAsync()`;
  (2) `webContents.print()` změnilo API — nový helper `tisknout()` zvládá callback
  i Promise variantu a tisková okna se vytváří bez sandbox omezení, které blokovalo
  přístup k tiskovému subsystému Windows.
- **Kvalifikační podmínka do SF/finále** — jezdec se počítal jako kvalifikovaný i tehdy,
  když měl v obou jízdách DQ. Opraveno dle pravidel: DQ v jízdě = jako kdyby nenastoupil;
  jezdec musí mít alespoň jednu kompletní jízdu A zároveň alespoň jednu odstartovanou.
- **Tiebreak klasifikace** — při shodném počtu bodů po Q3 se dříve porovnávala jen
  poslední jízda. Opraveno na správné porovnání napříč všemi jízdami dle pravidel.

### Změněno
- **Náhradníci ve finále automaticky do roštu** — jezdci doporučení jako náhradníci
  (z klasifikace po Q3) jsou nyní automaticky zapsáni do roštů finále bez nutnosti
  ručního doplnění.

## [0.9.7-beta] – 2026-06-04

### Přidáno
- **Výsledky po Q1 / Výsledky po Q2** — nová záložka v každém kole Q1/Q2 zobrazující
  souhrnnou klasifikaci všech jízd: nejlepší čas jezdce, celkové body, aktuální pořadí.
  Body lze upravit přímo v tabulce (inline editace); × resetuje zpět na automatický výpočet.
- **Bodová penalizace z jízdy se promítá do agregátu** — pole v agregátové tabulce
  se zvýrazní, pokud jezdec má v dané sérii penalizaci (odlišná barva + tooltip).
- **PDF export**: listy `Q1_vysledky_po_Q1.pdf` a `Q2_vysledky_po_Q2.pdf`.
- **DB migrace krok 10**: tabulka `q_agregat_override` pro ruční přepis bodů na úrovni
  agregátu (nezávislý na penalizacích jednotlivých jízd).
- Předpisy RAC Race 2026 přidány do repozitáře (`docs/user/Predpisy-RAC-race-2026.pdf`).

### Opraveno
- **Bodování DNF/DNS/DQ** — základ penalizace se počítal z počtu jezdců, kteří dojeli
  (`dojeli.length`), místo celkového počtu startujících. Opraveno na `vstupy.length`
  dle předpisů 2026 §7: „…jako kdyby všichni jezdci byli klasifikováni." Příklad:
  8 jezdců, 4 dojedou — DNF dostane body za 8. místo (36 b), ne za 4. místo (40 b).
- **Dvojitý tooltip u úpravy bodů v agregátu** — na vstupním poli byl `title=` atribut
  i obálkový `<Tooltip>` zároveň; odstraněn `title=`.
- **Tooltip přetékající za okraj okna** — při krátkém textu (nebo přiblížení k pravému
  okraji) se tooltip vyrenderoval mimo okno. Opraveno lepším clampem (±155 px od okraje)
  a `whiteSpace: normal` + `maxWidth: 310px` na tooltip elementu.

### Změněno
- **Šotolina → STANDARD ruleset** — kategorie Šotolina nyní funguje se stejnými pravidly,
  rošty a bodováním jako ostatní RAC Race kategorie. DB migrace krok 11 převede stávající
  záznamy. Speciální Šotolina pipeline (Finále A/B, los tiebreak, fixní skupiny) dočasně
  deaktivována; kód zůstává pro zpětnou kompatibilitu.
- **Sticky záložky Rošt/Výsledky** — pruh s přepínačem záložek zůstane přilepený při
  scrollování (position: sticky).
- **Sticky záhlaví tabulek** — záhlaví tabulek se přilepí pod pruh záložek při scrollování
  (CSS proměnná `--thead-top: 32px`).
- **Kompaktní karty jízd v Roštu** — každá jízda má max šířku 680 px a je centrovaná;
  odstraněno zbytečné roztažení na celou šířku při větším okně.
- **Tabulky Results / Standings / QVysledky**: přechod na `table-layout: auto` — šíře
  sloupců se přizpůsobí obsahu místo pevných procent.
- **Sloupec Jízda odstraněn z agregátové tabulky** — číslo jízdy je dostupné jako
  tooltip při najetí myší na čas.
- **Sjednocení barev sekundárního textu** — buňky Model, Jméno, Vůz v tabulkách
  používají `var(--text-2)` místo `var(--text-3)` pro lepší čitelnost.

## [0.9.6-beta] – 2026-06-03

Předvydání pro ověření na **macOS 26 (Tahoe)**. Instalátory z tagu `v0.9.6-beta` po
3. 6. 2026 (druhý build) obsahují opravu startu na Macu — první build stejné verze
na macOS 26 hned po spuštění padal (exit 133).

### Opraveno
- **macOS 26 — pád hned po spuštění (exit 133 / SIGTRAP)** — zabalená `.app` spadla
  dřív, než naběhlo UI. Příčina: bug electron-builder ([#9771](https://github.com/electron-userland/electron-builder/issues/9771)):
  Helper procesy se přejmenovaly na „Časomíra Helper", ale hlavní Electron binárka
  dál hledala „Electron Helper" (`Unable to find helper app`). Opraveno hookem
  `afterPack`, který Helpers po zabalení vrátí na očekávané názvy.
- **macOS — podpis `.app` a nativní SQLite** — při nepodepsaném buildu se musí
  použít ad-hoc podpis (`identity: '-'`), jinak se neaplikují entitlements a macOS
  může odmítnout načtení modulu `better-sqlite3` (stejný typ pádu při startu jako
  ve verzi 0.9.2, kde už `disable-library-validation` pomohlo).

### Změněno
- **Electron 37 → 39** — novější Chromium s lepší podporou macOS 26; zároveň zůstává
  **Node.js 22** v runtime, aby šel zkompilovat `better-sqlite3` (Electron 42+ táhne
  Node 24 / V8 13.x, s nímž se tato verze better-sqlite3 nekompiluje).

### Přidáno
- **Automatický smoke test na macOS 26** (GitHub Actions, větev `v2`) — ověří, že
  zabalená `.app` po startu nepadá; chrání před opakováním regrese macOS buildu.

## [0.9.5] – 2026-06-03

### Opraveno
- **Zavírání okna stopek s nezapsaným měřením** — modal „Zavřít i tak" zavřel jen
  sám sebe, okno zůstalo otevřené. Příčina: HTML stránka přepsala titulek okna
  z „Stopky" na „Časomíra", hledání přes `getTitle()` pak nenašlo okno a příznak
  `stopkyForceClose` zůstal viset — druhé ❌ pak obešlo guard bez modalu. Opraveno
  přes `BrowserWindow.fromWebContents(event.sender)` a blokováním přepsání titulku
  (`page-title-updated`).
- **macOS — systémové menu** — výchozí Electron menu zobrazovalo položky „Reload"
  a „Developer Tools" v produkci. Nahrazeno správným menu (Časomíra / Upravit / Okno)
  bez vývojářských položek; zkratky ⌘C / ⌘V / ⌘Z fungují ve všech textových polích.

### Přidáno
- **Checklist pro testery na Macu** (`docs/user/CHECKLIST-MAC.md`) — stručný průvodce
  prvním ověřením na macOS (Gatekeeper, klávesové zkratky ⌘, stopky, PDF, záloha,
  ukončení, co a kam nahlásit).

### Změněno
- **Reorganizace souborů repozitáře** — `BUILD.md` → `docs/dev/`, instalační a
  testerský návod → `docs/user/`, prototyp `Casomira-macOS/` → `reference/`,
  vzorky → `fixtures/`. Funkčnost appky se nemění.

## [0.9.4] – 2026-06-03
### Změněno
- **Čistší horní lišta** — odstraněna nadbytečná tlačítka „Stav závodu", „Zásahy"
  a klávesnice. Klávesové zkratky a přehled zásahů ředitele jsou nově v Nastavení
  (ozubené kolo). Zkratky dál fungují potichu pro toho, kdo je zná (`?` je vyvolá).
- **Odebrán dashboard „Stav závodu"** — přehled o kategorii dává levý panel,
  samostatné okno bylo nadbytečné.
- **Nekompletní výsledky — bez rušivých prvků** — zrušeno vyskakovací varování
  při přechodu do další fáze; žádné oranžové pruhy ani podbarvení řádků bez času.
  U nadpisu jízdy zůstane jemný odznak „nekompletní" — to stačí.
- **Stopky — klidnější vzhled** — stavy jízd (hotovo / na řadě) jsou teď vizuálně
  méně křiklavé, sjednoceny s klidným macOS stylem appky.

### Opraveno
- **Šotolina — správné pořadí jízd ve stopkách** — předvýběr další jízdy teď
  správně nabídne Finále B před Finále A (B se jede jako první).
- **Integrita dat při zápisu** — přepočet bodů, zápis výsledků, penalizace
  a aktualizace závodu jsou nově atomické (databázové transakce). Při pádu appky
  uprostřed operace data nezůstanou v nekonzistentním stavu.
- **Chyby načítání jsou teď viditelné** — chyba při komunikaci s databází se ukáže
  jako hláška místo tiché prázdné obrazovky (výsledky, rošty, stopky).
- **Logo — limit velikosti** — obrázek nad 500 KB se odmítne s jasnou hláškou,
  aby nevznikla zbytečně velká databáze.

## [0.9.3] – 2026-06-02
### Přidáno
- **Klávesové zkratky** hlavního okna pro práci u trati: přepínání fází
  (`Alt+←/→`, `⌘/Ctrl+1…9`), Rošt/Výsledky (`R` / `V`), uložit PDF (`⌘/Ctrl+P`),
  stopky (`⌘/Ctrl+T`), vygenerovat rošt (`⌘/Ctrl+G`).
- **Nápověda zkratek** (`?` nebo `⌘/Ctrl+/`) — přehled se správným modifikátorem
  podle platformy (⌘ na macOS, Ctrl na Windows). Dostupná i myší z toolbaru a
  z Nastavení.
- **Vlastní ikona aplikace** — na Windows (`.ico`) i macOS (`.icns`); generuje se
  ze zdrojového `build/icon.png` při buildu, s průhledným pozadím.
### Změněno
- Drobnost: cílová složka PDF se počítá přes `dirname` (čitelnější, chování stejné).

## [0.9.2] – 2026-06-01
### Opraveno
- **Pád aplikace na macOS hned po spuštění** — macOS hardened runtime odmítal
  načíst nativní modul better-sqlite3. Přidán entitlement
  `disable-library-validation` (+ hardened runtime konfigurace). Windows nebyl
  zasažen.
- **První spuštění na čistém Macu** — složka pro databázi v `userData` se teď
  vždy vytvoří (dřív mohla appka spadnout na chybějící složce).
### Přidáno
- Diagnostika startu do `startup.log` a chybová hláška místo tichého pádu.
- Poznámka o Gatekeeperu (nepodepsáno → pravý klik → Otevřít) v popisu Release.

## [0.9.1] – 2026-06-01
### Přidáno
- macOS instalátor jako **universal DMG** (Intel x64 i Apple Silicon arm64).
- GitHub Actions: paralelní build Windows + macOS a publikace do GitHub Releases.

## [0.9.0] – 2026-06-01
### Přidáno
- První verze aplikace Časomíra — desktopový správce závodu autokros / rallycross
  (Electron + React + SQLite): startovní listina, rošty, výsledky, klasifikace,
  semifinále/finále, PDF export, stopky.

[Nevydáno]: https://github.com/Vituhlos/casomira/compare/v0.9.9-beta...HEAD
[0.9.9-beta]: https://github.com/Vituhlos/casomira/compare/v0.9.8-beta...v0.9.9-beta
[0.9.8-beta]: https://github.com/Vituhlos/casomira/compare/v0.9.7-beta...v0.9.8-beta
[0.9.7-beta]: https://github.com/Vituhlos/casomira/compare/v0.9.6-beta...v0.9.7-beta
[0.9.6-beta]: https://github.com/Vituhlos/casomira/compare/v0.9.5...v0.9.6-beta
[0.9.5]: https://github.com/Vituhlos/casomira/compare/v0.9.4...v0.9.5
[0.9.4]: https://github.com/Vituhlos/casomira/compare/v0.9.3...v0.9.4
[0.9.3]: https://github.com/Vituhlos/casomira/compare/v0.9.2...v0.9.3
[0.9.2]: https://github.com/Vituhlos/casomira/compare/v0.9.1...v0.9.2
[0.9.1]: https://github.com/Vituhlos/casomira/compare/v0.9.0...v0.9.1
[0.9.0]: https://github.com/Vituhlos/casomira/releases/tag/v0.9.0
