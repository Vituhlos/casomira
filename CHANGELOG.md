# Changelog

Všechny podstatné změny v aplikaci **Časomíra**. Formát vychází z
[Keep a Changelog](https://keepachangelog.com/cs/1.1.0/), čísla verzí dle
[SemVer](https://semver.org/lang/cs/). Nejnovější verze je nahoře.

## [Nevydáno]

## [0.9.6-beta] – 2026-06-03

### Změněno
- **Electron 37 → 42** — upgrade Electron runtime kvůli kompatibilitě s macOS 26 (Tahoe).
  Electron 37 havaroval při startu na macOS 26 (`EXC_BREAKPOINT` v Electron Framework)
  kvůli nové TPRO (Thread Pointer Read Only) ochraně paměti v macOS 26. Electron 42
  je sestaven s macOS 26 SDK a tuto ochranu respektuje.
- **@types/node 22 → 24** — typové definice Node.js sladěny s verzí Node.js bundlovanou
  v Electronu 42 (Node 22 → Node 24).

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

[Nevydáno]: https://github.com/Vituhlos/casomira/compare/v0.9.5...HEAD
[0.9.5]: https://github.com/Vituhlos/casomira/compare/v0.9.4...v0.9.5
[0.9.4]: https://github.com/Vituhlos/casomira/compare/v0.9.3...v0.9.4
[0.9.3]: https://github.com/Vituhlos/casomira/compare/v0.9.2...v0.9.3
[0.9.2]: https://github.com/Vituhlos/casomira/compare/v0.9.1...v0.9.2
[0.9.1]: https://github.com/Vituhlos/casomira/compare/v0.9.0...v0.9.1
[0.9.0]: https://github.com/Vituhlos/casomira/releases/tag/v0.9.0
