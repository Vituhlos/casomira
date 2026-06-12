# Plán: `heroui-native` — plný UI rebuild na HeroUI v3

> Rozhodnuto 2026-06-10. Větev `heroui-native` vychází z `experiment/node-sqlite`.
> Inkrementální migrace (`experiment/heroui`) je archiv — kód z ní NEpřebíráme,
> slouží jen jako reference „co nedělat" (CSS override battly, dvojí tokeny).

## Schválená rozhodnutí (uživatel, 2026-06-10)

1. **FinaleAB.tsx a všechna vlastní Šotolina pravidla se mažou.** Šotolina se
   chová jako každá jiná kategorie (= dokončení cleanup issue 007).
2. **PDF výstupy se smí změnit, ale jen umírněně** — struktura, sloupce a
   rozložení listů musí zůstat rozpoznatelné, mění se jen vizuální kabát.
3. Pořadí screenů dle tohoto plánu.
4. **Appka je postavená ČISTĚ na HeroUI** — žádný vlastní markup ani vlastní
   stylované komponenty. Tabulky = HeroUI `Table`. Sidebar/toolbar = HeroUI
   primitiva. Vlastní soubory komponent smí existovat jen jako *pojmenované
   kompozice* HeroUI komponent (viz Fáze 3) — nulové vlastní CSS třídy,
   styling výhradně přes HeroUI theme tokeny + Tailwind utility.
5. **Settings není modal, ale samostatná obrazovka** (cíl v sidebaru).

---

## Co se NEmění (pevný základ)

Redesign je **renderer záležitost**. Nedotýkáme se:

- `src/main/**` — DB (node:sqlite), repo, scoring, zaver, PDF, backup, Sportity, updater
  - *jediná výjimka:* smazání legacy SOTOLINA/F_A/F_B větví (issue 007) — samostatné commity
- `src/preload/**` a `src/shared/**` — IPC API a typy
- `src/renderer/src/lib/api.ts`, `lib/time.ts`, `lib/stav.ts`, `lib/hotkeys.ts`, `data/*`

Každý nový screen se napojuje na **stejné API volání jako starý** — chování 1:1,
mění se jen prezentační vrstva.

## Cílový stav

- Jediný zdroj vzhledu: **HeroUI theme** (`casomira.css`) + Tailwind utility třídy
- `mac.css` a `app.css` **neexistují** (kromě `@media print` úprav, viz Fáze 7)
- Žádné `style={{ … }}` s barvami, žádné vlastní CSS třídy
- Všechny stavební bloky = HeroUI komponenty (Table, Toolbar, Breadcrumbs,
  ListBox, Tabs, Chip, Modal, Toast, Form/TextField/Select/…)

---

## Fáze 0 — Založení (½ h)

1. `git checkout -b heroui-native` z `experiment/node-sqlite`
2. `.heroui-docs/` přidat do `.gitignore` (lokální offline reference HeroUI v3 docs)
3. Tento plán commitnout jako první commit větve

## Fáze 1 — Foundation: instalace bez vizuálních změn (½ dne)

1. `npm i @heroui/react` (pin na konkrétní v3.0.x, bez `^`) + `npm i -D tailwindcss @tailwindcss/vite`
2. `electron.vite.config.ts` → renderer plugins: přidat `tailwindcss()`
3. Nový `src/renderer/src/styles/main.css`:
   ```css
   @layer theme, base, components, utilities;
   @import "tailwindcss";
   @import "@heroui/styles";
   @import "./theme/casomira.css" layer(theme);
   ```
4. Starý `app.css` + `mac.css` **zatím zůstávají** importované vedle — appka
   musí být po celou dobu rebuildu spustitelná (strangler pattern).
5. Ověření: `npm run dev` — starý UI beze změn, typecheck zelený.

**Pozor:** HeroUI v3 vyžaduje Tailwind v4 (CSS-first config, žádný
`tailwind.config.js`). Vite 7 + electron-vite 5 jsou kompatibilní.

## Fáze 2 — Design systém: app-specific tokeny (½ dne)

HeroUI výchozí téma se **nepřepisuje** — komponenty jedou s výchozími barvami.
`casomira.css` přidává pouze tokeny specifické pro Časomíru (přes `@theme inline`):

