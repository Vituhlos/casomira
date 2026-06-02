# Changelog

Všechny podstatné změny v aplikaci **Časomíra**. Formát vychází z
[Keep a Changelog](https://keepachangelog.com/cs/1.1.0/), čísla verzí dle
[SemVer](https://semver.org/lang/cs/). Nejnovější verze je nahoře.

## [Nevydáno]

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

[Nevydáno]: https://github.com/Vituhlos/casomira/compare/v0.9.3...HEAD
[0.9.3]: https://github.com/Vituhlos/casomira/compare/v0.9.2...v0.9.3
[0.9.2]: https://github.com/Vituhlos/casomira/compare/v0.9.1...v0.9.2
[0.9.1]: https://github.com/Vituhlos/casomira/compare/v0.9.0...v0.9.1
[0.9.0]: https://github.com/Vituhlos/casomira/releases/tag/v0.9.0
