# Časomíra — design system (UI)

> **Účel:** Jednotný popis vzhledu pro návrháře, [Stitch](https://stitch.withgoogle.com/) a implementaci v `src/renderer/src/styles/mac.css`.  
> **Platí pro:** Windows i macOS — jeden vzhled v duchu Apple HIG (ne dvě platformy).  
> **Cíl redesignu:** evoluce směrem k **macOS 26 (Tahoe, Liquid Glass)** — viz [dev/prompt-stitch-macos26.md](./dev/prompt-stitch-macos26.md).

---

## Produkt v jedné větě

Desktopová **offline** appka pro časoměřiče rallycross/autocross: tabulky, rošty, časy, body, PDF. Jeden operátor, žádné účty, žádný marketing web.

---

## Co nedělat (anti-pattern)

**Zkušenost ze Stitch (neopakovat):**

- Spodní **dashboard karty** (nejrychlejší kolo, průměr, aktivní vozy) — appka to nemá.
- Badge **LIVE SYNCHRONIZACE** — offline app, žádný live sync.
- **Nastavení / Odhlásit** v sidebaru — není přihlášení; nastavení je jinde, dole jen operátor + datum.
- **Přepínač slunce/moon** v toolbaru — téma je v app nastavení, ne v hlavní liště každé obrazovky.
- Light a dark **různé layouty** (např. light = jízdy 1/2, dark = jedna tabulka) — obě témata musí mít **stejnou strukturu**.
- Sidebar jako plná **neprůhledná** karta místo **Liquid Glass** blur.
- Chybějící **traffic lights** a macOS **segmented control** pod toolbarem.
- Fialové / modré **AI gradienty**, neon, přebujelé stíny, „bubliny“
- Emoji v nadpisech, stock ilustrace, hero sekce
- Karty místo tabulek, skrývání sloupců, hamburger menu, Material FAB
- Anglické popisky v UI (vše **česky** s diakritikou)
- Čistá černá v dark mode (použít **grafit**)

---

## Layout (neměnit bez důvodu)

```
┌─────────────────────────────────────────────────────────┐
│ [traffic lights]  Časomíra                    (okno)    │
├──────────┬──────────────────────────────────────────────┤
│ Sidebar  │ Toolbar: breadcrumb          [Stopky][PDF]  │
│ kategorie│ Segment fází (horizontální scroll)          │
│ + počty  ├──────────────────────────────────────────────┤
│          │ Inset tabulka / obsah fáze                    │
│ operátor │                                               │
│ + datum  │                                               │
└──────────┴──────────────────────────────────────────────┘
```

| Oblast | Chování |
|--------|---------|
| **Sidebar** (~252px) | Seznam kategorií; vpravo počet jezdců; ikona u řádku; **aktivní = modrá pilulka, bílý text**; dole operátor + datum. Materiál: vibrancy / blur (light: `rgba(245,245,247,0.66)`). |
| **Toolbar** (~52px) | Vlevo breadcrumb `Kategorie → Fáze`. Vpravo: **Stopky** (sekundární, obrys), **Uložit PDF** (primární, plná modrá). |
| **Segment fází** | Q1, Q2, Celkově po Q2, Q3, SF, Finále, Celkově… — **vždy horizontální scroll**, žádné ořezání labelů (např. „Celkově“). |
| **Obsah** | **Inset grouped table** — zaoblený kontejner, zebra, jemná linka pod hlavičkou. |

---

## Obrazovky (screenshoty v repu)

| Obrazovka | Soubor |
|-----------|--------|
| Správce závodů | `reference/Casomira-macOS/screenshots/01-spravce-zavodu.png` |
| Startovní listina | `02-startovni-listina.png` |
| Rošty Q1 | `03-rosty-q1.png` |
| Výsledky Q1 | `04-vysledky-q1.png` |
| Klasifikace | `05-klasifikace.png` |
| Celkově | `06-celkove.png` |
| Stopky | `07-stopky.png` |
| Výsledky (tmavý) | `08-vysledky-tmavy.png` |
| Celkově (tmavý) | `09-celkove-tmavy.png` |

---

## Barvy a tokeny (aktuální implementace)

Zdroj pravdy v kódu: `src/renderer/src/styles/mac.css`. Téma: `html[data-theme="light|dark"]`.

### Globální

| Token | Hodnota |
|-------|---------|
| Accent (light) | `#007AFF` |
| Accent (dark) | `#0A84FF` |
| Radius okna | `12px` |
| Radius karty / tabulky | `10px` |
| Radius control | `7px` |
| Pill | `980px` |

### Světlý režim

| Účel | Hodnota |
|------|---------|
| Pozadí obsahu | `#F4F4F6` (`--content-bg`) |
| Karta / tabulka | `#FFFFFF` |
| Zebra řádek | `#F7F7F9` |
| Text primární | ~`rgba(0,0,0,0.85)` |
| Text sekundární | ~`rgba(0,0,0,0.5)` |
| Hairline | ~`rgba(0,0,0,0.10)` |

### Tmavý režim (grafit)

| Účel | Hodnota |
|------|---------|
| Okno | `#1E1E1E` |
| Pozadí obsahu | `#1A1A1A` |
| Karta / tabulka | `#2C2C2E` |
| Zebra | `#313133` |
| Sidebar solid | `#29292B` |
| Text primární | ~`rgba(255,255,255,0.88)` |

### Stavy závodu / badge

| Stav | Barva | Tvar |
|------|-------|------|
| **DNF** | oranžová | pill |
| **DNS** | šedá | pill |
| **DQ** | červená | pill |

### Pořadí 1.–3.

Malý **medailový puntík** (zlatá / stříbrná / bronzová) u čísla pozice — ne velké ikony trofejí.

---

## Typografie

| | |
|-|-|
| Font stack | `-apple-system`, SF Pro Text/Display, `system-ui`; Windows: Segoe UI Variable / Inter fallback |
| Velikost těla | **13px** (případně 14px u hlaviček tabulky) |
| Čísla v tabulkách | **tabular-nums** (`.tnum`), časy a body **vpravo** |
| Formát času | `mm:ss.sss` |

---

## Komponenty

### Tlačítka

- **Primární:** plná modrá, bílý text (Uložit PDF).
- **Sekundární:** obrys, neutrální výplň (Stopky).
- Jemný inset stín u tlačítek (`--shadow-btn`).

### Segmentový přepínač

- Track: jemně utlumený (`--seg-track`).
- Vybraný segment: bílý / světle šedý pill se stínem (`--seg-sel`, `--seg-sel-shadow`).
- Příliš mnoho segmentů → **scroll**, ne zmenšovat text pod čitelnost.

### Tabulka (inset)

- Kontejner s `--card`, stín `--shadow-card`.
- Hover řádek: `--hover`.
- Hlavička: medium weight, spodní hairline.
- Inline editace buněk (Enter) — viz produkční UX.

### Okno

- „Plováoucí“ okno nad `--desktop` gradientem.
- Stín okna: `--shadow-win` (silnější než u karty).
- macOS traffic lights v chrome (dekorativní i na Windows pro jednotný vzhled).

---

## Směr macOS 26 (pro Stitch / budoucí úpravy)

Navrhovat **materiály**, ne nové layouty:

- **Liquid Glass:** silnější blur na sidebaru a toolbaru, tenčí separátory.
- **Hloubka:** z blur a vrstev, ne z velkých drop-shadow.
- **Radii:** mírně větší u oken a grouped tabulek (v souladu s Tahoe).
- **Segment control:** frosted track, čitelný scroll affordance.
- Zachovat accent blue a české labely.

---

## Reference v repozitáři

| Soubor | Co |
|--------|-----|
| `docs/design.md` | Tento dokument |
| `src/renderer/src/styles/mac.css` | CSS tokeny (implementace) |
| `reference/Casomira-macOS/` | Klikací prototyp + `mac.css` originál |
| `CLAUDE.md` §2c | Schválená pravidla vzhledu (produkt) |
| `docs/dev/prompt-stitch-macos26.md` | Prompt pro Stitch |

---

*Při změně vzhledu aktualizuj tento soubor a `mac.css` společně.*
