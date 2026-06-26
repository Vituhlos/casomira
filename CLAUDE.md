# CLAUDE.md — Správce závodu autokros / rallycross (desktop app)

> Zadání pro Claude Code. Cíl: nahradit sadu Excelových `.xlsm`/`.xlsx` sešitů
> jednou nativní desktopovou aplikací pro **Windows a macOS**, která **věrně
> kopíruje stávající workflow a pravidla** (MVP) a teprve poté přidává
> vylepšení (fáze 2).

---

## 0. AKTIVNÍ PRÁCE — Avalonia UI rebuild (čti první)

> **Probíhá přepis UI z Electronu na čistou AvaloniaUI (.NET).** Stack §2b
> (Electron/React) je teď **vizuální + logická SPECIFIKACE/reference**, ne cíl
> buildu. Zdroj pravdy směru: [docs/dev/plan-verdict-ui-rebuild.md](docs/dev/plan-verdict-ui-rebuild.md).
> Logika (`Verdict.Core`) + testy se **zachovávají**, přepisuje se prezentační vrstva.
> Sdílená design-system vrstva: `apps/desktop-net/Verdict.UI`.

### UI work loop — definition of done pro každou obrazovku/komponentu
1. **Načti matching `avalonia` subskill** před psaním (mvvm, controls/data-display,
   custom-controls, pro-max/design-system…). Skill > odhad.
2. **Stav jen z `Verdict.UI`** — tokeny + komponenty. ŽÁDNÝ raw hex, žádná
   magická čísla (font z `FontSize*`, spacing ze `Space*`).
3. **Architektura:** View = `UserControl`; VM = CommunityToolkit
   (`[ObservableProperty]`/`[RelayCommand]`, `partial`), `ObservableCollection`,
   async commandy; routing přes ViewLocator.
4. **Ověř vizuálně objektivně** — headless render do PNG a porovnej s Electron
   referencí: `dotnet run -c Release -- --render out.png [w h]` (NE computer-use).
   Před buildem zabij běžící instance (DLL lock); NIKDY `open_application` po
   `dotnet run` (spustí druhou instanci).
5. **`ava-review`** na nový AXAML.
6. **Před „hotovo":** relevantní body `avalonia-pro-max/review-checklist`
   (focus ring, light/dark, tokeny). Plný screen-reader pass NEřešit (single-operator
   offline nástroj). Compact šířku ANO (sidebar SplitView už sbaleno).
7. **Commit** po každém ověřeném kousku.

### Gotchas (nezopakovat)
- **`StaticResource` na app-merged tokeny ve Styles souboru NEfunguje** →
  `KeyNotFoundException`. Ve stylech vždy `DynamicResource`.
- **`ExtendClientAreaChromeHints` v Avalonii 12.0.5 NEEXISTUJE** (skilly cílí
  starší build). Custom titlebar neřešíme — necháváme OS titlebar (tmavý přes
  dark theme), jako Electron.
- **Soft tabulky NE přes `DataGrid`** (desktop-grid look) → `ListBox.verdict-table`,
  zebra přes `:nth-child(even)`.

---

## 1. Kontext

Nahrazujeme časoměřičský systém vedený v Excelu. Dnes: **1 sešit na kategorii**,
14 listů, propojeno přes `VLOOKUP` podle startovního čísla, rošty se mezi koly
přepisují ručně, časy se ručně kopírují z programu Free Stopwatch, ručně řadí a
přepisují. Pravidla jsou v dokumentu „Časoměřičská bible".

**Logika i pravidla musí v MVP sedět 1:1.**

## 2. Provozní režim (rozhodnuto)

- **Jeden operátor, jeden počítač, plně offline.** Žádný server, síť ani účty.
- Data v lokální SQLite v app-data adresáři.

## 2b. Technologický stack (rozhodnuto)

