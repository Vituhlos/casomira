# Plán — čistý rebuild UI Verdict (Avalonia)

> **Stav:** ZAMČENÝ SMĚR, 2026-06-26. Tohle je jediný zdroj pravdy pro UI.
> **Nahrazuje:** `plan-avalonia-ursa-ui-spike.md` (Ursa zamítnuta) a
> `plan-heroui-native.md` (mrtvé). Datová/pravidlová část
> `plan-avalonia-migrace.md` zůstává platná.
> **Důvod vzniku:** opakované přepínání UI směru (ShadUI → Ursa → …) a
> „funkce-first" migrace vyrobily appku, která působí jako jiný produkt.
> Tenhle dokument ten thrashing ukončuje.

---

## 0. Rozhodnutí (neotevírá se)

1. **Framework:** AvaloniaUI 12, .NET (target `net10.0` — viz §6).
2. **UI kit:** ŽÁDNÝ. Čistá Avalonia + vlastní `Verdict.UI` vrstva.
   Žádný ShadUI, žádná Ursa, žádný FluentAvalonia jako vizuální základ.
3. **Zdroj vzhledu:** Electron appka (`src/`) je **specifikace**, ne inspirace.
   Screenshot vedle screenshotu, dokud to nesedí.
4. **Zdroj tokenů:** `VerdictTokens.axaml` (barvy, radiusy, spacing). Jediný
   povolený zdroj barev a rozměrů. V obrazovkách žádné raw hex ani magická čísla.
5. **Cross-platform od začátku:** Windows **i** macOS. Vzhled je sdílený,
   materiál okna per-platform (§4).

**Proč čistá Avalonia:** „HeroUI pocit", co se na Electronu líbil, není knihovna —
je to tokeny + konzistentní styling na čistých primitivech (přesně jak vznikl
ten React/HeroUI vzhled). Třetí kit by diktoval vlastní vzhled → znovu „jiný
produkt". Ověřeno proof-of-conceptem (Startovní listina, čistá Avalonia, sedí).

---

## 1. Co zůstává a co se staví znovu

| Vrstva | Akce |
|--------|------|
| `Verdict.Core` (Model, Data, Scoring, Services, Backup) | 🟢 **NETKNOUT** — logika appky |
| `Verdict.Tests` (Scoring, Tiebreak, Seeder, Zaver, Backup) | 🟢 **NETKNOUT** — paritní jistota |
| `Verdict.Desktop` Views (XAML) | 🔴 **Znovu od nuly** |
| `Verdict.Desktop` ViewModels | 🔴 **Znovu od nuly** (čistý MVVM proti `IRaceService`) |
| `src/` Electron | 🟢 Zůstává jako **vizuální spec**, nemaže se |

Logika je UI-nezávislá a má paritní testy → je to ta nejcennější věc. Prezentační
vrstva se staví znovu, protože je levnější než léčit.

---

## 2. Architektura UI

```
apps/desktop-net/
├── Verdict.Core/          # beze změny
├── Verdict.Tests/         # beze změny
├── Verdict.UI/            # NOVÁ knihovna — design system + sdílené controly
│   ├── Tokens/            # VerdictTokens.axaml (přesun sem)
│   ├── Controls/          # Button styly, SoftTable, PhaseTabs, Badge, Medal,
│   │                      #   SegmentedControl, ContentDialog, VerdictWindow shell
│   └── Theme/             # light/dark, font stack, fallback materiály
└── Verdict.Desktop/       # tenká app vrstva: Views + ViewModels + DI + routing
```

**Zásada:** obrazovky nikdy nesahají na raw primitivy přímo — používají
`Verdict.UI` controly. Tím se vzhled drží konzistentní a změna tokenu se propíše
všude.

---

## 3. Proces (jediný způsob, jak stavět obrazovky)

```
1. Design system napřed     → tokeny + základní controly ve Verdict.UI
2. JEDNA obrazovka           → postavit proti Verdict.UI
3. Screenshot vedle Electronu → porovnat
4. Schválit / doladit        → teprve pak další
```

**Zakázáno:** naportovat všech ~10 obrazovek a „pak to zkrášlit". To je přesně
chyba, co nás sem dostala.

### Pořadí obrazovek (od jednoduchých k těžkým)
1. Shell (okno, sidebar, topbar, phase tabs) + **Správa závodů**
2. **Startovní listina** (+ import .xls/.xlsx) — proof už hotový
3. **Rošty** (autofill st. číslo → jméno/vůz)
4. **Výsledky** (paste-box, auto pořadí/body, dvojklik = cyklus stavu) — nejtěžší
5. **Klasifikace / Celkově** (tiebreaky)
6. **Semifinále / Finále**
7. **Stopky** (samostatné okno, klávesové workflow)
8. Settings + Penalizace/UpravaLog dialogy

