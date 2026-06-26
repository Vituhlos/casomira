# Verdict — design system

> **Stav:** aktualizováno 2026-06-25 po rozhodnutí nepřenášet vzhled přes
> ShadUI. Tento dokument je aktuální vizuální zdroj pravdy pro Avalonia UI
> migraci. Starší zmínky o Časomíře, Stitch, macOS 26/Liquid Glass a `mac.css`
> ber jako historický kontext, ne jako zadání.

---

## Produkt v jedné větě

Verdict je offline desktopová aplikace pro časoměřiče autokrosu a rallycrossu:
rychlá, čitelná, klidná pracovní plocha pro startovky, rošty, měření, výsledky
a PDF výstupy na jednom počítači.

## Design north star

Verdict má v Avalonia verzi působit jako původní Electron/HeroUI aplikace:
webově čistá, světlá, měkká a precizní, ale usazená v nativním Windows okně s
Mica/Acrylic host materiálem.

Nesmí působit jako obecné tmavé desktopové demo ani jako syrový DataGrid nástroj.

## Scéna

Časoměřič sedí během závodního dne u notebooku s Windows, často v rušném depu
nebo časoměřičské budce. Potřebuje rychle poznat aktivní kategorii, zapsat časy,
zkontrolovat rošty a bez přemýšlení vytisknout/PDF exportovat správný list.
UI má být klidné, čitelné a odpouštějící, ne efektní.

## Register

**Product.** Žádná marketingová hero estetika, žádné dekorativní gradienty,
žádná ilustrativní prázdná místa. Vizuální kvalita vzniká z materiálu okna,
vrstev, spacingu, typografie a konzistentních stavů.

## Vizuální principy

- **Host okno:** Mica/Acrylic-like systémový backdrop, ne ploché černé pozadí.
- **Pracovní plochy:** světlé floating surfaces položené na host materiálu.
- **Tvar:** velké, klidné radiusy; panely působí jako měkké ostrovy.
- **Barva:** neutrální světlé plochy + jeden modrý primary accent.
- **Hustota:** informačně hustší než marketing UI, ale s dostatkem vzduchu.
- **Tabulky:** měkké listy, ne tvrdý desktop grid.
- **Stavy:** hover, pressed, selected, focus, disabled, loading, empty a error
  musí být explicitní.
- **Jazyk:** UI je česky, krátké akční popisky, bez výplňových textů.

## Nedotknutelné vzory z Electron appky

Tyto vzory držet jako vizuální smlouvu:

1. **Správa závodů**
   - Velká světlá plocha uvnitř Mica host okna.
   - Horní brand strip s logem vlevo a akcemi vpravo.
   - Race card a add card jako nízké, měkké surfaces.
   - Je to výchozí obrazovka po spuštění: karta otevře závod, akce "Závody"
     v shellu se sem vrací.

2. **Hlavní shell závodu**
   - Levý sidebar se světlým panelem, velkým logem, kategoriemi a footerem.
   - Obsah v samostatném světlém panelu vedle sidebaru.
   - Horní toolbar: breadcrumb vlevo, akce vpravo.
   - Pod toolbarem phase tabs v měkkém tracku.

3. **Startovní listina**
   - Nadpis + metainfo vlevo, akce vpravo.
   - Tabulka jako rounded sheet: jemná šedá hlavička, bílé řádky, hairlines.
   - Žádné agresivní gridlines, žádné tmavé řádky.

4. **Rošty**
   - Subtabs jako samostatný pill segment.
   - Jízdy oddělené nadpisem a měkkou tabulkou.
   - Empty pozice zobrazené jako tiché pomlčky, ne error.

5. **Stopky**
   - Samostatný high-priority layout.
   - Obří čas a velké primary tlačítko `ZAZNAMENAT`.
   - Vedlejší akce jsou menší a vizuálně slabší.
   - Pravý panel `Rošt jízdy` je čitelný, ale nepřebíjí čas.

6. **Dialogy a floating surfaces**
   - Dim overlay.
   - Bílý modal s velkým radiusem a stínem.
   - Silný modrý focus ring na aktivním poli.
   - Akce vpravo dole, primary modře, cancel neutrálně.

7. **Dropdowny**
   - Floating white surface s radiusem a stínem.
   - Nepoužívat klasicky tvrdé desktop context menu, pokud workflow chce
     produktový dropdown.