**App-specific tokeny:**
- Stavy: `--color-stav-dnf` (oranžová), `--color-stav-dns` (šedá), `--color-stav-dq` (červená) + soft bg varianty
- Medaile: `--color-medal-gold/silver/bronze`
- Layout: `--spacing-sidebar` (252px), `--spacing-toolbar` (52px)

**Typografie:** system-ui stack (SF Pro na macOS, Segoe UI Variable na Win) — již v `casomira.css`.
`tabular-nums` na všech číselných buňkách (časy, body — zarovnat vpravo).

**Dark mode:** `useTheme.ts` nastavuje na `<html>` současně `class="dark"`
i `data-theme="dark"` (HeroUI vyžaduje obojí). Přepínač v appce, persist do
localStorage, default dle OS.

**Kitchen-sink obrazovka** (DevKit, hash `#kit`): přehled HeroUI komponent, Chip
badge stavů, formulářových polí v light i dark — vizuální reference pro screens.

### Gate: prototyp editovatelné HeroUI Table (součást kitchen-sink)

HeroUI `Table` umí řazení, selekci, resize sloupců, sticky hlavičku i
virtualizaci — ale **inline editace vestavěná není**; dělá se vložením HeroUI
`Input`/`NumberField` do `Table.Cell`. Table stojí na React Aria (grid keyboard
navigace), takže DŘÍV než se na ni vsadí celá appka, ověřit v kitchen-sink:

- [ ] editace buňky: klik/fokus → `Input` v buňce, Enter potvrdí, Esc zruší
- [ ] šipky/Tab mezi buňkami se nehádají s inputem (React Aria grid vs. field)
- [ ] dvojklik na buňku času = cyklus OK→DNF→DNS→DQ
- [ ] zebra řádky (even/odd přes Tailwind na `Table.Row`)
- [ ] tabular-nums + zarovnání vpravo v číselných sloupcích

Pokud něco z toho s HeroUI Table nepůjde rozumně rozchodit, řeší se to **tady**
(úprava interakce, ne opuštění Table) — rozhodnutí padne ve Fázi 2, ne ve Fázi 5.

## Fáze 3 — Kompoziční vrstva (½–1 den)

`src/renderer/src/ui/` — POUZE pojmenované kompozice HeroUI komponent (žádný
vlastní markup, žádné vlastní CSS). Účel: aby `StavBadge` vypadal všude stejně
a měnil se na jednom místě.

| Komponenta | Čistá kompozice z |
|---|---|
| `StavBadge` (DNF/DNS/DQ) | HeroUI `Chip` + stav tokeny |
| `MedalDot` (1./2./3.) | HeroUI `Badge`/`Chip` (dot varianta) + medal tokeny |
| `TimeCell` | `Table.Cell` + `tabular-nums text-right` + formát z `lib/time.ts` |
| `EditableCell` | `Table.Cell` + HeroUI `Input`/`NumberField` (vzor z gate prototypu) |
| `PhaseSegment` | HeroUI `Tabs` (pill), **overflow-x scroll** (hodně fází!) |
| Dialogy | HeroUI `Modal` / `AlertDialog` přímo, jednotná kostra |
| Toasty | HeroUI `Toast.Provider` (náhrada manuálního toast state) |
| Formuláře | HeroUI `Form`/`TextField`/`Select`/`Checkbox`/`Switch` přímo |

Staré soubory `ui.tsx`, `table.tsx`, `Modal.tsx`, `Segmented.tsx`, `SubTabs.tsx`,
`Tooltip.tsx` se v průběhu Fáze 5 přestanou používat a smažou.

## Fáze 4 — Shell (1–2 dny)

Celý shell z HeroUI primitiv:

- **Sidebar:** HeroUI `ListBox` (single selection = kategorie, modrá pilulka
  přes accent tokeny) na `Surface`/podkladu `--color-sidebar`; počty jezdců
  jako `Chip`; dole operátor + datum (`Typography`); **+ položka Nastavení**
  (Settings je nově obrazovka, ne modal).
- **Toolbar:** HeroUI `Toolbar` + `Breadcrumbs` vlevo; vpravo `Button`
  (Stopky, sekundární) + PDF split-button (`ButtonGroup` + `Dropdown`).
- **Fáze:** `PhaseSegment` (HeroUI Tabs) pod toolbarem.