---

## 4. Materiál okna (Mica / vibrancy) — cross-platform

Electron dnes: Mica na Win11 (`setBackgroundMaterial('mica')`), `vibrancy:'sidebar'`
na macOS, solidní fallback jinde.

Avalonia ekvivalent — jeden zápis, platforma si vybere:
```xml
TransparencyLevelHint="Mica, AcrylicBlur, Blur, None"
```
- Win11 → Mica
- macOS → NSVisualEffectView (vibrancy)
- fallback → `None` = solidní `VerdictHostFallbackBrush`

**Zásada:** materiál je tenká vrstva navrch s **garantovaným fallbackem**, ne
základ. I bez něj je appka plně použitelná. Žije na jednom místě —
`Verdict.UI` shell okno.

**TODO ověřit na reálném Macu:** kvalita vibrancy, rohy okna, traffic-light
tlačítka, titlebar. Tady (Win) to neověřím.

---

## 5. Acceptance gates

Obrazovka je hotová jen když:
- vizuálně sedí vedle Electron reference,
- žádné ploché tmavé desktop pozadí,
- tabulka nepůsobí jako standardní desktop grid (soft řádky, zebra, tabular nums),
- texty se neřežou v běžné šířce okna,
- phase tabs zvládnou přetékání (scroll, ne ořez),
- sidebar drží stejnou hierarchii jako Electron,
- primary/secondary akce mají správnou váhu,
- focus ring je viditelný,
- funguje light i dark,
- (shell) materiál okna má fallback a nerozbije se bez podpory.

---

## 6. .NET hygiena

- **Jeden TFM:** `net10.0` (instalovaný SDK je 10.0.300; současné projekty už
  cílí net10.0). Odstranit staré stopy `net9.0` z `obj/`. Starý migrační plán psal
  net9, realita je net10 — drží se realita.
- `obj/` a `bin/` musí být v `.gitignore`, ne v gitu.

---

## 7. Čistka repa (samostatný commit, před rebuildem)

### Smazat (mrtvé / cizí / duplicitní)
- `awesome-claude-code-subagents/` (naklonované cizí repo)
- `.heroui-docs/` (opuštěný HeroUI směr)
- `.codex-remote-attachments/`
- `apps/desktop-net/vendor/shad-ui/` + záznam v `.gitmodules`
- `docs/user/`: duplicitní „Landing page" zipy + rozbalené složky,
  logo-koncept HTML drafty, `design-canvas.jsx`, png s rozbitým kódováním

### Vyndat z gitu + .gitignore (build artefakty)
- `tsconfig.*.tsbuildinfo`
- `out/`, `release/`, `**/bin/`, `**/obj/` (ověřit, co je reálně tracked)

### Konsolidovat
- `docs/dev/` mrtvé/překryvné plány: `plan-heroui-native.md`,
  `snug-kindling-backus.md`, `plan-archiv-web-unraid.md`, příp. `plan-monorepo-layout.md`
  → archivovat nebo smazat
- AI/tool konfigy: `.opencode.json`, `AGENTS.md`, `.cursorrules`, `.cursor/`
  → rozhodnout, které se drží

### NECHAT (reálné deliverables / spec)
- `docs/user/`: NÁVOD-PRO-TESTERY, INSTALACE-MAC, CHECKLIST-MAC, Predpisy PDF,
  Verdict Wordmark PDF, logo PDF, .docx návody
- `src/` (Electron spec), `fixtures/`, `build/`, `Verdict.Core`, `Verdict.Tests`

---

## 8. Proof-of-concept

`apps/desktop-net/Verdict.UiProof/` — čistá Avalonia, Startovní listina, statická
data. Ověřil, že směr funguje (screenshot sedí vedle Electronu). Slouží jako
**seed pro `Verdict.UI`** (styly tlačítek, soft tabulka, sidebar, phase tabs se
z něj přenesou do sdílené vrstvy). Po vzniku `Verdict.UI` ho lze smazat.

---

## 9. Stop podmínky

Zastavit a přehodnotit, jen pokud:
- macOS vibrancy v Avalonii nejde rozumně rozchodit ani s fallbackem (málo
  pravděpodobné — fallback je solidní pozadí),
- soft tabulky nejdou dostat na Electron feeling bez extrémního úsilí.

Vzhled samotný je ověřený. UI kit thrashing je u konce.