## Tokeny

Tokeny pojmenovávat semanticky. Avalonia resources mají používat stejný slovník,
i když syntaxe bude `Color`, `SolidColorBrush`, `Thickness`, `CornerRadius`.
Aktuální implementační vstup pro Avalonia spike je
`apps/desktop-net/Verdict.Desktop/Styles/VerdictTokens.axaml`; komponentové a
shell styly jsou v
`apps/desktop-net/Verdict.Desktop/Styles/VerdictControls.axaml`.

### Barvy

| Token | Role |
|---|---|
| `Color.HostFallback` | fallback za Mica/Acrylic, když systémový materiál není dostupný |
| `Color.Surface` | hlavní bílé panely |
| `Color.SurfaceMuted` | tlumené tracky, table headery, secondary controls |
| `Color.SurfaceRaised` | modaly, dropdowny, popovery |
| `Color.RowHover` | hover řádku v tabulce/listu |
| `Color.RowSelected` | aktivní sidebar položka nebo selected row |
| `Color.BorderSubtle` | hairlines, separátory |
| `Color.TextPrimary` | hlavní text |
| `Color.TextSecondary` | popisy, metadata |
| `Color.TextMuted` | méně důležité hodnoty |
| `Color.ActionPrimary` | modrá akce |
| `Color.ActionPrimaryHover` | hover primary akce |
| `Color.ActionDanger` | destruktivní akce |
| `Color.StateSuccess` | hotovo/úspěch |
| `Color.StateWarning` | varování, DNF |
| `Color.StateDanger` | chyba, DQ |

Výchozí accent držet blízko Windows/HeroUI modré: `#0A84FF` / `#007AFF` podle
kontrastu v daném tématu. Nepoužívat fialovo-modré gradienty jako identitu.

### Radius

| Token | Role |
|---|---|
| `Radius.Control` | běžné buttony, inputy |
| `Radius.Pill` | chips, phase tabs, segmented controls |
| `Radius.Surface` | hlavní panely |
| `Radius.Overlay` | modaly, dropdowny |

Orientačně: controls 8-10 px, surfaces 16-20 px, overlay 20-24 px. Hodnoty po
spiku zafixovat podle reálného renderu.

### Spacing

Používat 4px rytmus: `4, 8, 12, 16, 20, 24, 32, 40, 48`.

| Token | Role |
|---|---|
| `Space.WindowInset` | odsazení obsahu od okraje okna |
| `Space.PanelGap` | mezera mezi sidebarem a obsahem |
| `Space.SurfacePadding` | vnitřní padding panelu |
| `Space.ToolbarHeight` | výška toolbaru |
| `Space.RowHeight` | běžná výška tabulkového řádku |
| `Space.TimerRowHeight` | řádky ve stopkách |

### Typografie

- Font: system stack; Windows primárně Segoe UI Variable, fallback Inter.
- Velký brand wordmark může používat asset, ne živý text, pokud to zaručí přesnost.
- Běžné UI texty: 13-14 px.
- Nadpis panelu: 20-24 px, semibold/bold.
- Stopky: výrazný display čas, tabular figures.
- Čísla v tabulkách a časy: tabular nums.

## Komponentové vzory

### AppWindow

Avalonia okno má řešit:

- systémový backdrop: Mica/Acrylic podle platformy a podpory,
- fallback pozadí,
- vlastní/titlebar-friendly chrome,
- obsah jako floating surfaces,
- žádné plné černé pozadí pod aplikací.

### Shell

```
Window backdrop
├─ Sidebar surface
└─ Main column
   ├─ Topbar surface
   │  ├─ Breadcrumb
   │  ├─ Window actions / utilities
   │  └─ Phase tabs
   └─ Content surface
```

Sidebar a main content jsou sourozenci, ne karta uvnitř karty.

### Sidebar

- Šířka okolo 252 px.
- Logo nahoře, zpět na závody pod ním.
- Kategorie jako jednoduchý list.
- Aktivní kategorie = šedý rounded pill, text výraznější.
- Počet jezdců vpravo jako tlumená hodnota.
- Footer s aktuálním závodem/operátorem oddělený hairline.

### Topbar a phase tabs

- Breadcrumb vlevo.
- Utility ikony a akce vpravo.
- `Stopky`, `Tisknout`, `Uložit PDF` jako stabilní command cluster.
- Phase tabs jsou horizontálně scrollovatelné; labely se neořezávají.
- Aktivní tab = bílý pill na tlumeném tracku.

