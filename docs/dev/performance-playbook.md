# Performance Playbook — Verdict

> Živý dokument. Aktualizovat po každém profiling sezení nebo výkonnostní změně.
> Poslední aktualizace: 2026-06-17

---

## Stav oprav (co je hotovo)

| Místo | Problém | Oprava | Commit |
|---|---|---|---|
| `ZivyCas` (stopky) | `setInterval(53ms)` = 19fps, nesynchronizováno s displayem | Nahrazeno `requestAnimationFrame` (60fps, sync s display pipeline) | heroui-native |
| `zaznamenej()` (stopky) | `setKanaly` po IPC blokoval JS thread → timer drhl při stisku mezerníku | `startTransition(() => setKanaly(...))` — přidání řádku označeno jako non-urgent | heroui-native |

---

## Jak funguje výkon v tomhle stacku

### Proč drhne UI

JavaScript je single-threaded. Když React reconciluje komponentní strom, JS vlákno je zaneprázdněno — žádné `setInterval`, žádné RAF callbacky, žádné IPC odpovědi se nevykonají, dokud render neskončí.

**Co způsobuje dlouhé rendery:**
- HeroUI / React Aria komponenty (Tabs, Table, Button) mají pod kapotou accessibility framework — dražší než plain div
- Inline JSX funkce a objekty v render metodě rozbíjejí `memo()` (nová reference = re-render dítěte)
- Velké komponenty bez `memo()` re-renderují celý podstrom na každou změnu stavu

### IPC latence (Electron)

- Samotný `ipcRenderer.invoke` round-trip: **~0.08ms** (benchmark)
- SQLite write v main procesu přidá: **~1–15ms**
- Celkem `mereniPridej`: přibližně **2–15ms** — pod jeden frame (16.6ms @ 60fps)
- **IPC není bottleneck.** Bottleneck je React re-render po odpovědi.

### requestAnimationFrame vs setInterval

| | `setInterval` | `requestAnimationFrame` |
|---|---|---|
| Synchronizace s displayem | ❌ ne | ✅ ano |
| Fps na 60Hz monitoru | ~19fps (53ms interval) | 60fps |
| Fps na 120Hz monitoru | ~19fps | 120fps |
| Chování při neaktivním okně | běží dál (CPU waste) | automaticky se zastaví |
| Vhodné pro | síťové polling, debounce | animace, timery, živý čas |

### startTransition

Označí state update jako *non-urgent*. React může tento render přerušit, pokud přijde urgentní update (RAF tick, input event). Cena: React render proběhne dvakrát (jednou optimisticky, jednou s novým stavem). Pro malé listy (≤15 řádků) zanedbatelné.

**Použít pro:** přidání řádku do tabulky, překreslení výsledků, přepnutí fáze.  
**Nepoužívat pro:** update inputu, animaci, cokoliv co musí být okamžité.

---

## Checklist pro celou appku

Projít systematicky. Checkovat v React DevTools Profileru, ne odhadem.

### Memoizace

- [ ] Všechny "velké" komponenty, které dostávají stabilní props, mají `memo()` — zkontrolovat: toolbar, sidebar hlavní okno, výsledkové tabulky, rošty
- [ ] Callbacky předávané do dětí jsou `useCallback` se správnými deps
- [ ] Odvozené výpočty (bodování, pořadí, klasifikace) jsou `useMemo`
- [ ] Inline objekty a arrow funkce v JSX, které jdou jako props do `memo` dítěte, jsou stabilizovány

### State a context

- [ ] Kontext rozdělit podle frekvence změn: data která se mění každý frame (aktuální čas stopek) oddělit od statických dat (seznam závodů, kategorie)
- [ ] `setKanaly` a podobné "non-urgent" updates zabaleny do `startTransition`

### HeroUI / React Aria specifika

- [ ] Inline HeroUI `Tabs` v `StopkyApp` extrahovat do `memo` komponenty — re-renderují se na každý `setKanaly`, přestože se obsah nemění
- [ ] `Table` v `RostNahled` používá HeroUI `Table.Row` — zkontrolovat, zda se zbytečně nemountuje na každý render rodiče
- [ ] HeroUI v3.0.3+ snížila závislosti o 90 % — ověřit že jsme na aktuální verzi

### Electron / Nízko-prioritní práce

- [ ] `ulozVsechnyKanaly` běží na `setTimeout(350)` — zvážit `requestIdleCallback` (yielding prohlížeči), nebo ponechat jak je (funguje, nízká priorita)
- [ ] Synchronní IPC volání (`sendSync`) — v kódu nesmí být žádné, blokují renderer process

### Profiling workflow

1. Otevřít DevTools → React DevTools → Profiler
2. Zapnout **"Record why each component rendered"** v nastavení Profileru
3. Nahrát reálný workflow: otevřít závod → výsledky → stopky → 5× mezerník → přepnout fázi
4. Ve flame graphu hledat: **wide bars** (pomalé komponenty) a **zbytečné re-rendery** (stejné props, ale znovu renderuje)
5. Chrome DevTools → Performance tab: doplněk k React Profileru — ukáže proč je komponent pomalý (layout thrashing, scripting, painting)

---

## Dostupné nástroje a skilly

### Skilly (spouštět přes `/skill-name`)

| Skill | Kdy spustit |
|---|---|
| `react-performance-optimization` | **Začít tady** — systematický audit re-renderů, memo, useCallback, context splitting pro tenhle codebase |
| `voltagent-lang:react-specialist` | React 18+ concurrent features, pokročilá architektura state, složité vzory |
| `voltagent-core-dev:electron-pro` | Electron-specifická témata: IPC batching, window management, produkční build tuning |
| `voltagent-qa-sec:performance-engineer` | Systematický hon na bottlenecky — profiler-driven, měření, benchmarky |
| `feature-dev:code-reviewer` | Nezávislý audit konkrétní komponenty před/po optimalizaci |

### Doporučené pořadí

1. **Profilej první** — React DevTools Profiler na reálném workflow (viz postup výše)
2. **Spusť `react-performance-optimization`** s výsledky profilování
3. **Cílené opravy** podle dat, ne odhadem
4. **Ověř** profilerem znovu — porovnej before/after

---

## Zdroje

- [Architecting Electron for 60fps — Nearform](https://www.nearform.com/blog/architecting-electron-applications-for-60fps/)
- [Performance | Electron Docs](https://www.electronjs.org/docs/latest/tutorial/performance)
- [React 18 Concurrent Rendering — Curiosum](https://curiosum.com/blog/performance-optimization-with-react-18-concurrent-rendering)
- [IPC Benchmark — Electron Adventures](https://dev.to/taw/electron-adventures-episode-20-ipc-benchmark-2b2d)
- [Profiling React with DevTools — Calibre](https://calibreapp.com/blog/react-performance-profiling-optimization)
- [requestAnimationFrame vs setTimeout — OpenReplay](https://blog.openreplay.com/requestanimationframe-settimeout-use/)
- [React Performance Checklist 2025 — DEV Community](https://dev.to/frontendtoolstech/react-performance-optimization-best-practices-for-2025-2g6b)
