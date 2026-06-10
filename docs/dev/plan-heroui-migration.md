# Migrace na HeroUI

Postupná migrace UI vrstvy na [HeroUI v3](https://github.com/heroui-inc/heroui) (React + Tailwind CSS v4).
Logika (DB, výpočty bodů, IPC) se nedotýká — jen prezentační vrstva.

Pracovní branch: `experiment/heroui`

---

## Fáze 0 — Setup ✅

- [x] Nainstalovat `@heroui/react`, `framer-motion`, `tailwindcss` (v4), `@tailwindcss/vite`
- [x] Přidat `tailwindcss()` plugin do `electron.vite.config.ts` (renderer sekce)
- [x] Přidat `@import "@heroui/react/styles"` do `app.css`
- [x] Žádný `HeroUIProvider` není potřeba (HeroUI v3 ho nemá)
- [x] Ověřit: build prochází (`✓ built in 2.66s`)
- [x] MCP server `@heroui/react-mcp` přidán do `.mcp.json`

---

## Fáze 1 — Home screen (`RaceList`) ✅

- [x] Karta závodu → HeroUI `<Card>` (compound: `Card.Content`)
- [x] Tlačítka (Nový závod, Obnovit…, Tmavý mód) → HeroUI `<Button>`
- [x] Type badge „RAC RACE" / „RX CUP" → HeroUI `<Chip>`
- [x] Empty state — ikona + text + přímé tlačítko Nový závod
- [x] Screenshot tour — ověřeno (22 screenshotů)

---

## Fáze 2 — Sidebar

- [ ] Seznam kategorií → HeroUI `<Listbox>` nebo vlastní s HeroUI tokeny
- [ ] Aktivní stav kategorie
- [ ] Count badge u kategorií → HeroUI `<Chip>`
- [ ] Zpět na závody tlačítko
- [ ] Patička (operátor, datum, verze, update badge)
- [ ] Screenshot tour — ověřit výsledek

---

## Fáze 3 — Toolbar + fázové záložky

- [ ] Toolbar akce (Stopky, Uložit PDF, Nastavení, Tmavý mód) → HeroUI `<Button>`
- [ ] PDF split tlačítko (Uložit PDF + šipka) → HeroUI `<ButtonGroup>` nebo `<Dropdown>`
- [ ] Phase tabs (`Segmented`) → HeroUI `<Tabs>`
- [ ] Sub-záložky Rošt / Výsledky / Výsledky po Q → HeroUI `<Tabs>` (menší varianta)
- [ ] Screenshot tour — ověřit výsledek

---

## Fáze 4 — Tabulky (největší vizuální dopad)

- [ ] Rošty → HeroUI `<Table>`
- [ ] Výsledky jízd → HeroUI `<Table>`
- [ ] DNF / DNS / DQ odznaky → HeroUI `<Chip>` s barvami (oranžová / šedá / červená)
- [ ] Zlatá / stříbrná / bronzová pozice → HeroUI `<Chip>` nebo badge
- [ ] Klasifikace po Q2 / Q3 → HeroUI `<Table>`
- [ ] Celkové výsledky → HeroUI `<Table>`
- [ ] Screenshot tour — ověřit výsledek

---

## Fáze 5 — Modály a dialogy

- [ ] Nový závod → HeroUI `<Modal>`
- [ ] Edit závod → HeroUI `<Modal>`
- [ ] Smazat závod (potvrzení) → HeroUI `<Modal>`
- [ ] Nastavení → HeroUI `<Modal>`
- [ ] Klávesové zkratky → HeroUI `<Modal>`
- [ ] Import z Excelu → HeroUI `<Modal>`
- [ ] Záloha / Obnova → HeroUI `<Modal>`
- [ ] Screenshot tour — ověřit výsledek

---

## Fáze 6 — Formuláře a detaily

- [ ] Startovní listina — inline editace buněk → HeroUI `<Input>`
- [ ] Paste-box pro časy → HeroUI `<Textarea>`
- [ ] Výběr kategorií při zakládání závodu → HeroUI `<Checkbox>` / `<Chip>` toggle
- [ ] Nastavení formulář → HeroUI `<Input>`, `<Switch>`
- [ ] Screenshot tour — ověřit výsledek

---

## Fáze 7 — Stopky (samostatné okno)

- [ ] Hlavní ovládání (Start/Stop, Záznam) → HeroUI `<Button>`
- [ ] Tabulka měření → HeroUI `<Table>`
- [ ] Screenshot tour — ověřit výsledek

---

## Fáze 8 — Cleanup

- [ ] Odstranit nebo zredukovat `mac.css` (ponechat jen Electron-specifické věci: vibrancy, scrollbar)
- [ ] Odstranit `app.css` (nebo přesunout zbytky do Tailwind `@layer components`)
- [ ] Projít zbytkové inline styly a přepsat na Tailwind
- [ ] Sjednotit dark mode: přejít z `data-theme="dark"` na `dark` class (HeroUI standard)
- [ ] Otestovat světlý i tmavý mód kompletně
- [ ] Finální screenshot tour

---

## Poznámky

- HeroUI **v3** (beta) — vyžaduje React ≥ 19 a Tailwind CSS **v4** (ne v3)
- Žádný `HeroUIProvider` — v3 ho nepotřebuje (narozdíl od v2)
- Dark mode: HeroUI v3 očekává třídu `dark` na `<html>`, appka zatím používá `data-theme="dark"` — sjednotit ve fázi 8
- Animace (Framer Motion) fungují v Electronu bez problémů
- Stávající `mac.css` + `app.css` zůstávají po celou dobu migrace jako fallback — vizuální tokeny se zachovají
- MCP server: `mcp__heroui-react__get_component_docs` na čtení dokumentace přímo v session
