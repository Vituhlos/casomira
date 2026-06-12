# Prompt pro Figma Make — redesign Časomíry v HeroUI V3

> **Nástroj:** [Figma Make](https://www.figma.com/make/) + **HeroUI Figma Kit V3**  
> **Kit (duplikovat do týmu):** [HeroUI Figma Kit V3 — Community](https://www.figma.com/community/file/1546526812159103429/heroui-figma-kit-v3)  
> **Účel:** Čistý redesign celé desktopové appky s **výhradně** komponentami z HeroUI v3 (1:1 s kódem). Výstup = Figma návrhy pro pozdější implementaci (`@heroui/react` + `@heroui/styles`).  
> **Produkt:** viz [design.md](../design.md), [CLAUDE.md](../../CLAUDE.md) §2c.

---

## HeroUI V3 — co je důležité vědět (shrnutí)

| Oblast | Detail |
|--------|--------|
| **Původ** | Dříve NextUI; kompletní přepis (stable od března 2026). |
| **Web** | 75+ komponent, **compound pattern** (`Card.Header`, `Table.Column`, …), React Aria, Tailwind CSS v4. |
| **Styling** | `@heroui/styles` odděleně od logiky; tokeny `--accent`, `--surface`, `--radius`, OKLCH, `[data-theme="dark"]`. |
| **Figma Kit** | **1:1 parity** s kódem — stejné názvy, varianty, sloty; Figma variables mapují na CSS tokeny. |
| **Sync** | Theme Builder → HeroUI Sync plugin (volitelné pro vlastní accent). Community kit duplikovat při update. |
| **Pro appku** | Table (virtualizace), Tabs, Button, Input, Select, Modal, Alert, Chip/Tag, ListBox, Surface, ScrollShadow. |

**Důležité pro Časomíru:** HeroUI je **webový** design system, ne macOS HIG 1:1. Redesign = **HeroUI estetika + naše informační architektura** (sidebar, fáze, tabulky). Accent a tmavý režim přizpůsobit tokenům Časomíry (`#007AFF` / `#0A84FF`).

---

## Příprava ve Figma (před prvním promptem)

1. **Duplikovat** [HeroUI Figma Kit V3](https://www.figma.com/community/file/1546526812159103429/heroui-figma-kit-v3) do workspace (ne pracovat přímo v Community souboru).
2. V **Figma Make** vytvořit nový Make projekt.
3. **Připojit kit / knihovnu:**
   - Pokud Make nabízí *Make kit* nebo *library styles* → přidat duplikovaný HeroUI kit + případně `guidelines.md` (viz sekce níže).
   - Jinak v promptu explicitně: *„Use only components from the attached HeroUI Figma Kit V3 library.“*
4. **Attachments (Make attachments):**
   - `docs/design.md` (layout, anti-patterny, tokeny)
   - Screenshoty z `reference/Casomira-macOS/screenshots/` (min. `04-vysledky-q1.png`, `02-startovni-listina.png`, `05-klasifikace.png`, `07-stopky.png`, jeden tmavý)
   - Volitelně: `01-spravce-zavodu.png` (launcher)
5. **Jedna session = 1–2 obrazovky** — méně kreditů, konzistentnější výsledek.
6. Po prvním výstupu: **theme pass** — upravit Figma variables (`accent`, `surface`, radius) a znovu vygenerovat jen barvy, ne layout.

---

## Mapování: Časomíra → HeroUI V3 (držet v promptu)

| Oblast appky | HeroUI komponenta (Figma kit) | Poznámka |
|--------------|-------------------------------|----------|
| Levý panel kategorií | **ListBox** / navigační list v **Surface** | Aktivní řádek = selected state / accent pill |
| Toolbar | **Surface** + **Breadcrumbs** (nebo text) | Vpravo **Button** (primary + secondary/outline) |
| Přepínač fází (Q1, Q2, …) | **Tabs** (horizontal, scroll) | Mnoho tabů → horizontální scroll, ne ořez labelů |
| Hlavní tabulky | **Table** (+ **Table.Header**, **Table.Body**, …) | Tabular nums, časy/body vpravo |
| Badge DNF/DNS/DQ | **Chip** / **Tag** | Oranžová / šedá / červená — custom barvy v theme |
| Medaile 1.–3. | Malý **indikátor** u textu (ne stock ikony) | Zlatá/stříbrná/bronzová tečka |
| Modály / dialogy | **Modal** / **AlertDialog** | Penalizace, potvrzení smazání |
| Formuláře (nový závod) | **Input**, **Select**, **Button** | |
| Stopky | **Button** (velký), **Surface**, read-only **Table** | Jiný layout, stále HeroUI |
| Okno desktopu | Rám mimo kit — neutrální **Surface** 12px radius | Traffic lights dekorativní (volitelné) |

**Nepoužívat:** marketingové HeroUI šablony (dashboard widgety, KPI karty, command palette) — appka je tabulkový nástroj, ne SaaS analytics.

---

## Hlavní prompt (EN — zkopíruj do Figma Make)

```
Redesign the attached Czech desktop timing app "Časomíra" using ONLY components from the HeroUI Figma Kit V3 library (1:1 naming and anatomy). This is an offline Electron desktop tool for rallycross/autocross — data-dense tables, not a marketing website.

LIBRARY & FIDELITY
- Source of truth for UI components: HeroUI Figma Kit V3 (duplicated team library).
- Do not invent custom buttons, inputs, or tables — compose from kit instances only.
- Use compound structure where the kit provides slots (Table.Header/Body/Row/Cell, Tabs.List/Tab, Card.Header/Body, etc.).
- Map Figma variables to HeroUI tokens: --accent, --surface, --foreground, --radius. Customize accent to #007AFF (light) and #0A84FF (dark).

PRODUCT CONTEXT (read attached design.md + screenshots)
- One operator, fully offline, no login, no live sync, no cloud badges.
- Czech UI labels with diacritics everywhere (see list below).
- Information architecture is FIXED — evolve visual design only.

LAYOUT SHELL (mandatory — do not change structure)
┌─────────────────────────────────────────────────────────┐
│ [optional window chrome / traffic lights]    Časomíra   │
├──────────┬──────────────────────────────────────────────┤
│ Sidebar  │ Toolbar: breadcrumb          [Stopky][PDF]  │
│ categories│ HeroUI Tabs = race phases (horizontal scroll)│
│ + counts │ Main: HeroUI Table in inset Surface card     │
│ operator │                                              │
│ + date   │                                              │
└──────────┴──────────────────────────────────────────────┘

SIDEBAR (~252px)
- Vertical list of race categories; rider count right-aligned per row.
- Selected category: accent-filled pill / selected ListBox item (HeroUI selected state).
- Bottom: operator name + date only — NO "Settings", NO "Logout", NO theme toggle here.

TOOLBAR
- Left: breadcrumb text "Kategorie → Fáze" (e.g. "N1600 → Výsledky Q1").
- Right: secondary outlined Button "Stopky" + primary Button "Uložit PDF".

PHASE TABS (critical)
- Many segments: Startovní listina, Q1 Rošty/Výsledky, Q2, Klasifikace po Q2, Q3, SF, Finále, Celkově…
- MUST use horizontal scroll — never truncate labels (fix "Celkově" clipping).
- Use HeroUI Tabs with scrollable tab list; selected tab clearly visible.

MAIN CONTENT — TABLES
- Inset grouped table inside Surface/Card: rounded container, subtle shadow, zebra rows optional via row backgrounds.
- Column headers: medium weight, bottom hairline separator.
- Times (mm:ss.sss) and points: right-aligned, tabular numerals.
- Inline-editable cells: normal Input appearance on focus (design state, not interaction prototype).

STATUS CHIPS (custom semantic colors on HeroUI Chip/Tag)
- DNF = orange pill
- DNS = gray pill  
- DQ = red pill
- Positions 1–3: small gold/silver/bronze dot beside rank number (minimal, not trophy icons)

SCREENS TO DESIGN (this session: pick ONE primary screen stated below)
1. Správce závodů — list/table of races, actions Nový závod / Otevřít
2. Startovní listina — wide table (st. číslo, jméno, vůz, los…)
3. Rošty Q1 — grid/table per heat (jízda 1, jízda 2…)
4. Výsledky Q1 — main reference screen (attached screenshot)
5. Klasifikace po Q2/Q3 — ranking + points + medal dots
6. Celkové výsledky
7. Stopky — large primary Button for lap record, side table preview, keyboard hints
8. Modal: penalizace / potvrzení (AlertDialog)

THEME
- Deliver LIGHT and DARK variants of the same screen.
- Dark mode: graphite surfaces (#2C2C2E panels, #1A1A1A content bg) — NOT pure OLED black.
- Light: content bg ~#F4F4F6, cards #FFFFFF.
- Typography: system-ui stack (SF Pro / Segoe UI), 13–14px body.

CZECH LABELS (use exactly)
Časomíra, Správce závodů, Nový závod, Startovní listina, Rošty, Výsledky, Klasifikace,
Semifinále, Finále, Celkově, Stopky, Uložit PDF, DNF, DNS, DQ, Jízda, Pozice, Čas, Body,
St. číslo, Kategorie, Operátor.

AVOID (critical — attached design.md anti-patterns)
- Dashboard KPI cards, "live sync" badges, purple AI gradients, neon glow, emoji titles.
- Replacing data tables with per-driver cards or carousels.
- Hamburger menu, Material FAB, generic shadcn look unrelated to HeroUI kit.
- English UI copy.
- Bottom widgets (fastest lap, active cars) — product does not have these.
- Different layout structure between light and dark — same IA, only tokens change.

DELIVERABLES FOR THIS RUN
1. Full desktop frame: [SCREEN NAME] — light + dark.
2. Component inventory: which HeroUI kit components used per region (sidebar, tabs, table, buttons, chips).
3. Token overrides list: accent, surfaces, radii (window 12px, card 10px, controls 7px).
4. Notes for horizontal tab overflow and table density (row height ~32–36px readable).

Primary screen for this generation: Výsledky Q1 (full window, both themes).
```

---

## Česká verze hlavního promptu

```
Přepracuj přiloženou desktopovou aplikaci Časomíra (offline časoměření rallycross/autocross) pomocí VÝHRADNĚ komponent z knihovny HeroUI Figma Kit V3 (1:1 s dokumentací HeroUI v3). Nepoužívej vlastní komponenty mimo kit.

KONTEXT
- Přiložené screenshoty = současný stav (macOS-like). Zachovej informační architekturu, změň vizuál na HeroUI v3.
- Přiložený design.md = layout, tokeny, anti-patterny.
- České popisky s diakritikou. Žádné přihlášení, žádný live sync, žádné dashboard widgety.

POVINNÝ LAYOUT
- Levý sidebar (~252px): seznam kategorií, počet jezdců vpravo, aktivní = accent pill / selected ListBox.
- Dole sidebaru jen operátor + datum (NE Nastavení, NE Odhlásit).
- Toolbar: breadcrumb vlevo; vpravo sekundární Button „Stopky“ + primární „Uložit PDF“.
- Pod toolbarem HeroUI Tabs pro fáze závodu — horizontální scroll, neusekávat „Celkově“.
- Obsah: HeroUI Table v inset Surface/Card, zebra řádky, časy a body vpravo, tabular nums.

KOMPONENTY HEROUI
- Tabs, Table (compound), Button, ListBox/Surface, Chip/Tag pro DNF/DNS/DQ, Modal/AlertDialog pro dialogy.
- Accent token: #007AFF (light), #0A84FF (dark). Tmavý režim = grafit, ne čistá černá.

VÝSTUP TÉTO SESSION
- Obrazovka „Výsledky Q1“ — světlý + tmavý motiv, celé okno.
- Seznam použitých komponent z kitu + přepsané theme variables.

NEPOUŽÍVAT: KPI karty, fialové gradienty, emoji, anglické texty, karty místo tabulek, hamburger menu.
```

---

## Postup po obrazovkách (kopíruj a doplň `Primary screen`)

| Krok | Prompt suffix |
|------|----------------|
| 1 | `Primary screen: Výsledky Q1` — referenční tabulka |
| 2 | `Primary screen: Rošty Q1` — více jízd, stejný shell |
| 3 | `Primary screen: Startovní listina` — široká tabulka |
| 4 | `Primary screen: Klasifikace po Q3` — medaile u pořadí |
| 5 | `Primary screen: Celkové výsledky závodu` |
| 6 | `Primary screen: Stopky` — velké tlačítko, boční náhled roštu |
| 7 | `Primary screen: Správce závodů` — launcher |
| 8 | `Primary screen: AlertDialog penalizace` — modal overlay na Výsledky |

Po kroku 1 spusť **konzistenci pass:**

```
Using the light "Výsledky Q1" frame as reference, apply the exact same sidebar, toolbar, Tabs, and token overrides to [NEXT SCREEN]. Do not change spacing or component choices — only table columns and content differ.
```

---

## Volitelný `guidelines.md` pro Make kit (vložit do HeroUI Make kitu)

```markdown
# Časomíra × HeroUI V3 — Make guidelines

## Priority
1. Use HeroUI Figma Kit V3 components only.
2. Preserve desktop shell: sidebar 252px + toolbar + horizontal Tabs + Table content.
3. Czech labels; tabular numerals for times and points.

## Theme overrides
- --accent light: #007AFF
- --accent dark: #0A84FF
- Card/surface radius: 10px; window frame: 12px
- Dark surfaces: #2C2C2E (card), #1A1A1A (content), not #000000

## Components
- Phase switcher: Tabs (scrollable), never Dropdown for phases.
- Category list: ListBox or equivalent vertical selection in Surface.
- Data: Table compound — do not replace with Card grid.
- DNF/DNS/DQ: Chip with semantic colors (orange/gray/red).

## Do not
- Add login, settings in sidebar, sync badges, KPI widgets.
- Use English copy or marketing hero sections.
- Invent components not in HeroUI kit.
```

---

## Po Figma Make → implementace (pro vývojáře, až později)

| Figma | Kód |
|-------|-----|
| HeroUI kit variables | `@heroui/styles` + `[data-theme]` |
| Table návrhy | `<Table>` z `@heroui/react` |
| Tabs fází | `<Tabs>` |
| Tlačítka | `<Button variant="primary|secondary|outline">` |
| Electron | Renderer = React; theme toggle v nastavení appky |

Docs: https://heroui.com/docs/react/getting-started/quick-start  
Figma sync: https://heroui.pro/docs/react/getting-started/figma (Theme Builder + Sync plugin)

---

## Reference v repu

| Soubor | Účel |
|--------|------|
| [design.md](../design.md) | Layout, tokeny, anti-patterny |
| [prompt-stitch-macos26.md](./prompt-stitch-macos26.md) | Paralelní směr (macOS 26 / Stitch) |
| `reference/Casomira-macOS/` | Screenshoty a prototyp |
| [HeroUI v3 release notes](https://heroui.com/docs/react/releases/v3-0-0) | Tokeny, Figma 1:1 |

*Při změně promptu aktualizuj tento soubor.*
