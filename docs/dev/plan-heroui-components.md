# HeroUI migrace — rozhodnutí komponent

> Dokument zachycuje, co bylo migrováno, co záměrně zůstalo custom a proč,
> a co je odloženo na budoucí plánování.  
> Navazuje na `plan-heroui-migration.md` (fázový přehled) a paměťový soubor `project_heroui-migration.md`.

---

## Stav k datu vzniku dokumentu

Tokeny (Days 1–6 + Bonus) jsou kompletní — `app.css` `:root`/`.dark` pokrývají celý
HeroUI token set: `--background`, `--surface`, `--foreground`, `--muted`, `--accent`,
`--accent-foreground`, `--border`, `--separator`, `--segment`, `--scrollbar`,
`--overlay`, `--overlay-foreground`, `--focus`, `--radius`, `--success/warning/danger`.

Zkontrolováno vůči HeroUI v3 (beta) dokumentaci — žádné chybějící tokeny pro
Tooltip, Modal, Dropdown.

---

## Migrováno — Day 7

### Modal.tsx → HeroUI Modal

**Co se změnilo:**
- `createPortal` + ruční `useEffect` na ESC → HeroUI `Modal.Backdrop` (controlled: `isOpen={true}`, `onOpenChange`)
- Backdrop klik + ESC zavření = HeroUI interní (ne ruční handler)
- **WAI-ARIA dialog** role, **focus trap**, **scroll lock** = přidány automaticky
- Vizuální design zachován 1:1 (custom header div + body div + footer div uvnitř `Modal.Dialog`)

**API** — žádná změna pro 13 callerů: stále `{cond && <Modal title onClose footer width>}`.
Uvnitř komponenty: `Modal.Backdrop isOpen={true}` je vždy "otevřený" (component je jen
mountována/unmountována). Exit animace nevznikne, ale entrance animace HeroUI funguje. ✅

**Soubor:** `src/renderer/src/components/Modal.tsx`

**Callers (13 souborů, beze změn):**
`Settings.tsx`, `RestoreBackupModal.tsx`, `HotkeyHelp.tsx`, `SportityModal.tsx`,
`TiskovyPresetModal.tsx`, `UpravaLogModal.tsx`, `PenalizaceDialog.tsx`, `App.tsx`,
`PrinterPickerModal.tsx`, `ImportDialog.tsx`, `StopkyApp.tsx`, `RaceDialog.tsx`, `RostGrid.tsx`

---

### PDF Dropdown v Toolbar.tsx → HeroUI Dropdown

**Co se změnilo:**
- Ruční `createPortal` + `useState` (menu, menuAnchor) + `useRef` (pdfSplitRef) + `useEffect` (ESC) → HeroUI `<Dropdown>`
- `MenuItem` custom komponenta odstraněna
- `Dropdown.Trigger` dostane className `pdf-split__caret` → žádná vizuální změna
- HeroUI Dropdown řídí: otevření/zavření, pozicování (Floating UI), ESC, klik mimo, focus management

**Soubor:** `src/renderer/src/components/Toolbar.tsx`

---

## Záměrně ponecháno custom

### Tooltip.tsx

**Důvod:** Callery předávají heterogenní children — interaktivní (`EditableCell`/`<input>`)
i neinteraktivní (`Badge`/`<span>`).

- HeroUI `Tooltip.Trigger` renderuje `<button>` — `<button><input>` je neplatné HTML.
- Pro přímý child (první dítě `<Tooltip>`) bez `Tooltip.Trigger` funguje jen pro
  nativně interaktivní prvky; `<span>` (Badge) hover nefunguje.
- Vlastní implementace s `getBoundingClientRect` + clamping okrajů = spolehlivá,
  odladěná, bez závislostí.

**Callery:** `QVysledky.tsx`, `Results.tsx`

---

### Btn (ui.tsx)

**Důvod:** HeroUI Button `secondary` varianta používá tokeny `--default`, `--default-hover`,
`--accent-hover` — **tyto tokeny nejsou v `app.css` definovány**. Migrace by produkovála
průhledné pozadí u majority tlačítek (toolbar, dialogy).

Přidání chybějících tokenů je možné, ale:
- Změna rozměrů: HeroUI Button md = 40/36px, náš bezel = 28px
- Změna press animace: HeroUI `scale(0.97)`, náš `translateY(1px)`
- Vizuální změna by postihla celou appku najednou

Stávající `Btn` je nativní `<button>` s plnou klávesnicovou dostupností, disabled stavem
a focus-visible prstencem — nejde o a11y regres.

**Budoucí migrace:** viz sekce Odloženo níže.

---

### ~~Segmented.tsx / SubTabs.tsx~~ — MIGROVÁNO (Day 8)

Obě komponenty přepsány na `<Tabs className="segmented/subtabs">` — viz sekce níže.

---

### table.tsx — Card, Row, EditableCell

