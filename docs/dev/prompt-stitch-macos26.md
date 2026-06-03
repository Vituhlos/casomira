# Prompt pro Google Stitch — redesign směrem k macOS 26 (Tahoe / Liquid Glass)

> **Nástroj:** [Stitch – Design with AI](https://stitch.withgoogle.com/)  
> **Účel:** Vizuální návrhy (ne přepis logiky). Výstup pak ručně přenést do `src/renderer/src/styles/mac.css` a komponent.  
> **Přílohy:** nahraj screenshoty z `reference/Casomira-macOS/screenshots/` nebo z běžící appky (světlý + tmavý).

---

## Co přiložit k promptu

1. **Text:** [docs/design.md](../design.md) — design system (layout, barvy, komponenty, anti-pattern). Ve Stitch vlož jako kontext / druhý soubor, nebo zkopíruj sekce KEEP + tokeny.
2. **Obrázky:** screenshoty níže.

---

## Co nahrát do Stitch (doporučená sada)

| # | Soubor / obrazovka | Proč |
|---|-------------------|------|
| 1 | `04-vysledky-q1.png` | Hlavní práce: tabulka, toolbar, segment fází |
| 2 | `02-startovni-listina.png` | Širší tabulka, více sloupců |
| 3 | `05-klasifikace.png` | Klasifikace, medaile u pořadí |
| 4 | `08-vysledky-tmavy.png` nebo `09-celkove-tmavy.png` | Tmavý režim (grafit, ne OLED černá) |
| 5 | `07-stopky.png` | Velké tlačítko, jiný layout |
| 6 | `01-spravce-zavodu.png` | Launcher / výběr závodu (volitelné) |

Jedna session = max. 2–3 obrazovky najednou, ať Stitch drží konzistenci tokenů.

---

## Hlavní prompt (zkopíruj do Stitch)

```
Redesign this desktop app UI to feel native on macOS 26 (Tahoe era) — Apple HIG, “Liquid Glass” materials, not a generic SaaS dashboard.

CONTEXT
- App name: Časomíra (Czech timing app for rallycross/autocross). Offline desktop tool, one operator, data-heavy tables.
- Design system spec is attached / pasted from design.md (layout, tokens, Czech UI, anti-patterns).
- Attached screenshots = CURRENT design (Sonoma-like). Evolve them toward macOS 26, do NOT change information architecture.
- Same app must still look acceptable on Windows (system-ui fonts); avoid Mac-only gimmicks that break flat layouts.

KEEP (layout & UX — mandatory)
- Left sidebar: race categories list, rider count on the right, small icon per row; selected row = filled blue pill with white label text.
- Top toolbar: breadcrumb left (“Category → Phase”); right: secondary outlined “Stopky” button + primary blue “Uložit PDF”.
- Horizontal segmented control for race phases below toolbar; many segments → must show horizontal scroll, never clip labels (fix “Celkově” truncation).
- Main content: inset grouped table (rounded container, zebra rows, subtle header border). Times and points right-aligned with tabular numerals.
- Status pills: DNF (orange), DNS (gray), DQ (red). Positions 1–3: small gold/silver/bronze medal dot next to rank number.
- Czech labels in UI (diacritics): Výsledky, Rošty, Klasifikace, Semifinále, Finále, Celkově, Stopky, Uložit PDF.
- Light AND dark theme variants (dark = graphite #2C2C2E panels, not pure black).

VISUAL DIRECTION (macOS 26)
- Sidebar & toolbar: translucent “liquid glass” blur over wallpaper gradient; thin hairline separators (0.5px feel), not heavy borders.
- Window: floating card on soft desktop gradient; 12px window radius; restrained shadow (depth from blur, not drop-shadow blobs).
- Controls: updated macOS 26 corner radii; segmented control with clear selected pill on frosted track.
- Primary accent: #007AFF light / #0A84FF dark. Typography: SF Pro / system-ui, 13–14px body, medium weight for table headers.
- Tables: Mail/Notes style grouped inset — white (light) or #2C2C2E (dark) card on #F4F4F6 / #1A1A1A content background.
- Spacing: slightly more airy row height for touch-friendly desktop use; keep dense data readable.

AVOID (critical)
- Purple/blue AI gradients, neon glow, glassmorphism clichés, oversized rounded “bubbles”.
- Emoji in titles, stock illustrations, marketing hero sections.
- Replacing tables with cards per driver, hiding columns, or carousel navigation.
- Centered sidebars, hamburger menu, Material Design FAB, shadcn default look.
- Changing copy to English.

DELIVERABLES
1. One light + one dark screen for “Výsledky Q1” (full window).
2. Design token list: colors (hex), radii, blur levels, sidebar width, toolbar height.
3. Short component notes: sidebar item states, segment control overflow, primary/secondary buttons, table header/cell.
4. Optional: second iteration only adjusting the phase segment scroller and toolbar glass treatment.

Style reference: Apple macOS 26 Tahoe system apps (Settings, Mail, Notes) — professional, calm, native.
```

---

## Česká verze promptu (pokud Stitch lépe reaguje na CZ)

```
Přepracuj přiložené screenshoty desktopové aplikace Časomíra tak, aby působily jako nativní macOS 26 (Tahoe, Liquid Glass), podle Apple HIG.

Zachovej rozložení: levý sidebar (kategorie + počet jezdců, aktivní = modrá pilulka), horní toolbar (breadcrumb vlevo, Stopky + Uložit PDF vpravo), segmentový přepínač fází s vodorovným scrollem (nic neořezávat), inset tabulky s časy vpravo a tabular čísly, odznaky DNF/DNS/DQ, medaile u 1.–3. místa. Texty v češtině.

Vzhled: průhledný sidebar a toolbar (blur), jemné hairline linky, accent #007AFF / #0A84FF, světlý i tmavý režim (tmavý = grafit, ne čistá černá). Žádné fialové AI gradienty, žádné emoji, žádné přehlcení stínem.

Výstup: návrh obrazovky Výsledky Q1 (light + dark), seznam design tokenů (barvy, radius, blur), poznámky ke komponentám. Informační architekturu neměnit.
```

---

## Prompty po obrazovkách (follow-up ve Stitch)

### Startovní listina
```
Same macOS 26 Liquid Glass system as previous screen. Redesign “Startovní listina”: wide table (start number, name, brand, model, year, draw). Keep all columns. Inset grouped table, sticky header, subtle zebra. Czech headers. Light + dark.
```

### Klasifikace po Q2/Q3
```
Same design system. Screen “Klasifikace po Q3”: ranking table with points column, medal dots for top 3, optional “Los” column for Šotolina. Emphasize readable numbers and hierarchy without charts. Czech UI.
```

### Stopky (follow-up — chybějící screen)
```
I forgot to include this screen earlier. Attached is the CURRENT “Stopky” (stopwatch) window screenshot from the app.

Apply EXACTLY the same macOS 26 Liquid Glass design system you already created for my previous screens in this project (sidebar, toolbar, colors, blur, radii, typography, light/dark rules). Do not invent a new visual style.

KEEP this screen’s layout and function:
- Separate stopwatch window (can show title “Stopky — Časomíra” or breadcrumb for current heat)
- Large elapsed timer / status (Start race = green, recording clicks)
- Big primary action to record each finish (Space / ZAZNAMENAT)
- Ordered list of clicks with time per click; assign start numbers to each row after the heat
- Backspace / undo last click; utilitarian, readable outdoors
- Czech labels (Stopky, Start, Zaznamenat, Vrátit, etc.)

MATCH from your previous designs:
- Same window chrome, desktop gradient, glass toolbar if present
- Same #007AFF / #0A84FF accent, graphite dark theme (not pure black)
- Same button styles (primary filled blue, secondary outline, green for Start)
- Same font scale (13–14px, tabular nums for times)

AVOID: changing to a mobile layout, cards instead of list, English UI, purple gradients, emoji.

Deliver: Stopky screen light + dark, consistent with the Výsledky / table screens you already designed.
```

### Stopky (první iterace)
```
Same macOS 26 style. “Stopky” timing window: large central timer, list of clicks in order, assign start numbers, green Start, Space hint, Backspace undo. Keep utilitarian layout; glass toolbar only. High contrast for outdoor use.
```

### Segment fází (detail)
```
Focus only on the horizontal phase segmented control: 10+ segments (Q1, Q2, Celkově po Q2, Q3, SF, Finále…). macOS 26 style, scrollable row, visible fade or scroll affordance, never truncate “Celkově”. Match sidebar glass material.
```

---

## Co po Stitch udělat v repu

1. Porovnat tokeny s `src/renderer/src/styles/mac.css` — upravit CSS variables, ne přepsat celé UI najednou.
2. Ověřit **Windows** (Segoe UI fallback) — příliš silný blur může být drahý; mít `--sidebar-solid` fallback.
3. Segment fází: ověřit scroll v úzkém okně (~1200px šířka).
4. Nechat logiku a bodování beze změny (CLAUDE.md §2c).

---

## Refinement — když light ≠ dark a přibyly widgety (copy-paste)

Použij po prvním výstupu (např. když dark layout sedí víc než light):

```
REFINEMENT — read carefully.

I prefer the DARK MODE layout you generated (single full results table, sidebar + top bar). Use that layout as the ONLY layout template for BOTH light and dark themes. Light mode must be the same structure as dark — only colors/materials change, not information architecture.

REMOVE from all variants (you added these by mistake):
- Bottom dashboard widgets (fastest lap, average time, active cars, KPI cards)
- “LIVE SYNCHRONIZACE” or any live/sync badge — app is offline
- Settings gear, sun/moon theme toggle, logout “Odhlásit” in sidebar
- Splitting results into “1. JÍZDA / 2. JÍZDA” panels unless that matches my original screenshot
- “Závody” header instead of Časomíra + category list from my attachment

macOS 27 (Tahoe) native cues — push harder:
- Top-left red/yellow/green window traffic lights; title bar integrated with toolbar
- Sidebar and toolbar: Liquid Glass (translucent blur), NOT solid opaque grey cards
- Phase tabs = macOS segmented control in a frosted track (horizontal scroll), under toolbar — same labels as my app: Startovní listina, Q1, Q2, Klasifikace po Q2, Q3, Semifinále, Finále, Celkově
- Main table: inset grouped style (one rounded white/dark card), zebra rows, NO extra analytics row below
- Typography: SF Pro / system, 13px, tabular nums; accent #007AFF / #0A84FF
- Czech labels only; keep DNF/DNS/DQ pills and medal dots for top 3

Attach again: my ORIGINAL app screenshot (04-vysledky-q1.png). Match its columns and density; only upgrade materials to macOS 27.

Deliver: two frames side by side — same layout — light + dark. No third layout variant.
```

---

## Tipy pro session ve Stitch

- Začni **jedním** screenshotem (`04-vysledky-q1.png`) + hlavní prompt.
- Po prvním výstupu: „Apply the same design system to the dark theme version“ + `08-vysledky-tmavy.png`.
- Žádej výstup typu **„design spec“ / token list** — lépe se přenáší do CSS než jen obrázek.
- Když Stitch změní layout (např. karty místo tabulky), odpověz: **„Revert layout to match attachment; only update materials and typography.“**

---

*Únor 2026 — doplň podle výstupů ze Stitch.*