### Buttons

Varianty:

- `Primary`: modrá plocha, bílý text.
- `Secondary`: světlá/tlumená plocha, tmavý text.
- `Ghost`: minimální plocha pro ikony a nízké akce.
- `Danger`: jemně červená plocha nebo červený text podle závažnosti.

Každý button musí mít hover, pressed, focus-visible, disabled a loading stav.

### Tables

Preferovaný vzhled:

- rounded container,
- šedá header oblast,
- bílé řádky,
- jemné horizontální linky,
- žádné svislé těžké gridlines,
- hover velmi jemný,
- selected stav viditelný, ale ne agresivní,
- scroll bar nenápadný, ale použitelný.

Avalonia `DataGrid` je povolený jen pokud je kompletně přestylovaný do tohoto
vzoru. Jinak použít vlastní list/table layout pro klíčové obrazovky.

### Timer

Stopky jsou speciální surface, ne běžná tabulková stránka:

- display čas je primární vizuální bod,
- `ZAZNAMENAT` je největší akce,
- mezerník/backspace workflow musí zůstat klávesnicí ovladatelné,
- vedlejší akce nesmí soutěžit s měřením.

### Dialogs

- Dim overlay.
- Overlay surface `Color.SurfaceRaised`.
- Radius `Radius.Overlay`.
- Focus trap a Esc/cancel chování.
- Form controls mají label, error text a focus ring.

### Floating panes

Ursa/Semi floating panel vzor je žádoucí, pokud:

- vypadá jako Verdict surface,
- používá Verdict tokeny,
- nepřenáší cizí demo estetiku,
- má jasné keyboard/focus chování.

## Avalonia/Ursa směr

Ursa/Semi je kandidát pro chování a komponentovou mechaniku: dialogy, floating
panes, inputy, selecty, overlaye a případně některé utility controls.

Verdict vzhled se ale nemá přebírat z Ursa demo. Nad Ursa/Semi musí vzniknout
tenká `Verdict.UI` vrstva:

- `VerdictAppWindow`
- `VerdictShell`
- `VerdictSidebar`
- `VerdictTopbar`
- `VerdictPhaseTabs`
- `VerdictButton`
- `VerdictTable`
- `VerdictDialog`
- `VerdictFloatingPane`

Aplikační obrazovky nemají náhodně míchat ShadUI, Ursa, Fluent a ruční styly.

## ShadUI status

ShadUI není součást produkčního desktopového UI. `Verdict.Desktop` používá
nativní Avalonia `Window`, Fluent základ a tenkou `Verdict` vrstvu. Případný
vendored ShadUI submodul je technický pozůstatek a může se odstranit v
samostatném repository cleanup kroku, protože aplikace na něj už neodkazuje.

## Akceptační kritéria pro první UI spike

První spike je pouze `Startovní listina` v Avalonia/Ursa směru. Úspěch znamená:

- Mica/Acrylic host feeling je patrný.
- Sidebar a topbar působí jako Electron reference.
- Tabulka nevypadá jako tvrdý desktop DataGrid.
- Primary/secondary/ghost tlačítka sedí na původní appku.
- Phase tabs mají správný pill/track feeling.
- Stav při různých velikostech okna neřeže texty.
- Vedle Electron screenshotu je jasné, že jde o stejnou aplikaci.

Druhý spike je `Stopky`, protože ověřuje ergonomii nejrizikovějšího workflow.

## Co nedělat

- Nepřebírat tmavé Ursa demo jako základní skin.
- Nemíchat více UI kitů bez wrapper vrstvy.
- Nezačínat univerzální komponentovou knihovnou odspodu.
- Neportovat HeroUI komponentu po komponentě.
- Nevyrábět tmavý shell jen proto, že Avalonia demo tak vypadá.
- Nepřepisovat pravidla závodu během UI spike.
- Neschovávat důležité akce do menu jen kvůli čistotě.
- Nepoužívat raw hex hodnoty v obrazovkách; patří do tokenů.

---

Při změně vzhledu aktualizuj tento soubor a odpovídající Avalonia resource
dictionaries (`VerdictTokens.axaml`, `VerdictControls.axaml`, případně jejich
budoucí rozdělené soubory) společně.
