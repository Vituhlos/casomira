# PROMPT 02 — Import jezdců z Excelu + přidávání/mazání

> Vlož CELÝ tento text do Claude Code (ve stejném okně, kde jsme stavěli krok 1).
> Měj po ruce soubor `seznam-jezdců 31.12.2024.xls` — dáš mu ho k dispozici.

---

Pokračujeme dalším krokem podle roadmapy (CLAUDE.md §14, krok 3): **oživit
Startovní listinu** — import jezdců z Excelu a ruční přidávání/mazání. Zachovej
vše, co už funguje (vzhled, databáze, přepínač režimu).

Dám ti reálný soubor, ze kterého se dnes časoměří: **`seznam-jezdců 31.12.2024.xls`**.
POZOR — jeho struktura má několik záludností, počítej s nimi:

## Struktura vstupního Excelu (DŮLEŽITÉ)
- **Každý list = jedna kategorie.** Listy se jmenují:
  `Junior`, `N do 1400`, `N do 1600`, `N 1600 +`, `Škoda Cup`, `S do 1600`,
  `S 1600 +`, `ženy`, `Šotolina`, `CROSS CUP`, `TUNING`.
- **Názvy listů NEodpovídají přesně názvům kategorií v appce.** Udělej mapování,
  např.: `N do 1400`→`N1400`, `N do 1600`→`N1600`, `N 1600 +`→`N1600+`,
  `S do 1600`→`S1600`, `S 1600 +`→`S1600+`, `ženy`→`Dámský pohár`,
  `CROSS CUP`→`Cross Cup`, `TUNING`→`Tuning`. Mapování ať jde snadno upravit
  (kdyby přišel soubor s jinými názvy).
- **Hlavička je až na řádku 7** (1-indexovaně). Řádky 1–6 jsou nadpis
  „Seznam jezdců" + prázdné. Najdi řádek, kde je v některém sloupci `LOS 1.s.`
  a `St.číslo` — to je záhlaví, data jdou od dalšího řádku.
- **Sloupec A (první) je prázdný.** Data začínají od sloupce B.
- Sloupce v záhlaví: `LOS 1.s.` · `St.číslo` · `Příjmení` · `Jméno` · `Značka` ·
  `Model` · (volitelně) `Rok narození`.
- **Některé listy NEMAJÍ sloupec „Rok narození"** (např. N 1400) — import to musí
  ustát (rok narození = prázdný).
- **Čísla jsou jako čísla** (54.0, 7.0) → převeď na celá čísla (54, 7).
- **Texty mívají mezery navíc** ("Škoda ", "Renault ") → ořízni (trim).
- Prázdné řádky na konci listu ignoruj.

## Co implementovat
1. **Tlačítko „Importovat z Excelu"** na Startovní listině:
   - Otevře nativní dialog pro výběr `.xls`/`.xlsx`.
   - Použij **SheetJS (`xlsx`)** ke čtení (umí i starý `.xls`).
   - Necháš mě vybrat, který **list/kategorii** importovat (nebo „všechny").
   - Zobraz **náhled** (kolik jezdců se našlo, do které kategorie) PŘED zápisem,
     ať vidím, že se to načetlo správně, a teprve pak potvrdím uložení do DB.
   - Zápis do SQLite: jezdci se uloží k odpovídající kategorii daného závodu.
     Ošetři kolize startovních čísel (UNIQUE v rámci kategorie) — když číslo už
     existuje, dej mi vědět (přepsat / přeskočit).

2. **Tlačítko „Přidat jezdce"**:
   - Přidá prázdný řádek do tabulky (nebo malý formulář), vyplním a uloží se do DB.

3. **Smazání jezdce**:
   - U řádku ať jde jezdce smazat (s potvrzením). Smaže se z DB.

4. Po importu/přidání/smazání ať se tabulka i počet jezdců v levém panelu
   **hned aktualizuje**.

## Na co dát pozor
- Nerozbij stávající inline editaci a vzhled.
- Vše jde přes ten bezpečný „most" (okno nesahá do DB ani na disk přímo).
- Diakritika v názvech listů i jménech musí projít správně (UTF-8).

## Na konci chci
- Naimportovat jezdce z mého `.xls` a vidět je ve správné kategorii.
- Ručně přidat a smazat jezdce, se zápisem do DB (přežije restart).

Než začneš, napiš mi krátký plán a řekni, jak ti ten soubor mám předat. Díky!
