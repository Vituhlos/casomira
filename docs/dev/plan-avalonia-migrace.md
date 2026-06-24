# Plán — migrace Electron → AvaloniaUI (.NET)

> **Účel:** Přepsat desktopovou aplikaci **Verdict** (dříve „Časomíra") z Electron (React/TS) na
> **AvaloniaUI (.NET / C#)** se **100% zachováním chování a pravidel** (1:1).
> **Důvod:** Electron je na cílovém HW pomalý a zasekává se; appka má dál růst.
> **Stav:** návrh — odsouhlasit rozsah a UI kit, teprve pak scaffold.
> **Větev:** `claude/avalonia-migration-plan` (z `claude/heroui-native-migration-ht3f5l`).
> **Souvisí s:** [CLAUDE.md](../../CLAUDE.md) (pravidla §3–§9 jsou zdroj pravdy), [BUILD.md](./BUILD.md).

---

## 0. Princip migrace (nejdůležitější věta dokumentu)

> **Nepřepisujeme pravidla, přenášíme je.** Logika v `scoring.ts` a `repo.ts` je
> už dnes oddělená od UI a parametrizovaná `ruleset`em. Ta se **portuje 1:1**.
> Přepisuje se jen **prezentační vrstva** (React → Avalonia) a **platformní obal**
> (Electron → .NET).

**Klíčový poznatek:** dnešní hranice **IPC** (most mezi React oknem a Node
hlavním procesem, `src/main/ipc.ts`, ~60 kanálů) je v podstatě **hotová
specifikace API**. V Avalonii procesní hranice zmizí (vše je jeden C# proces),
ale **kontrakt zachováme** jako C# rozhraní `IRaceService` — to drží migraci
poctivou a testovatelnou.

---

## 1. Co se zachovává 1:1 (akceptační kritéria)

Migrace je hotová, jen když platí **všechno** níže:

| Oblast | Zdroj pravdy dnes | Musí sedět |
|--------|-------------------|------------|
| Bodové žebříčky | `scoring.ts` + tab. `zebricek` | STANDARD 50/45/42… i SOTOLINA 14→1 |
| Penalizace stavů | `scoring.ts` + tab. `pravidla` | STANDARD offset od posl. dojetého; SOTOLINA pevné body |
| Pořadí v jízdě | `spocitejJizdu()` | dojetí dle času → nedojetí (DNF<DNS<DQ) → čekající |
| Ruční posun pořadí | `aplikujRucniPoradi()` | `rucni_poradi` má přednost, ostatní se posunou |
| Seeding roštů | `navrhniRost()` | Q2 obráceně, Q3 dle klasifikace, „nejpomalejší jede první" |
| Klasifikace + tiebreak | `getKlasifikace()` | RAC/RX: lepší výsledek v jakékoli jízdě; SOTOLINA: jen los |
| SF / Finále | `navrhSF/Finale/A/B()` | prahy, liché/sudé jízdy, finále 8/10, A/B u Šotoliny |
| Celkově | `getCelkove()` | RAC/RX = Q+SF+F; SOTOLINA = Q+F |
| Datový model | `schema.ts` + migrace v1–v9 | **stejný `.sqlite` soubor musí jít otevřít** |
| Import .xls/.xlsx | `excel.ts` (SheetJS) | stejný formát, stejný výsledek |
| PDF export | `pdf.ts` (printToPDF) | **stejné názvy souborů**, vizuálně shodné |
| Záloha/obnova | `backup/*` | formát `casomira-backup` čitelný oběma směry |
| Stopky | `StopkyApp.tsx` + `mereni*` | mezerník = záznam, Backspace = zpět, perzistentní timer |
| Klávesové zkratky | `useHotkeys.ts`, `hotkeys.ts` | stejné chování (Enter, dvojklik = cyklus stavu, …) |
| Vzhled | `reference/.../mac.css` tokeny | macOS HIG, light/dark, accent #007AFF/#0A84FF |

**Definice „hotovo" = paritní test:** stejný vstup (import téhož .xls + tytéž
zadané časy) → **bitově/hodnotově shodné body, pořadí a PDF obsah** jako Electron.

---

## 2. Cílový stack (.NET)

| Vrstva | Volba | Proč |
|--------|-------|------|
| Runtime | **.NET 9** | aktuální LTS-blízká řada, NativeAOT pro rychlost |
| UI framework | **AvaloniaUI 11** | nativní kreslené UI, Win+macOS, rychlé |
| UI kit / téma | **ShadUI** (základ) | nejblíž HeroUI/shadcn estetice, tokenizovatelné barvy |
| MVVM | **CommunityToolkit.Mvvm** | jednodušší než ReactiveUI, source-generated |
| SQLite | **Microsoft.Data.Sqlite** + **Dapper** | stejný formát DB jako `better-sqlite3` |
| Excel | **ClosedXML** | čte `.xlsx`; pro `.xls` viz §6 (riziko) |
| PDF | **QuestPDF** | C# fluent layout (viz §7 — největší rozdíl) |
| Build/instal. | **velopack** nebo `dotnet publish` + NSIS / `.dmg` | Win installer + macOS dmg |

> **UI kit — rozhodnuto:** ShadUI jako základ. Barvy z CLAUDE.md §2c se přepíšou
> přes ShadUI color tokeny (light/dark `ThemeDictionaries`). Kde ShadUI komponent
> nemá (např. segmentový přepínač fází s přetékáním), **doimplementujeme vlastní
> XAML** nad stejnými tokeny — **nemixovat** druhou knihovnu (SukiUI) do stejné
> appky (kolize stylů základních kontrol).

### Cílová struktura projektu

```
apps/desktop-net/                 # nový .NET projekt (vedle stávajícího Electronu)
├── Verdict.Core/                 # ŽÁDNÁ závislost na UI — testovatelné
│   ├── Model/                    # record třídy ~ shared/types.ts
│   ├── Data/                     # SQLite, schéma, migrace v1–v9
│   ├── Scoring/                  # port scoring.ts (čistá logika)
│   ├── Services/                 # port repo.ts → IRaceService
│   ├── Excel/                    # import
│   ├── Pdf/                      # report layouty (QuestPDF)
│   └── Backup/                   # export/import zálohy
├── Verdict.Desktop/              # Avalonia app
│   ├── ViewModels/
│   ├── Views/                    # XAML obrazovky
│   ├── Controls/                 # vlastní (segment fází, badge, medaile)
│   ├── Themes/                   # ShadUI override + mac tokeny
│   └── App.axaml
└── Verdict.Tests/                # paritní + jednotkové testy
```

Stávající Electron (`src/`) zůstává **nedotčený** a funkční, dokud .NET verze
neprojde paritními testy. Žádný „big bang".

---

## 3. Mapa portu (odkud kam)

| Dnes (TS) | Řádků | → Cíl (C#) | Náročnost |
|-----------|------:|-----------|-----------|
| `shared/types.ts` | 554 | `Core/Model/*.cs` (records, enums) | nízká |
| `main/db/schema.ts` | 137 | `Core/Data/Schema.cs` | nízká |
| `main/db/migrate.ts` | — | `Core/Data/Migrations.cs` (v1–v9) | **střední — kritické** |
| `main/db/seed.ts` | — | `Core/Data/Seed.cs` (žebříčky, pravidla) | nízká |
| `main/scoring.ts` | 157 | `Core/Scoring/ScoringEngine.cs` | nízká (čistá fce) |
| `main/repo.ts` | 2232 | `Core/Services/RaceService.cs` (rozdělit) | **vysoká — jádro** |
| `main/excel.ts` | 129 | `Core/Excel/Importer.cs` | střední |
| `main/pdf.ts` | 663 | `Core/Pdf/*Report.cs` | **vysoká — viz §7** |
| `main/zaver.ts` | 140 | `Core/Services/Zaver.cs` | střední |
| `main/backup/*` | — | `Core/Backup/*` | střední |
| `main/ipc.ts` | 248 | `IRaceService` rozhraní | nízká (jen tvar) |
| `renderer/screens/*` (10) | ~2700 | `Views/*.axaml` + `ViewModels/*` | **vysoká** |
| `renderer/components/*` (15+) | ~1900 | `Controls/*` + ShadUI | **vysoká** |
| `hooks/useHotkeys.ts` | — | Avalonia `KeyBindings` + `ICommand` | střední |

**Velikostně:** ~9 700 ř. TS → odhad ~12–15 tis. ř. C# + XAML.

---

## 4. Fáze (pořadí prací)

### Fáze 0 — Příprava (½ dne)
- Scaffold `apps/desktop-net` (3 projekty + test).
- NuGet balíčky, prázdné Avalonia okno běží.
- Paritní fixtures: vyexportovat z Electronu referenční výstupy (body, pořadí,
  PDF) pro 1× RAC, 1× RX, 1× SOTOLINA závod → zlatý standard pro testy.

### Fáze 1 — Core: data + pravidla (1–2 týdny) ★ základ
- Model (`types.ts` → records/enums).
- **Schéma + migrace v1–v9 1:1** — ověřit, že **stávající `.sqlite` z Electronu
  se otevře** a data sedí (žádná ztráta).
- Seed žebříčků a pravidel.
- **`ScoringEngine`** — port `spocitejJizdu` + `aplikujRucniPoradi`.
  → **Unit testy proti zlatým hodnotám hned tady** (penalizace, řazení stavů,
  ruční posun). Tohle je srdce; když sedí, zbytek je „jen" UI.
- `RaceService` — port `repo.ts` po doménách: závody/kategorie/jezdci → rošty →
  výsledky → klasifikace → závěr (SF/F/A/B) → celkově.

### Fáze 2 — Avalonia shell (3–5 dní)
- ShadUI + token override (barvy CLAUDE.md §2c, light/dark přepínač).
- Layout: sidebar (kategorie + počty), toolbar (breadcrumb, Stopky, Uložit PDF),
  **segmentový přepínač fází s vodorovným přetékáním** (vlastní control — pozor,
  v prototypu se „Celkově" ořezávalo, to NEopakovat).
- Routing obrazovek, napojení na `IRaceService` přes DI.

### Fáze 3 — Obrazovky (2–3 týdny)
Pořadí dle rizika (od jednoduchých k těžkým):
1. RaceList + RaceDialog (založení/výběr závodu).
2. StartList (+ import .xls/.xlsx).
3. Grids / RostGrid (autofill st. číslo → jméno/značka/model).
4. **Results** (paste-box časů → auto pořadí/body, dvojklik = cyklus DNF/DNS/DQ)
   — nejtěžší obrazovka.
5. Standings / Overall (klasifikace + tiebreaky).
6. Semifinale / Finale / FinaleAB.
7. Settings (logo, žebříčky, PDF kořen, téma).
8. PenalizaceDialog + UpravaLogModal (audit ředitele).

### Fáze 4 — PDF + Excel + Záloha (1–1,5 týdne)
- Excel import (ClosedXML) — paritní test proti `fixtures/`.
- **PDF reporty** (QuestPDF) — viz §7. Stejné názvy souborů (CLAUDE.md §12).
- Záloha/obnova — **formát čitelný oběma appkami**. Identifikátor formátu
  uvnitř souborů zůstává `casomira-backup` (`BACKUP_FORMAT`), i když je produkt
  přejmenován na **Verdict** — jinak by .NET verze nepřečetla starší zálohy.
  (Volitelně přijímat i `verdict-backup` při zápisu, ale číst musí oba.)

### Fáze 5 — Stopky + zkratky (1 týden)
- Stopky jako samostatné okno: mezerník = záznam, Backspace = zpět, perzistentní
  `mereni_timer` (přežije pád), přiřazení st. čísel, zápis do výsledků.
- Globální klávesové zkratky (HotkeyHelp obrazovka).

### Fáze 6 — Build + sjednocení (3–5 dní)
- Win installer (NSIS / velopack) + macOS `.dmg`.
- CI workflow (obdoba `release.yml`), verze, CHANGELOG.
- Po zelených paritních testech: rozhodnout o vyřazení Electronu.

**Hrubý odhad celkem: ~6–9 týdnů** soustředěné práce (s AI asistencí na portu
logiky výrazně méně). Fáze 1 a 3 jsou kritická cesta.

---

## 5. SQLite — zachování dat (kritické, snadno přehlédnutelné)

- DB soubor `better-sqlite3` je **standardní SQLite** → `Microsoft.Data.Sqlite`
  ho otevře beze změny formátu.
- **Migrace v1–v9 se musí portovat 1:1** včetně `user_version`, aby se otevřela
  i stará uživatelova databáze (ne jen fresh install).
- **Cesta k DB:** Electron používá `app.getPath('userData')`. .NET musí mířit na
  **stejný adresář**, jinak appka „nenajde" existující závody. Ověřit přesnou
  cestu na Win i macOS a sjednotit (nebo nabídnout import staré DB).
- Test: zkopírovat reálnou `.sqlite` z Electronu → otevřít v .NET → diff všech
  tabulek = 0 rozdílů.

---

## 6. Riziko: import `.xls` (starý formát)

- SheetJS (`xlsx`) čte i starý binární `.xls`. **ClosedXML čte jen `.xlsx`.**
- Pokud uživatel reálně importuje staré `.xls`, je třeba: **ExcelDataReader**
  (čte `.xls` i `.xlsx`) místo/vedle ClosedXML.
- **Akce:** zjistit z `fixtures/`, jaký formát se reálně používá. → Doporučení:
  **ExcelDataReader** pro čtení (pokrývá oba), bez rizika.

---

## 7. Riziko: PDF export (největší rozdíl proti Electronu)

**Dnes:** `webContents.printToPDF` vykreslí **stejné HTML jako obrazovka** →
WYSIWYG zdarma. V Avalonii tahle „klika" neexistuje.

**Možnosti:**
| Varianta | Plus | Mínus |
|----------|------|-------|
| **A) QuestPDF** (doporučeno) | rychlé, malé, C# fluent layout | každý report **napsat ručně** v C# |
| B) Avalonia → render do bitmapy/PDF | blízko WYSIWYG | horší typografie tabulek, kvalita tisku |
| C) Vložit Chromium (CefSharp/WebView2) | WYSIWYG jako dnes | tahá Chromium → popírá důvod migrace |

**Volba: A) QuestPDF.** Reportů je konečný počet (§12 CLAUDE.md: startovka,
rošty/výsledky Q1–Q3, klasifikace, SF, finále, celkově, + A/B). Layout se napíše
jednou jako sdílené komponenty (hlavička s logem, tabulka se zebra řádky, badge,
medaile). **Názvy souborů zachovat identické** (`Q1_rošty.pdf`, …, diakritika!).