- **Electron** (desktopový obal, „appka jako Chrome / VS Code / Discord").
- **React + Vite + TypeScript** (UI).
- **SQLite** přes `node:sqlite` (vestavěný v Node.js 22+) — lokálně, offline. Migrace z `better-sqlite3` dokončena v `0.9.9-beta`.
- **Instalačky** přes `electron-builder`. Windows: **instalátor** (`Verdict-Setup-x.y.z.exe`,
  NSIS) — appka se **nainstaluje jako normální program** (ikona na ploše i v Start menu,
  záznam v „Přidat/odebrat programy", čistá odinstalace). NE portable .exe.
  macOS: `.dmg`.
- **PDF export** přes tisk renderovaného HTML do PDF (Electron `webContents.printToPDF`).
- **Import** `.xls`/`.xlsx` přes `xlsx` (SheetJS).
- Pozn.: build instalačky pro Windows se dělá na Windows, `.dmg` na macOS
  (nebo přes CI / GitHub Actions). V MVP stačí cílit platformu, na které se
  reálně časoměří.

## 2c. Design (AKTUALIZOVÁNO 2026-06-10 — HeroUI v3 výchozí téma)

UI je postavené **čistě na HeroUI v3** s výchozím tématem — žádná vlastní macOS
paleta, žádné přepisování HeroUI tokenů. Cíl: čistý, funkční design bez zbytečného
visual noise.

**Layout:**
- **Levý sidebar:** seznam kategorií + počet jezdců vpravo; vybraná položka
  zvýrazněna přes HeroUI `ListBox` selection styl. Dole jméno operátora + datum.
- **Toolbar nahoře:** vlevo breadcrumb („N1600 → Výsledky Q1"); vpravo **Stopky**
  (sekundární tlačítko) a **Uložit PDF** (primární tlačítko).
- Pod toolbarem **segmentový přepínač fází**. Fází je hodně → MUSÍ řešit
  **přetékání / vodorovný scroll**, ne ořezávat.
- Obsah = HeroUI `Table` se zebra řádky.

**Barvy:** HeroUI výchozí light + dark téma. Přepínač světlý/tmavý v appce.

**Typografie:**
- Font: system-ui stack (SF Pro na macOS, Segoe UI Variable na Windows). Běžný text ~13–14 px.
- **Tabular figures** (čísla pevné šířky) ve všech tabulkách; časy a body zarovnat vpravo.

**Stavové odznaky (badge):** `DNF` oranžová, `DNS` šedá, `DQ` červená — HeroUI `Chip`.

**Zvýraznění pořadí:** 1./2./3. místo malý medailový puntík (zlatá/stříbrná/bronzová).

**App-specific tokeny** (jediné rozšíření výchozího tématu):
- Barvy stavů: `--color-stav-dnf/dns/dq` + soft varianty
- Barvy medailí: `--color-medal-gold/silver/bronze`
- Layout: `--spacing-sidebar`, `--spacing-toolbar`

## 2d. Referenční prototyp (pouze UX reference, NE vizuální základ)

Složka `reference/Casomira-macOS/` — klikací prototyp. Slouží **pouze jako UX
reference** pro interakce (inline editace buněk, autofill, dvojklik stavy, stopky).
Vizuální styl z prototypu NEpřebíráme — `mac.css` je smazán.

**UX detaily k zachování:**
- Inline editace buněk (Enter potvrdí, Esc zruší)
- Autofill odvozených polí v roštech podle startovního čísla
- Dvojklik na čas = cyklus DNF/DNS/DQ
- Stopky: mezerník = záznam, Backspace = vrátit poslední
- Formát času `mm:ss.sss`

**NEPŘEBÍRAT — bodování v prototypu je NESPRÁVNÉ** (viz §4–§5 pro správná pravidla).

## 3. Hierarchie a formáty (KLÍČOVÉ)

**Hierarchie:** Závod → Kategorie → Fáze.
- **Závod** má **typ** (RAC Race / RX Cup), volený **při založení** (není to živý
  přepínač — typ určuje kostru fází i výchozí seznam kategorií).
- **Kategorie** = ekvivalent jednoho dnešního excelového sešitu. Každá je **plně
  samostatná** (vlastní startovka, rošty, body, klasifikace, PDF). Vybírá se
  z levého panelu. Body se nesdílí mezi kategoriemi.
- **Pravidla jedou na úrovni kategorie** (`ruleset`): aktuálně jen `STANDARD` (dle typu závodu RAC/RX). Speciální `SOTOLINA` ruleset byl deaktivován v `0.9.7-beta` — viz issue 007.

Aplikace musí umět tři varianty pipeline:

### Vztah k „časoměřičské bibli" (DŮLEŽITÉ — vyjasněno s uživatelem)
- **RAC Race JE Hobby.** Celá bible platí pro RAC Race **včetně** pasáží
  označených „Hobby" — ty NEJSOU výjimka, ale přímo definují, jak RAC Race jede
  (např. finále na 10 jezdců u kategorií, kde to tak je nastaveno).
- **Šotolina je kategorie v RAC Race** s `ruleset=STANDARD` — jede stejnou pipeline jako ostatní kategorie. Speciální pravidla (body 14→1, finále A/B, los tiebreak, skupiny) byla deaktivována v `0.9.7-beta`. Není to samostatný typ závodu.
- **RX Cup jede taky podle bible, ALE ignoruje:** (a) „Hobby" specifika v semifinále
  (řídí se standardní variantou, ne hobby), (b) veškeré zmínky o Šotolině
  (RX Cup nemá šotolinové kategorie).

### 3a. RAC Race (Hobby Rallycross) — `typ=RAC`, `ruleset=STANDARD`
Listy: Startovní listina → Rošty/Výsledky Q1 → Q2 → **Celkově po Q2** → Q3 →
**Celkově po Q3** → **Semifinále** → **Finále** → Celkově.
Kategorie: Cross Cup, Dámský pohár do 1400, Dámský pohár nad 1400, Junior,
N1400, N1600, N1600+, S1600, S1600+, Škoda Cup, Šotolina (vše `ruleset=STANDARD`).

### 3b. RX Cup — `typ=RX`, `ruleset=STANDARD`
Jako RAC Race, ale **bez listu „Celkově po Q2"** (jen po Q3). Závěr SF → Finále.
Kategorie: DX, N1400, N1600, N1600+, S1400, S1600, S1600+, S4x4, Škoda Cup.

### 3c. Šotolina — `ruleset=STANDARD` (kategorie v RAC závodě)
Jede **stejnou pipeline jako ostatní RAC Race kategorie** (viz 3a). Od `0.9.7-beta` není Šotolina odlišena žádnou speciální logikou. Zbytky legacy kódu (F_A, F_B, SOTOLINA větve) čekají na cleanup — viz issue 007.

## 4. Bodové žebříčky (ověřeno proti vzorům)

| Pořadí | RAC Race / RX Cup |
|--------|-------------------|
| 1.     | 50                |
| 2.     | 45                |
| 3.     | 42                |
| 4.     | 40                |
| 5.     | 39                |
| 6.     | 38                |
| 7.     | 37                |
| 8.     | 36                |
| 9+     | dále −1 za místo  |

Žebříčky musí být **konfigurovatelné** (tabulka `bodovy_zebricek`). Šotolina používá stejný žebříček jako ostatní STANDARD kategorie.

## 5. Penalizace / stavy

**RAC Race / RX Cup (Hobby) — platí pro všechny kategorie vč. Šotoliny:**
- `DNF` (nedokončí) = body za **poslední místo − 1**
- `DNS` (nepřejede startovní čáru) = body za **poslední místo − 5**
- `DQ` (vyloučen z jízdy) = body za **poslední místo − 10**

„Poslední místo" = počet jezdců v dané jízdě.

## 6. Nasazování roštů (seeding)

### RAC Race / RX Cup (platí pro všechny kategorie vč. Šotoliny)
- **Q1** = podle **losu**.
- **Q2** = **obrácené pořadí** losu.
- **Q3** = podle **Celkově po Q2** (u RX Cup: podle průběžných bodů po Q2).
- Max **8 jezdců na jízdu**. Víc jezdců → víc jízd (např. 15 = 3×5).
- U Q2 a Q3 s více jízdami se řadí **podle času** a platí:
  „nejpomalejší skupina jede první". Tzn. 1. jízda = nejpomalejší skupina,
  poslední jízda = nejrychlejší. (15 jezdců: 1.jízda = pořadí 11–15,
  2.jízda = 6–10, 3.jízda = 1–5.)

## 7. Klasifikace po sériích a tiebreak

- Klasifikace = součet bodů ze všech odjetých kol, **seřazeno sestupně**.
- **Tiebreak:** při shodě bodů rozhoduje lepší výsledek v Q3, pak Q2, pak Q1.

## 8. Kvalifikace do semifinále / finále

Jezdec je kvalifikován, když má **jednu rozjížďku kompletní A zároveň do jedné
alespoň odstartoval**. **DQ v jízdě = jako kdyby nenastoupil.**

### RAC Race / RX Cup
- **Semifinále** se koná při **≥ 12 kvalifikovaných** jezdcích. Max 16 (2×8).
  - 1. jízda = **liché** pořadí (1,3,5,7,9,11,13,15)
  - 2. jízda = **sudé** pořadí (2,4,6,8,10,12,14,16)
  - Čas v SF se měřit nemusí (jen pro penalizace).
  - Do finále postupují **první 4 z každé jízdy**.
  - Pořadí na startu finále: porovnej jezdce na stejné pozici z obou SF jízd,
    rozhoduje **více bodů po Q3** (pole position = lepší z 1. míst obou jízd…).
- **Finále:** při < 12 kvalifikovaných postupuje rovnou **prvních 8** z „po Q3"
  (za stejné kvalifikační podmínky).
- **HOBBY: finále jede 10 jezdců** → 10 přímo, nebo prvních 5 ze semi A i B.

## 9. Celkové výsledky

- `Celkově = Q (celkem) + SF + F` (u RX Cup bez SF, pokud < 12 kvalifikovaných).
- Seřazeno sestupně dle celkových bodů (tiebreak viz §7).

## 10. Náhrada časoměřičského workflow (zabít ruční přepisování)

Dnes: Free Stopwatch → „Kolo" → „Kopírovat do schránky" → vložit do Excelu →
seřadit → smazat poslední (automaticky vložený) čas → překopírovat do tabulky →
dopsat startovní čísla → po všech jízdách ručně seřadit podle času.

V appce:
- Pole pro **hromadné vložení časů ze schránky** (paste-box): operátor nakopíruje
  výstup z Free Stopwatch, appka **rozparsuje časy**, zahodí poslední řádek
  (volitelně), **seřadí** a nechá operátora jen **přiřadit startovní čísla**
  (drag/řádkově).
- Po zadání se **automaticky vypočte pořadí a body** (vč. penalizačních stavů).
- Žádné ruční řazení tabulky.

## 11. Datový model (SQLite)

```
zavod        (id, nazev, datum, misto, typ)      -- typ ∈ {RAC,RX}
kategorie    (id, zavod_id, nazev, ruleset)
              -- ruleset ∈ {STANDARD} (aktivní); SOTOLINA v DB existuje jen jako legacy
              -- STANDARD = chová se dle typu závodu (RAC vs RX kostra)
              -- výchozí ruleset se předvyplní podle typu závodu
jezdec       (id, kategorie_id, st_cislo, prijmeni, jmeno,
              znacka, model, rok_narozeni, los)
              -- UNIQUE(kategorie_id, st_cislo)
skupina      (id, kategorie_id, nazev)            -- legacy, nepoužívá se pro nová data
kolo         (id, kategorie_id, typ, poradi)
              -- typ ∈ {Q1,Q2,Q3,SF,F} (F_A,F_B jen v legacy datech)
jizda        (id, kolo_id, cislo, skupina_id NULLABLE)
rost_pozice  (id, jizda_id, pozice, jezdec_id)    -- pozice 1..8
vysledek     (id, jizda_id, jezdec_id, namereny_cas_ms, penalizace_ms,
              stav, rucni_poradi NULLABLE, poradi, body, poznamka)
              -- stav ∈ {OK,DNF,DNS,DQ}
              -- namereny_cas_ms = surové měření (NEpřepisovat, jen u překlepu)
              -- penalizace_ms   = časová penalizace přičtená ředitelem (default 0)
              -- rucni_poradi     = ruční přepis pořadí (má přednost před časem)
              -- poradi           = výsledné pořadí (z času+penalizace, nebo rucni_poradi)
uprava_log   (id, vysledek_id, typ, hodnota, duvod, rozhodl, kdy)
              -- typ ∈ {POSUN_PORADI,CASOVA_PENALIZACE,ZMENA_STAVU,OPRAVA_CASU}
              -- audit: každý zásah ředitele/časoměřiče se loguje (důvod povinný)
zebricek     (id, ruleset, poradi, body)          -- STANDARD: 50/45/42…
pravidla     (id, ruleset, ...)                    -- penalizace, prahy SF, finále apod.
mereni       (id, jizda_id, poradi_kliku, cas_ms, jezdec_id NULLABLE)
              -- záznam z vestavěných stopek (fáze 2): jeden řádek = jedno
              -- kliknutí v cíli; jezdec_id se doplní přiřazením st. čísla z papíru
```

## 12. MVP rozsah (1:1 s Excelem)

- Typ závodu (RAC / RX) volený při založení; kategorie s `ruleset=STANDARD`. Výběr kategorie z levého panelu.
- Startovní listina + import z `.xls`/`.xlsx` (seznam jezdců + los).
- Rošty (zadání st. čísla → autofill jména/značky/modelu).
- Výsledky (paste-box časů → auto pořadí + auto body + penalizační stavy).
- Klasifikace po Q2/Q3 s korektním tiebreakem dle formátu.
- SF / Finále + Celkově.
- **PDF export** všech listů se shodnými názvy:
  `Startovní_listina.pdf`, `Q1_rošty.pdf`, `Q1_výsledky.pdf`, `Q2_rošty.pdf`,
  `Q2_výsledky.pdf`, `Klasifikace po Q2.pdf`, `Q3_rošty.pdf`, `Q3_výsledky.pdf`,
  `Klasifikace po Q3.pdf`, `Semifinále rošty.pdf`, `Semifinále výsledky.pdf`,
  `Finále rošty.pdf`, `Finále výsledky.pdf`, `Celkové výsledky závodu.pdf`.
  (Šotolina: `Finále A/B …`.)
  **Princip jako stávající VBA:** jedno tlačítko = uloží daný list/obrazovku do
  PDF tak, jak vypadá (WYSIWYG, žádná zvláštní šablona). Obrazovky jsou HTML,
  takže stačí vytisknout do PDF (Electron `webContents.printToPDF`). Názvy
  souborů zachovat shodné s dnešními.

## 13. Fáze 2 — vylepšení

1. **Auto-seedování roštů** podle pravidel §6 (Q2 obráceně, Q3 dle klasifikace,
   skupinové řazení podle času, nejpomalejší jede první).
2. **Auto-generování SF/finále** vč. nasazovacího klíče (§8).
3. **Kontrola kvalifikace** jezdců (kompletní + odstartovaná jízda, DQ logika).
4. Živá průběžná klasifikace **napříč všemi kategoriemi** na jedné obrazovce.
5. Validace (duplicitní čísla, prázdné rošty, chybějící časy).
6. **Úprava výsledku / penalizace (rozhoduje ředitel závodu).**
   Naměřený čas se NEpřepisuje — úprava je vrstva navrch s auditní stopou
   (zápis do `uprava_log`, povinný důvod + kdo rozhodl + kdy):
   - **Posun pořadí (hlavní nástroj)** — „posuň jezdce za 5. místo" / nastav
     konkrétní pozici (`rucni_poradi`). Appka přeřadí, původní čas zůstává vidět.
     Pokrývá nejčastější reálný případ („přidat tolik, aby byl za pátým").
   - **Časová penalizace** — přičti X s (`penalizace_ms`), přepočti pořadí i body.
   - **Změna stavu** — DNF / DNS / DQ; bodová pravidla dle formátu (§5) dopočítají.
   - Vždy vidět vedle sebe: **naměřeno → penalizace → výsledek → důvod**.
7. Záloha/obnova celého závodu (`.sqlite` nebo JSON export/import).
8. **Vestavěné stopky** (nahrazují Free Stopwatch + ruční kopírování).
   Nahrazují dnešní postup: měření v cíli + papírový zápis pořadí + ruční slepování.
   - Operátor zmáčkne **Start** na začátku jízdy (zelená vlajka).
   - Při každém cílovém průjezdu klik na velké tlačítko / **mezerník** → uloží se
     `cas_ms` v pořadí kliků do tabulky `mereni`. Seznam naskakuje **živě**.
     (Předpoklad: jeden klik = jeden cílový průjezd auta, ne každé kolo.)
   - **Vrátit poslední klik** (Ctrl+Z / Backspace) a ruční oprava jednoho času.
   - Po dojetí operátor **přiřadí startovní čísla** v pořadí, jak je diktuje
     zapisovatel průjezdů z papíru (1. klik → 1. číslo …). Lze i přímo při kliku.
   - Z `mereni` se vygenerují `vysledek` řádky, appka **seřadí podle času a
     přidělí body** (vč. DNF/DNS/DQ). Žádný clipboard, žádné ruční řazení.
   - Plně klávesnicí ovladatelné. Přesnost = lidská reakce (~0,2 s), tj. stejná
     jako dnes s Free Stopwatch; pro vyšší přesnost by byl nutný HW (světelná
     závora / transpondéry) — mimo rozsah.
9. (Volitelně později) zadávání z mobilů přes lokální síť — teď NEřešit.

## 14. Roadmapa pro Claude Code

1. Scaffold **Electron + React + Vite + TypeScript** + `better-sqlite3` + migrace.
2. Datová vrstva + výběr závodu/formátu/kategorie.
3. Startovní listina + import .xls/.xlsx.
4. Rošty (autofill) + Výsledky (paste-box, auto body, stavy).
5. Klasifikace + tiebreaky dle formátu.
6. SF + Finále (A/B) + Celkově.
7. PDF export (všechny cílové soubory §12).
8. Buildy: Windows **instalátor** (NSIS `Setup.exe`, ikona + Start menu +
   odinstalace) a macOS `.dmg`; notarizace dle potřeby.
9. Fáze 2.

## 15. Konvence

- Čeština v UI i v názvech PDF (pozor na diakritiku).
- Plně offline, žádné externí API.
- Časy interně `cas_ms` (integer), zobrazení `mm:ss.sss`.
- Datum jako skutečné datum, ne sériové číslo.
- TypeScript strict; datová/pravidlová logika oddělená od UI a **parametrizovaná
  **parametrizovaná pravidly kategorie** (`ruleset`: STANDARD dle typu závodu
  RAC/RX, nebo SOTOLINA), ať se pravidla nerozsypou.

## 16. Verzování a changelog (pravidlo vydávání)

Verze dle **SemVer** (`MAJOR.MINOR.PATCH`), zatím v řadě `0.9.x`. Každé vydání má
záznam v `CHANGELOG.md` a vzniká přes tag — z něj CI postaví instalačky a založí
GitHub Release, jehož **popis se bere přímo z `CHANGELOG.md`**.

**Postup při každém vydání (drž ho i jako Claude Code):**
1. **`CHANGELOG.md`** — nahoru přidej sekci `## [X.Y.Z] – RRRR-MM-DD` s podsekcemi
   **Přidáno / Změněno / Opraveno** (formát *Keep a Changelog*, česky, čitelně pro
   uživatele — ne výpis commitů). Doplň i odkaz `[X.Y.Z]: …compare…` dole.
2. **`package.json`** — zvedni `version` na `X.Y.Z` (zdroj „build N" v O aplikaci).
3. **Build metadata** — před buildem/typecheckem se automaticky generuje
   `src/shared/buildInfo.generated.ts`; ručně ho needituj.
4. **Ověření release** — spusť `npm run check:release -- vX.Y.Z` (kontrola
   shody tagu, `package.json` a `CHANGELOG.md`), potom `npm run typecheck` a
   `npm test`.
5. **Commit** obojí (+ vlastní změny) jednou dávkou.
6. **Tag** `vX.Y.Z` a `git push origin master --tags` (nebo push tagu).
7. CI (`.github/workflows/release.yml`) postaví Win `.exe` + macOS `.dmg`, a
   `scripts/release-notes.mjs` vytáhne sekci `X.Y.Z` z `CHANGELOG.md` jako popis
   Release (+ instalační/Gatekeeper poznámka). Žádné ruční psaní popisu.

Číslo bump: **PATCH** = opravy/drobnosti, **MINOR** = nová funkce, **MAJOR** až po
`1.0.0`. Předvydání = tag se suffixem (`vX.Y.Z-beta`) → Release se označí jako
*pre-release* automaticky.

**Profesionální release standard (desktop):**
- Docker, `/api/version` a `/api/health` se pro offline Electron desktop nepoužívají.
- Ekvivalent `/api/version` je IPC diagnostika `app:diagnostics` a panel
  **Nastavení → O aplikaci**.
- Produktová změna v PR musí upravit `CHANGELOG.md`, nebo mít label
  `no-changelog-needed` (guardrail `.github/workflows/changelog.yml`).
- Při bug reportu/supportu používej tlačítko **Kopírovat diagnostiku** z panelu
  O aplikaci; obsahuje verzi, commit, build date, runtime, DB schema a cesty k datům.

## Struktura repozitáře (kde co leží)

**Aktuálně (flat):** aplikace v `src/`, konfigurace v kořeni — viz [docs/README.md](docs/README.md).

**Cíl (monorepo, až vznikne archiv):** `apps/desktop` + `apps/archiv` + `packages/shared` — plán
[docs/dev/plan-monorepo-layout.md](docs/dev/plan-monorepo-layout.md). Přesun až při založení `apps/archiv`, ne předčasně.

```
src/                    # Produkční aplikace (Electron) — později apps/desktop/src/
reference/Casomira-macOS/  # Klikací prototyp vzhledu — NE pravidla bodování
docs/design.md          # Design system (UI tokeny, layout) — Stitch / mac.css
docs/user/              # Návody pro testery (MD + Word), instalace Mac
docs/dev/               # BUILD, plány (archiv, monorepo, stopky)
docs/prompts/           # Historické zadání pro scaffold / import
fixtures/               # Ukázkové .xls / PDF pro test importu
build/                  # Ikony pro instalátor
bordel/                 # Lokální jen u tebe (.gitignore) — instalátory, zálohy
```

Kořen: `CLAUDE.md` (tento soubor), `README.md`, `CHANGELOG.md`, `package.json`.
Konfigurace AI/MCP: `.cursorrules`, `.cursor/mcp.json`, `.mcp.json`.

<!-- code-review-graph MCP tools -->
## MCP Tools: code-review-graph

**IMPORTANT: This project has a knowledge graph. ALWAYS use the
code-review-graph MCP tools BEFORE using Grep/Glob/Read to explore
the codebase.** The graph is faster, cheaper (fewer tokens), and gives
you structural context (callers, dependents, test coverage) that file
scanning cannot.

### When to use graph tools FIRST

- **Exploring code**: `semantic_search_nodes` or `query_graph` instead of Grep
- **Understanding impact**: `get_impact_radius` instead of manually tracing imports
- **Code review**: `detect_changes` + `get_review_context` instead of reading entire files
- **Finding relationships**: `query_graph` with callers_of/callees_of/imports_of/tests_for
- **Architecture questions**: `get_architecture_overview` + `list_communities`

Fall back to Grep/Glob/Read **only** when the graph doesn't cover what you need.

### Key Tools

| Tool | Use when |
|------|----------|
| `detect_changes` | Reviewing code changes — gives risk-scored analysis |
| `get_review_context` | Need source snippets for review — token-efficient |
| `get_impact_radius` | Understanding blast radius of a change |
| `get_affected_flows` | Finding which execution paths are impacted |
| `query_graph` | Tracing callers, callees, imports, tests, dependencies |
| `semantic_search_nodes` | Finding functions/classes by name or keyword |
| `get_architecture_overview` | Understanding high-level codebase structure |
| `refactor_tool` | Planning renames, finding dead code |

### Workflow

1. The graph auto-updates on file changes (via hooks).
2. Use `detect_changes` for code review.
3. Use `get_affected_flows` to understand impact.
4. Use `query_graph` pattern="tests_for" to check coverage.