**Důvod:** Silně doménová logika — zebra řádky, penalizace styl, inline editace (Enter/Esc),
`group` hover pro action tlačítka. Migrace na HeroUI Table by vyžadovala přepis všech
10+ screen komponent.

**Budoucí migrace:** viz sekce Odloženo níže.

---

### Badge, Medal, DevBadge (ui.tsx)

**Důvod:** Doménové komponenty s přesně danými barvami (DNF oranžová, DNS šedá, DQ červená,
zlatá/stříbrná/bronzová). HeroUI Chip/Badge by vyžadoval custom color values tak jako tak.
Aktuální implementace je triviálně malá a dokonale sedí.

---

### ContentHead.tsx, Icon.tsx

**Důvod:** Utility komponenty bez HeroUI ekvivalentu.

---

## Odloženo — budoucí plánování

### 1. Btn → HeroUI Button (MINOR)

**Co je potřeba před migrací:**
1. Definovat chybějící tokeny v `app.css`:
   - `--default`: světlý/tmavý fallback pro secondary tlačítka (`#e8e8ea` / `#3a3a3c`)
   - `--default-hover`: o stupeň tmavší/světlejší
   - `--accent-hover`: hover varianta accentu (`color-mix(in srgb, var(--accent) 88%, black)`)
   - `--danger-hover`: hover varianta nebezpečí
2. Sjednotit rozměry: HeroUI Button md = 36/40px vs náš 28px — rozhodnout, zda změnit
   `--toolbar-h` nebo použít `size="sm"` pro toolbarové aktuální ikony.
3. Projít všech ~40+ volání `<Btn>` a změnit `onClick` → `onPress`, `disabled` → `isDisabled`,
   `icon` → inline child `<Icon>` (žádná `icon` prop v HeroUI Button).
4. Build + vizuální kontrola celé appky.

**Rozsah:** ~15 souborů, ~50 změn, nízké riziko.

---

### ~~2. Segmented / SubTabs → HeroUI Tabs~~ — HOTOVO (Day 8)

**Co bylo uděláno:**
- `Tabs.primary` variant + CSS overrides třídy `.segmented` / `.subtabs` v `app.css`.
- Panel-less navigation: `selectedKey` + `onSelectionChange` bez `Tabs.Panel` — validní React Aria pattern.
- Overflow scroll: `overflow-x: auto; scrollbar-width: none` na `.segmented .tabs__list-container`.
- Animated `SelectionIndicator` (slide 250ms) — hlavní UX přidaná hodnota oproti static fade.

---

### 3. table.tsx → HeroUI Table (MAJOR)

**Co je potřeba před migrací:**
- HeroUI Table v3 (React Aria Collection) — odlišná API než custom `<table>` + `<Row>` + `<EditableCell>`.
- Vyžaduje přepis všech 10+ screen komponent (StartList, Results, QVysledky, RostGrid, aj.).
- EditableCell inline editace → HeroUI Input uvnitř Table buňky (React Aria Collection pattern).
- Zebra striping + group hover pro akce → Tailwind + data atributy.
- Doporučení: udělat spike na jedné tabulce (StartList nebo Results), pak rozšířit.

**Rozsah:** velký, vysoké vizuální riziko. Doporučit pro Fáze 4 z původního plánu.

---

### 4. Tooltip → HeroUI Tooltip (SMALL)

**Co je potřeba před migrací:**
- Vyřešit trigger heterogeneity: oddělit wrapping logiku pro interaktivní vs. neinteraktivní children.
- Možnost A: dva typy — `<Tooltip>` pro interaktivní (přímý first-child trigger)
  a `<TooltipStatic>` pro span/badge (s `Tooltip.Trigger` wrapperem).
- Možnost B: naší wrapper vždy používá `tabIndex={0}` na span wrapperu.
- Rozsah: malý (4 callsites).

---

## Přehled — stav migrace

| Komponenta        | Stav             | Poznámka                              |
|-------------------|------------------|---------------------------------------|
| Modal             | ✅ HeroUI        | WAI-ARIA, focus trap, scroll lock     |
| Dropdown (PDF)    | ✅ HeroUI        | Floating UI, ESC, klik mimo           |
| Sidebar           | ✅ HeroUI Button | variant="ghost", onPress              |
| RaceList          | ✅ HeroUI Card/Button/Chip |                              |
| Segmented         | ✅ HeroUI Tabs   | overflow scroll, panel-less, slide indicator |
| SubTabs           | ✅ HeroUI Tabs   | slide indicator, caller API beze změn |
| Btn               | ⏸ custom záměrně | chybí --default/--accent-hover tokeny |
| Tooltip           | ⏸ custom záměrně | heterogenní children (input + span)   |
| table.tsx         | ⏸ custom záměrně | doménová komplexita, velký rozsah     |
| Badge/Medal       | ⏸ custom záměrně | doménové barvy, triviální velikost    |