Staré screeny se zatím renderují **uvnitř nového shellu** — vizuální mix je
dočasně OK, appka funguje pořád.

## Fáze 5 — Screens po blocích (hlavní práce, ~1 týden)

Pořadí od nejjednoduššího k nejsložitějšímu; po každém bloku: typecheck +
ruční smoke v dev + kontrola dark mode + **rychlá kontrola PDF daného listu**:

1. **Intro:** `RaceList` + `RaceDialog`
2. **Startovka:** `StartList` + `ImportDialog`
3. **Rošty:** `Grids` / `RostGrid` (autofill, inline editace dle gate vzoru)
4. **Výsledky:** `Results` / `QVysledky` + `PenalizaceDialog` + `UpravaLogModal`
   (paste-box, dvojklik stavy, override × — nejvíc interakcí)
5. **Klasifikace:** `Standings` / `Overall`
6. **SF/Finále:** `Semifinale`, `Finale`, `QFaze`.
   `FinaleAB.tsx` se **maže bez náhrady** (legacy F_A/F_B data → neutrální
   hláška „legacy fáze už není podporována", pokud na ni něco narazí).
7. **Settings jako obrazovka** (ne modal — cíl v sidebaru, HeroUI `Form` +
   `Fieldset` + `Switch`/`Select`, sekce přes `Separator`/`Tabs`) + zbylé
   modaly: `TiskovyPresetModal`, `SportityModal`, `RestoreBackupModal`,
   `PrinterPickerModal`, `HotkeyHelp`.

Pravidlo: screen se přepisuje **celý najednou** (žádné půlené soubory se starým
i novým stylem), starý soubor se maže ve stejném commitu.

### 5b. Cleanup issue 007 — Šotolina legacy (samostatné commity)

Schváleno: smazat zbytky SOTOLINA ruleset logiky i mimo renderer — `F_A`/`F_B`
větve ve scoring/zaver/repo, SOTOLINA podmínky, mrtvé typy. Šotolina = běžná
STANDARD kategorie. DB data se nemažou (legacy závody zůstanou čitelné, jen bez
specializovaného UI). Spustit testy (`kvalifikace.test.ts`, `tiebreak.test.ts`)
po každém kroku.

## Fáze 6 — StopkyApp (1 den)

Druhé okno (stopky) — vlastní entry, sdílí theme + kompozice. Velké tlačítko,
živý seznam kliků (HeroUI Table), klávesnice (mezerník/Backspace) beze změn.

## Fáze 7 — Cleanup + PDF + QA (1–2 dny)

1. Smazat `mac.css`, `app.css`, staré komponenty — grep na mrtvé tokeny
   (`var(--text-…)`, `var(--hairline)`, …) musí být prázdný.
2. **PDF export je WYSIWYG** (`webContents.printToPDF`). Schválený mantinel:
   vzhled PDF se smí změnit jen umírněně — stejné sloupce, stejné pořadí listů,
   stejné názvy souborů, čitelnost na A4 (vč. černobílého tisku). Projít všech
   14 výstupů (§12 CLAUDE.md); kde nový vzhled na papíře neobstojí (zebra
   kontrast, barevné Chip badge), srovnat přes `@media print`.
3. `npm run typecheck` + `npm test`
4. `npm run dist:win:dir` smoke build.

---

## Rizika

| Riziko | Mitigace |
|---|---|
| React Aria Table vs. inline editace | gate prototyp ve Fázi 2 — ověřeno dřív, než na tom stojí appka |
| PDF výstupy se rozsypou | kontrola PDF po každém bloku Fáze 5 + `@media print` |
| HeroUI v3 breaking changes | pin přesné verze, `.heroui-docs/` offline reference |
| Hodně fází se nevejde do segmentu | overflow-x scroll v PhaseSegment od začátku (CLAUDE.md §2c) |
| Smazání Šotolina legacy rozbije scoring | samostatné commity + existující vitest testy po každém kroku |
| Dvojí styly během přechodu | strangler pattern: starý CSS žije, dokud žije poslední starý screen; pak smazat v jednom commitu |

## Odhad

Fáze 0–4: ~3–4 dny · Fáze 5 (+5b): ~1 týden · Fáze 6–7: ~2–3 dny.
Celkem zhruba **2 týdny** soustředěné práce po sessions.