---

## 8. Otevřené otázky (k rozhodnutí před Fází 1)

1. **Cesta k DB** — sdílet s Electronem (in-place upgrade), nebo nová cesta +
   jednorázový import staré DB? *(Doporučení: sdílet, ať uživatel nepřijde o data.)*
2. **`.xls` vs `.xlsx`** — používají se reálně staré `.xls`? *(→ ExcelDataReader pro jistotu.)*
3. **PDF parita** — stačí „vizuálně shodné a stejné názvy", nebo musí být
   pixel-identické? *(Doporučení: vizuálně shodné; pixel-parita je drahá a zbytečná.)*
4. **Rozsah MVP .NET** — portovat rovnou i fáze 2 funkce (penalizace, stopky,
   záloha), nebo nejdřív holé MVP a pak zbytek? *(Doporučení: nejdřív Core+MVP
   obrazovky, stopky a záloha až po paritě jádra.)*
5. **Souběh** — držet Electron a .NET paralelně do plné parity? *(Doporučení: ano.)*
6. **Rebranding Casomira → Verdict** — v branchi `heroui-native` je zatím
   **jen částečný** (jméno produktu nese pouze CI `package-check.yml`:
   `Verdict-Setup-*.exe`, `Verdict-*-mac-universal.dmg`). `package.json`
   (`"name": "casomira"`), CLAUDE.md, README i `BACKUP_FORMAT` pořád říkají
   Casomira/Časomíra. → Vyjasnit: dotáhnout rebrand v Electronu zvlášť, nebo ho
   provést rovnou v nové .NET verzi? *(Doporučení: .NET projekty pojmenovat
   `Verdict.*`, ale datový formát `casomira-backup` zachovat kvůli kompatibilitě.)*

---

## 9. První konkrétní krok (po schválení plánu)

1. Scaffold `apps/desktop-net` (Core + Desktop + Tests).
2. Port `types.ts` → `Core/Model`.
3. Schéma + migrace + seed → otevřít reálnou `.sqlite`, ověřit data.
4. `ScoringEngine` + **unit testy proti zlatým hodnotám** z Electronu.

→ Tím vznikne testovatelné jádro bez UI a potvrdí se, že pravidla sedí 1:1
dřív, než se investuje do XAML obrazovek.
