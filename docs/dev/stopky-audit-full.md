# Stopky — Kompletní audit výkonu a kvality kódu

> Výstup ze 4 specializovaných skillů: **react-performance-optimization** (aplikován
> průběžně v session), **react-specialist**, **electron-pro**, **performance-engineer**,
> **code-reviewer**. Sestaveno 2026-06-17.
>
> Každý nález má: závažnost · popis · dopad · doporučená oprava.

---

## Přehled: co je v pořádku ✅

Tyhle věci agenti nezávisle potvrdili jako správně implementované — nesahat:

| Oblast | Status |
|---|---|
| `ZivyCas` — RAF místo setInterval | ✅ 60fps, sync s displayem, auto-pause v neaktivním okně |
| `startTransition` v `zaznamenej` (swap placeholder→real) | ✅ non-urgent, nepřeruší RAF tiky |
| Optimistický insert s `poradi_kliku` jako React key | ✅ placeholder se zobrazí ve stejném framu jako stisk, bez remountu `CasRadek` |
| `memo` na `SidebarKategorie`, `KoloVyber`, `JizdyVyber`, `StopkyPruh`, `RostNahled`, `CasRadek`, `CasCell`, `CisloInput` | ✅ všechny dostávají stabilní props, při záznamu času se nepřekreslují |
| `aktRef` / `kanalyRef` / `aktKlikRef` — čtení z refů v handlerech | ✅ správný pattern pro stabilní callbacky bez stale closure |
| `mereneSet` / `beziSet` memoizované přes string signaturu (`kanalIds`, `beziIds`) | ✅ nemění identitu při přidání kliků |
| `prirazeniRost` memoizovaný přes `prirazeniSig` | ✅ nemění se při záznamu času bez přiřazeného čísla → `RostNahled` se nepřekresluje |
| CSS `:focus-within` pro zvýraznění aktivního řádku | ✅ správné vyhnutí se React stavu pro fokus — nulová réžie |
| `ipcMain.handle` + `ipcRenderer.invoke` pattern | ✅ bidirectionální async, žádný `sendSync` nikde v codebase |
| `Profiler` + `perf.ts` — dev-only, v produkci no-op | ✅ žádná réžie v instalátoru |
| ~55 React elementů na stisk mezerníku | ✅ akceptovatelné, daleko pod prahem viditelného sekání |
| CSS animace `stopky-puls` | ✅ animuje jen `transform` + `opacity` → GPU compositor, nultá réžie JS threadu |

---

## KRITICKÉ — opravit jako první 🔴

### K1 — BUG: Rychlý dvojitý stisk mezerníku → ghost row (nenáhrazený placeholder)

**Kde:** `zaznamenej()`, řádky 271–317  
**Které skilly to našly:** react-specialist (Finding 11), electron-pro (Finding 5), code-reviewer (BUG 1)

**Co se stane:** Operator zmáčkne mezerník dvakrát rychle za sebou (dvě auta v cíli).
Druhý stisk přijde před tím, než se vrátí IPC odpověď z prvního.

- Stisk 1: `placeholderPoradi = klik.length + 1 = 1`, placeholder `{id: -1, poradi_kliku: 1}` přidán
- Stisk 2 (před odpovědí DB): `klik.length = 1`, `placeholderPoradi = 2`, placeholder `{id: -2, poradi_kliku: 2}` přidán
- IPC stisk 1 vrátí: DB přiřadí `poradi_kliku = 1` → swap OK
- IPC stisk 2 vrátí: DB spustí `MAX(poradi_kliku)+1` **ještě před tím, než commit stisku 1 proběhne** → také vrátí `poradi_kliku = 1`

Výsledek: dva DB záznamy s `poradi_kliku = 1`. Swap u stisku 2 hledá `c.poradi_kliku === 2`, ale real row má `poradi_kliku = 1` → placeholder s `id: -2` **nikdy není nahrazen**. V tabulce zůstane ghost row navždy.

**Oprava:** Přidat mutex (`recording` ref) v `zaznamenej`:
```typescript
const recordingRef = useRef(false)

const zaznamenej = useCallback(async (): Promise<void> => {
  if (recordingRef.current) return   // zahoď souběžné volání
  recordingRef.current = true
  try {
    // ... stávající kód ...
  } finally {
    recordingRef.current = false
  }
}, [oznam])
```
Lidsky není možné zmáčknout mezerník dvakrát za ~10ms, ale auto-repeat klávesnice nebo stress-test ano.

---

### K2 — BUG: Ctrl+Z během ~10ms IPC okna smaže špatný řádek z DB

**Kde:** `vratPosledni()`, řádky 319–334  
**Které skilly:** code-reviewer (BUG 2)

**Co se stane:** Operator omylem zmáčkne Ctrl+Z těsně po mezerníku (do 10ms = do návratu IPC).

- `posledni` je placeholder `{id: -N, jezdec_id: null}`
- Guard na řádku 325: `jezdec_id != null` → podmínka nesplněna, pokračuje
- Zavolá `window.api.mereniVratPosledni(k.jizdaId)` → DB smaže **předchozí reálný řádek** (nejvyšší `poradi_kliku` v DB, placeholder tam ještě není)
- Pak `klik.slice(0, -1)` odebere placeholder z UI
- IPC stisku vrátí `real` → swap se pokusí najít `poradi_kliku === N`, ale placeholder byl odebrán → real row nezmizí, zůstane navíc

Výsledek: smazán správný čas, přidán duplicitní.

**Oprava:** Přidat kontrolu na placeholder v `vratPosledni`:
```typescript
const posledni = k.klik[k.klik.length - 1]
if (posledni.id < 0) {
  // Placeholder stále čeká na IPC — nic neděláme, uživatel musí počkat
  oznam('Záznam se ještě ukládá, počkej chvíli.')
  return
}
```

---

### K3 — RISK: `CisloInput` blur s placeholder ID → unhandled IPC error

**Kde:** `priradCislo()` řádky 406–432, `CisloInput` řádky 1846–1898  
**Které skilly:** code-reviewer (RISK 8)

**Co se stane:** Operator klikne do políčka čísla na nově přidaném řádku před tím, než se vrátí IPC (do 10ms) → `row.id` je `-N`. Při odchodu z políčka se zavolá `window.api.mereniSetCislo(-N, ...)` → main proces najde `WHERE id = -N` → nenajde nic → throw. `priradCislo` nemá try/catch → unhandled promise rejection.

**Oprava:** v `priradCislo` přidat guard:
```typescript
const priradCislo = useCallback(async (row: MereniRadek, raw: string): Promise<boolean> => {
  if (row.id < 0) return false  // placeholder, IPC ještě nedoběhl
  // ... stávající kód ...
}, [oznam])
```
Nebo disable `CisloInput` dokud `row.id < 0` (přes `isPending` prop).

---

## STŘEDNÍ — opravit v dalším sprintu 🟡

### S1 — Pravděpodobná příčina zbývajícího sekání: `overflow-y: auto` na kontejneru tabulky

**Kde:** `StopkyApp.tsx` řádek ~703 (wrapping div okolo tabulky časů)  
**Které skilly:** performance-engineer (Finding 9) — **označeno jako nejvyšší priority**

**Co se stane:** Kontejner má `overflowY: 'auto'`. Když se přidá první řádek přes práh scrollbaru, Blink musí přepočítat layout (scrollbar se zobrazí / skryje). Tato **forced reflow** trvá **2–8 ms** a blokuje JS thread. V Chrome DevTools by se zobrazila jako široký fialový "Layout" bar ihned po scripting části keydown události.

V praxi: první záznamy (pod prahem scrollbaru) jsou OK. Jakmile tabulka přeroste výšku kontejneru, každý stisk mezerníku způsobí reflow při prvním překročení prahu.

**Oprava — 1 řádek:**
```typescript
// Najdi div s overflowY: 'auto' okolo tabulky (cca řádek 703)
// Změň na:
overflowY: 'scroll'   // scrollbar vždy viditelný → žádný reflow na přidání řádku
```

---

### S2 — `nove` + `potvrd` v deps keydown useEffect → 1-frame okno bez listeneru

**Kde:** `useEffect` s keydown handlerem, řádek ~381  
**Které skilly:** react-specialist (Finding 7), performance-engineer (Finding 7)

**Co se stane:** Při každém otevření / zavření modalu (`potvrd !== null`) je listener strhán a znovu přidán. Teoretticky existuje 1-frame okno kde spacebar nezaregistruje záznam. V praxi velmi nepravděpodobné, ale zbytečná re-registrace je zátěž.

**Oprava:** Přesunout `nove` a `potvrd` do refů:
```typescript
const noveRef = useRef(false)
const potvrdRef = useRef<typeof potvrd>(null)
// v renderu (ne v effectu):
noveRef.current = nove
potvrdRef.current = potvrd

useEffect(() => {
  const onKey = (e: KeyboardEvent): void => {
    if (noveRef.current || potvrdRef.current) return
    // ... zbytek stejný ...
  }
  window.addEventListener('keydown', onKey)
  return () => window.removeEventListener('keydown', onKey)
}, [zaznamenej, vratPosledni, pauza])  // nove + potvrd zmizí z deps
```

---

### S3 — `priradCislo` a `opravCas` chybí `startTransition`

**Kde:** `priradCislo` řádky 406–432, `opravCas` řádky 434–442  
**Které skilly:** react-specialist (Findings 3, 4)

**Co se stane:** Přiřazení čísla nebo oprava času jsou low-priority akce (operátor je dokončil blur/Enter). Pokud v tu chvíli přijde stisk mezerníku, urgentní RAF tick + `setKanaly` v těchto handlerech mohou soutěžit o stejný render slot.

**Oprava:**
```typescript
// priradCislo — poslední setKanaly zabalit:
startTransition(() => {
  setKanaly((prev) => prev.map((k) => ...))
})

// opravCas — setKanaly zabalit:
startTransition(() => {
  setKanaly((prev) => prev.map((k) => ...))
})
```

---

### S4 — `beforeunload` flush nedoběhne: timer state ztracen při force-close

**Kde:** `useEffect` s beforeunload, řádky 244–248  
**Které skilly:** electron-pro (Finding 2)

**Co se stane:** `beforeunload` zavolá `ulozVsechnyKanaly`, která spustí `ipcRenderer.invoke` jako fire-and-forget. Electron zničí renderer proces ihned po návratu `beforeunload` handleru — in-flight promises jsou zahozeny. Stav z posledních <350ms (před debounce tikem) se ztratí.

Vážnější: po crashu appky zůstane `running: true` s `startEpochMs` z minulosti. Po restartu stopky zobrazí čas `Date.now() - staleEpochMs` = třeba 3 hodiny → matoucí pro operátora.

**Oprava (dvě části):**
1. V `pauza()` přidat detekci crashové situace při obnově: pokud `running: true` a `startEpochMs` je starší než 60 minut, automaticky pozastavit a ukázat toast `"Stopky byly přerušeny — zkontroluj čas"`.
2. V `pauza()` `await`ovat IPC místo `void` (pokud se přejde na `ulozVsechnyKanaly` batch endpoint z S5).

---

### S5 — `pauza()` dělá dvojitý zápis: okamžitý + debounce 350ms

**Kde:** `pauza()` řádky 308–358, `useEffect` řádky 236–240  
**Které skilly:** electron-pro (Finding 6)

**Co se stane:** `pauza()` zavolá `void window.api.ulozMereniTimer(...)` okamžitě a zároveň `useEffect` naplánuje debounce, který zavolá `ulozVsechnyKanaly` za 350ms — ten zapíše znovu. Redundantní zápis, komplikuje sledování I/O.

**Oprava:** Odstranit přímé volání `ulozMereniTimer` z `pauza()` — debounce effect to pokryje. Přidat `ulozMereniTimer` jen v `beforeunload` flush pro případ force-close.

---

### S6 — HeroUI `Table` v `RostNahled`: 64–96 React Aria elementů při každém přiřazení čísla

**Kde:** `RostNahled`, řádky 1547–1678  
**Které skilly:** performance-engineer (Finding 5)

**Co se stane:** `Table` z HeroUI v3 (React Aria) vytváří ~8–12 React elementů na řádek. 8 pozic roštu = 64–96 elementů. Každý `Table.Row` má React Aria hooks (`useGridRow`, `useGridCell`) s event listenery a ARIA state. Při přiřazení čísla (`prirazeniRost` se změní) `RostNahled` re-renderuje a reconciluje celý strom = **2–8 ms**. Rošt je read-only, nepotřebuje keyboard navigation z React Aria.

**Oprava:** Nahradit HeroUI `Table` / `Table.Row` / `Table.Cell` plain `<table>/<tr>/<td>` se stejnými CSS třídami (`table__content`, `table__row`, `table__cell`) — stejný vzhled, ~0.5ms místo 2–8ms. Totéž co bylo uděláno u tabulky naměřených časů.

---

## NÍZKÁ — nice-to-have 🟢

### N1 — `ulozVsechnyKanaly`: N+1 souběžných IPC volání místo jednoho batche

**Kde:** `ulozVsechnyKanaly()`, řádky 141–150  
**Které skilly:** electron-pro (Finding 1), performance-engineer (Finding 2)

Při každém debounce tiku se pošle `ulozMereniTimer` pro **každý** otevřený kanál zvlášť. S 4 kanály = 5 paralelních fire-and-forget IPC. Chyby jsou zahozeny (`void`).

**Oprava:** Přidat jeden IPC endpoint `mereni:ulozTimeryBatch` přijímající pole a zapisující vše v jedné SQLite transakci. Ušetří N-1 round-tripů a umožní error handling.

---

### N2 — Sekvenční `mereniList` loop v inicializaci

**Kde:** `nactiZavodAkanaly()`, řádky 173–192  
**Které skilly:** electron-pro (Finding 3)

```typescript
for (const k of ks) {
  const klik = await window.api.mereniList(k.jizdaId)  // ← sekvenční
  ...
}
```

Se 4 kanály = 4× ~2ms IPC sekvenčně = zbytečných ~8ms při startu okna.

**Oprava:**
```typescript
const kliky = await Promise.all(ks.map((k) => window.api.mereniList(k.jizdaId)))
```

---

### N3 — `CisloInput` useEffect pro sync `st_cislo`: anti-pattern React 18

**Kde:** `CisloInput`, řádky ~1860–1862  
**Které skilly:** react-specialist (Finding 13)

```typescript
useEffect(() => {
  setV(row.st_cislo != null ? String(row.st_cislo) : '')
}, [row.st_cislo])
```

Efekt se spustí po renderu → extra render cyklus. React 18 doporučuje inline derived state:
```typescript
const [prevStCislo, setPrevStCislo] = useState(row.st_cislo)
if (prevStCislo !== row.st_cislo) {
  setPrevStCislo(row.st_cislo)
  setV(row.st_cislo != null ? String(row.st_cislo) : '')
}
```

---

### N4 — `smazCas` undo: čas se při obnovení přidá na konec, ne na původní místo

**Kde:** `smazCas()` undo path, řádky 121–135  
**Které skilly:** code-reviewer (RISK 4)

Pokud operátor smaže čas a pokračuje v měření, undo přidá čas znovu s novým `poradi_kliku` (na konec). Po `mereniList` refreshi uvidí čas na špatném místě při přiřazování čísel.

**Oprava:** Zakázat undo akci v toastu pokud stopky aktuálně jedou (`akt.running`), nebo zobrazit varování v popisu toastu.

---

### N5 — Inline `style` objekty v `RostNahled` → Table.Row nemůže bail-out

**Kde:** `RostNahled`, řádky ~1617–1626  
**Které skilly:** performance-engineer (Finding 6)

```tsx
style={{
  opacity: hotovo ? 0.42 : 1,
  transition: 'opacity 0.15s',
  background: i % 2 ? CARD_ALT : 'transparent'
}}
```

Nový objekt na každý render = React nemůže přeskočit Table.Row. Opravit spolu s N6 (přepis na `<table>`).

---

### N6 — `ulozVsechnyKanaly` a `nactiJizdyKola` zbytečně zavírají nad `zavodId`

**Kde:** řádky 141–150, 213–222  
**Které skilly:** react-specialist (Findings 8, 14)

`zavodId` v deps = callback mění identitu při změně závodu → restartuje debounce timer. Jde to obejít přesunutím guardu do effectu a odstraněním `zavodId` z `useCallback` deps.

---

### N7 — Dead code: `aktKat` computed a ihned zahozeno

**Kde:** `NoveMereni`, řádky 877–878  
**Které skilly:** code-reviewer (QUALITY 7)

```typescript
const aktKat = kategorie.find((k) => k.id === katId) ?? null
void aktKat
```

Proměnná se nikde nepoužívá. Smazat oba řádky.

---

### N8 — `perf.ts`: metrika `paint` je zavádějící (měří frame latenci, ne React render)

**Kde:** `perf.ts`, řádky 31–48  
**Které skilly:** code-reviewer (QUALITY 5)

`paint = performance.now() - ipcHotovoMs` se měří 2 RAF framy po dokončení IPC — ale zahrnuje frame scheduling latenci (až 2×16ms = 32ms kvantizace), ne React reconciliation. Správné číslo pro React render je `actualDuration` z `Profiler` callbacku (`profilStopek`).

**Oprava:** přejmenovat `paint` na `postIpcFrameMs` a upřesnit komentář.

---

## Budoucnost — React 19 🔵

### B1 — Nahradit manuální placeholder pattern `useOptimistic`

**Kde:** `zaznamenej()`, řádky 271–317  
**Které skilly:** react-specialist (Finding 17)

React 19 přidá `useOptimistic` hook, který tento pattern poskytuje nativně s automatickým rollback při chybě:
```typescript
const [optimisticKliky, addOptimisticKlik] = useOptimistic(
  akt.klik,
  (state, newRow: MereniRadek) => [...state, newRow]
)
```
Až bude Electron bundlovat React 19, tento hook je přímý nástupce aktuální implementace.

---

## Prioritizovaný plán oprav (Round 1 — hotovo)

| ID | Závažnost | Co | Stav |
|---|---|---|---|
| K1 | 🔴 BUG | `recordingRef` mutex v `zaznamenej` | ✅ commit ae10c7c |
| K2 | 🔴 BUG | `vratPosledni` guard `id < 0` | ✅ commit ae10c7c |
| K3 | 🔴 RISK | `priradCislo` guard `id < 0` | ✅ commit ae10c7c |
| S1 | 🟡 | `overflowY: auto` → `scroll` | ✅ commit ae10c7c |
| S2 | 🟡 | keydown čte `noveRef`/`potvrdRef` | ✅ commit ae10c7c |
| S3 | 🟡 | `startTransition` v `opravCas` + `priradCislo` | ✅ commit ae10c7c |
| S4 | 🟡 | Crash recovery při init (epoch > 60 min → auto-pauza) | ✅ commit ae10c7c |
| S6 | 🟡 | `RostNahled` plain `<table>` místo HeroUI Table | ✅ commit ae10c7c |
| N2 | 🟢 | `Promise.all` pro `mereniList` v init | ✅ commit ae10c7c |
| N7 | 🟢 | Dead code `aktKat` smazán | ✅ commit ae10c7c |
| N8 | 🟢 | `paint` → `postIpcFrameMs` v perf.ts | ✅ commit ae10c7c |

---

## Round 2 — nové nálezy (react-specialist + electron-pro + performance-engineer, 2026-06-17)

Tři agenti prošli codebase nezávisle po implementaci Round 1. Nové nálezy jsou převážně na DB vrstvě (main process) a drobné React bugfixes.

---

## KRITICKÉ — Round 2 🔴

### K4 — `async onBlur` v `CisloInput` → setState po potenciálním unmount

**Kde:** `CisloInput` — event handler `onBlur`
**Skill:** react-specialist

```tsx
onBlur={async () => {
  setFocused(false)
  const ok = await onCommit(row, v)  // await uvnitř event handleru
  setWarn(!ok)                        // volá setState po awaitu
}}
```

Dva problémy:

**a)** `setFocused(false)` se volá okamžitě, ale `setWarn(!ok)` po awaitu. Pokud uživatel rychle klikne na jiný řádek a `CisloInput` se unmountuje (reset tabulky, zahození jízdy), `setWarn` selže nebo vyvolá React warning o update na unmounted component.

**b)** React 19 striktněji validuje `async` event handlery — může produkovat varování.

**Oprava:**
```tsx
onBlur={() => {
  setFocused(false)
  void onCommit(row, v).then((ok) => {
    setWarn(!ok)
  })
}}
```

---

### K5 — `db.prepare()` bez cache: 4–5 alokací per stisk mezerníku v main procesu

**Kde:** `src/main/repo.ts` — funkce `mereniPridej`, `mereniRadek`, `overJizdaPatriAktivnimuZavodu`
**Skill:** electron-pro

`db.prepare(sql)` parsuje SQL, sestavuje query plan a kompiluje bytecode. V aktuálním kódu se volá při **každém** IPC handlování — pro jeden stisk mezerníku jsou to 4–5 `prepare()` volání. Na `node:sqlite` (synchronní binding v main process event loopu) to přidává desítky mikrosekund per stisk a kumuluje se při sérii zápisů.

**Oprava — modulová cache:**
```typescript
// src/main/db/stmts.ts
import type { StatementSync } from 'node:sqlite'
import { getDb } from './connection'

const cache = new Map<string, StatementSync>()

export function stmt(sql: string): StatementSync {
  let s = cache.get(sql)
  if (!s) { s = getDb().prepare(sql); cache.set(sql, s) }
  return s
}
```

Pak v `repo.ts` nahradit `db.prepare(sql).run(...)` → `stmt(sql).run(...)` pro kritické funkce stopek.
Prioritizovat: `mereniPridej`, `mereniRadek`, `overJizdaPatriAktivnimuZavodu` (volá se na každý stisk).

---

## STŘEDNÍ — Round 2 🟡

### S7 — `PRAGMA synchronous = NORMAL` chybí — SQLite fsync při každém commitu

**Kde:** `src/main/db/connection.ts`
**Skill:** electron-pro

Ve WAL módu je výchozí `synchronous = FULL`, což způsobuje `fsync()` po každém commitu. Na HDD to přidává 10–50 ms per INSERT (rotační disk hledání). Na SSD 1–5 ms. `WAL + synchronous = NORMAL` je doporučená kombinace — data jsou bezpečná (WAL log přežije crash), `fsync` se provádí méně agresivně.

**Oprava:**
```typescript
db.exec('PRAGMA journal_mode = WAL')
db.exec('PRAGMA synchronous = NORMAL')  // bezpečné s WAL
db.exec('PRAGMA foreign_keys = ON')
db.exec('PRAGMA busy_timeout = 3000')   // viz S8
```

---

### S8 — Chybí `PRAGMA busy_timeout`

**Kde:** `src/main/db/connection.ts`
**Skill:** electron-pro

Bez `busy_timeout` by `SQLITE_BUSY` chyba při souběžném přístupu (backup, budoucí Worker) způsobila okamžitý crash místo čekání. Pojistka pro budoucí rozšíření.

**Oprava:** viz S7 výše (jeden řádek navíc).

---

### S9 — `mereniPridej` dělá 5 queries místo 2 — zbytečné SELECT navíc

**Kde:** `src/main/repo.ts` — `mereniPridej`
**Skill:** electron-pro + performance-engineer (shodně)

Aktuální cesta: `overJizdaPatriAktivnimuZavodu` (SELECT zavodId + SELECT aktivni_zavod) + `SELECT MAX(poradi_kliku)` + `INSERT` + `mereniRadek` (SELECT s LEFT JOIN jezdec) = **5 queries per stisk**.

Klient ale v `zaznamenej()` zná všechna data z placeholder objektu kromě `id`. Stačí vrátit jen `{ id: number }`:

```typescript
// repo.ts — zjednodušená verze mereniPridej
export function mereniPridejRychlost(jizdaId: number, cas_ms: number): { id: number; poradi_kliku: number } {
  const row = getDb().prepare(
    `INSERT INTO mereni (jizda_id, zavod_id, poradi_kliku, cas_ms)
     VALUES (?, (SELECT zavod_id FROM jizda WHERE id = ?),
             (SELECT COALESCE(MAX(poradi_kliku),0)+1 FROM mereni WHERE jizda_id = ?), ?)
     RETURNING id, poradi_kliku`
  ).get(jizdaId, jizdaId, jizdaId, Math.round(cas_ms)) as { id: number; poradi_kliku: number }
  return row
}
```

A v rendereru:
```typescript
const { id, poradi_kliku } = await window.api.mereniPridej(k.jizdaId, cas)
const real: MereniRadek = { ...placeholder, id, poradi_kliku }
```

Ušetří 3 queries → odhadovaný dopad: −3–5 ms na IPC swap (pro zobrazení placeholderu nula, ten jde dřív).

---

### S10 — `beforeunload` flush: `ipcRenderer.invoke` je async, stav se při force-close ztratí

**Kde:** `src/renderer/src/StopkyApp.tsx` — beforeunload useEffect, `src/preload/index.ts`
**Skill:** electron-pro (konkrétní řešení)

Stávající S4 to identifikoval jako problém. electron-pro přináší konkrétní Electron řešení:

```typescript
// preload/index.ts — přidat synchronní variantu
ulozTimerSync: (jizdaId: number, stav: MereniTimerStav): void =>
  ipcRenderer.sendSync('mereni:ulozTimerSync', jizdaId, stav),

// main/ipc.ts — přidat handler
ipcMain.on('mereni:ulozTimerSync', (e, jizdaId, stav) => {
  repo.mereniUlozTimer(jizdaId, stav)
  e.returnValue = null  // povinné pro sendSync
})
```

`ipcRenderer.sendSync` blokuje renderer thread, ale v `beforeunload` je to správné — chceme flush před zavřením.

---

### S11 — RAF cleanup v `ZivyCas`: chybí `cancelled` flag

**Kde:** `ZivyCas` komponenta — `useEffect` s RAF smyčkou
**Skill:** react-specialist

```typescript
useEffect(() => {
  if (!running) return
  let rafId: number
  const tick = (): void => { setNow(Date.now()); rafId = requestAnimationFrame(tick) }
  rafId = requestAnimationFrame(tick)
  return () => cancelAnimationFrame(rafId)
}, [running])
```

Race condition: pokud OS pozastaví proces (sleep, lock screen) a obnoví ho těsně ve stejném framu jako React cleanup, `cancelAnimationFrame(rafId)` může zrušit jiný rafId (tick přepsal `rafId` po naplánování). Tik pak pokračuje po cleanupem.

**Oprava:**
```typescript
useEffect(() => {
  if (!running) return
  let cancelled = false
  let rafId: number
  const tick = (): void => {
    if (cancelled) return
    setNow(Date.now())
    rafId = requestAnimationFrame(tick)
  }
  rafId = requestAnimationFrame(tick)
  return () => { cancelled = true; cancelAnimationFrame(rafId) }
}, [running])
```

---

### S12 — `sandbox: false` v obou oknech kvůli `node:os` v preloadu

**Kde:** `src/main/windows.ts`
**Skill:** electron-pro

`sandbox: false` umožňuje preloadu Node.js přístup. Důvod: detekce Windows verze přes `os.release()` v preloadu. Pro offline desktop s `contextIsolation: true` je riziko nízké, ale lze eliminovat.

**Oprava:** Přesunout detekci Win verze do main procesu, vystavit jako statická hodnota při inicializaci přes IPC nebo jako součást `app:zavodChanged` odpovědi. Pak `sandbox: true`.

---

## NÍZKÁ — Round 2 🟢

### N9 — `getAktivniZavod()` bez in-memory cache — SELECT při každém mereniPridej

**Kde:** `src/main/repo.ts` / `src/main/db/connection.ts`
**Skill:** performance-engineer

`overJizdaPatriAktivnimuZavodu` volá `aktivniZavodIdNeboChyba()` která pravděpodobně dělá SELECT na `aktivni_zavod` nebo podobnou tabulku. Aktivní závod se během měření nemění. Jednoduchá in-memory cache by ušetřila 1 SELECT per stisk.

```typescript
let _cachedAktivniZavodId: number | null = null

export function getAktivniZavodIdCached(): number {
  if (_cachedAktivniZavodId != null) return _cachedAktivniZavodId
  _cachedAktivniZavodId = /* SELECT... */
  return _cachedAktivniZavodId
}

export function invalidateAktivniZavodCache(): void {
  _cachedAktivniZavodId = null
}
// volat invalidate při openZavod / closeZavod
```

---

### N10 — `<Profiler>` wrapper zbývá v produkčním buildu

**Kde:** `StopkyApp.tsx` — `<Profiler id="stopky-tabulka" ...>`
**Skill:** electron-pro

React `<Profiler>` je v produkci no-op (callback se nevolá), ale přidává jeden extra React element do stromu. Čistší:

```tsx
{import.meta.env.DEV
  ? <Profiler id="stopky-tabulka" onRender={profilStopek}>{tabulkaCas}</Profiler>
  : tabulkaCas}
```

---

### N11 — `akt.klik.filter` inline v JSX — O(N) per render

**Kde:** `StopkyApp.tsx` — header nad tabulkou časů
**Skill:** performance-engineer

```tsx
přiřazeno {akt.klik.filter((c) => c.jezdec_id != null).length}
```

Přidat `useMemo`:
```typescript
const prirazenyPocet = useMemo(
  () => akt?.klik.filter((c) => c.jezdec_id != null).length ?? 0,
  [akt?.klik]
)
```

---

### N12 — `listJizdyKola`: 3 correlated subqueries per row → LEFT JOIN GROUP BY

**Kde:** `src/main/repo.ts` — `listJizdyKola`
**Skill:** performance-engineer

Tři `(SELECT COUNT(*) FROM ... WHERE jizda_id = jz.id)` per řádek. S indexy na `jizda_id` je dopad malý (~0.5–2 ms celkem pro 5–15 jízd), ale lze optimalizovat na jeden průchod pomocí LEFT JOIN + GROUP BY. Nízká priorita — tato funkce není na kritické cestě záznamu.

---

### N13 — `useTransition` hook místo `startTransition` import — chybí `isPending`

**Kde:** `StopkyApp.tsx` — callbacky s `startTransition`
**Skill:** react-specialist

`startTransition` z importu neumožňuje číst `isPending` pro vizuální feedback. Pokud IPC trvá déle (pomalý disk), uživatel nemá indikátor při přiřazení čísla. Pro lokální SQLite prakticky nulové riziko — low priority.

---

## Profiling checklist (step-by-step) 📊

### Nástroj A: Vestavěný perf log (nejjednodušší — DEV build)

1. `npm run dev` → otevřít okno Stopek
2. `Ctrl+Shift+I` → záložka `Console`
3. Start + 10× mezerník
4. V konzoli: `[stopky] zápis #N  IPC X.X ms  render→postIpcFrameMs X.X ms`

Cílové hodnoty:
- `IPC` < 10 ms = dobrý, < 5 ms = skvělý
- `render→postIpcFrameMs` < 8 ms
- `React update X.X ms` (z Profiler callback) < 2 ms

### Nástroj B: Chrome DevTools Performance tab

1. DevTools → `Performance` → kruh (nahrávání)
2. 5× mezerník → zastav
3. Hledej v Main thread timeline po `keydown`:
   - `Recalculate Style` + `Layout` do 16ms od keydown — cíl: < 2 ms dohromady
   - `React Tree Reconciler` — cíl: < 2 ms
   - Blok `startTransition` render — může být 4–8 ms, ale odložený = neblokuje

### Interpretace

| Scénář | Příčina | Oprava |
|---|---|---|
| IPC > 15 ms | Příliš mnoho `db.prepare()` + queries | K5 + S7 + S9 |
| React update > 4 ms | Memo miss v `CasRadek` | Zkontroluj stabilitu `row` reference |
| `postIpcFrameMs` > 12 ms | Layout thrashing po setState | Zkontroluj forced reflow |
| Celková latence > 20 ms | IPC + React dohromady | Řeš IPC first |

---

## Aktualizovaný plán oprav (Round 1 + Round 2)

| ID | Závažnost | Co | Stav |
|---|---|---|---|
| K1–K3 | 🔴 | Mutex, Ctrl+Z guard, placeholder guard | ✅ hotovo |
| S1–S4, S6 | 🟡 | overflowY, keydown refs, startTransition, crash recovery, RostNahled table | ✅ hotovo |
| N2, N7, N8 | 🟢 | Promise.all, dead code, perf rename | ✅ hotovo |
| **K4** | 🔴 | `async onBlur` → setState po unmount | ☐ ~15 min |
| **K5** | 🔴 | `db.prepare()` cache v repo.ts | ☐ ~60 min |
| **S7+S8** | 🟡 | `PRAGMA synchronous=NORMAL` + `busy_timeout` | ☐ ~5 min |
| **S9** | 🟡 | `mereniPridej` — vrátit jen `{id}`, ušetřit 3 queries | ☐ ~45 min |
| **S10** | 🟡 | `beforeunload` → `ipcRenderer.sendSync` | ☐ ~30 min |
| **S11** | 🟡 | `ZivyCas` RAF `cancelled` flag | ☐ ~5 min |
| S12 | 🟡 | `sandbox: false` (bezpečnostní) | ☐ nízká urgence |
| N9 | 🟢 | `getAktivniZavod` in-memory cache | ☐ ~20 min |
| N10 | 🟢 | `<Profiler>` jen v DEV | ☐ ~5 min |
| N11 | 🟢 | `akt.klik.filter` → useMemo | ☐ ~5 min |
| N12 | 🟢 | `listJizdyKola` correlated subqueries | ☐ nízká urgence |
| N13 | 🟢 | `useTransition` hook + `isPending` | ☐ nízká urgence |

> **Největší dopad teď:** K5 (db.prepare cache) + S7 (synchronous=NORMAL) jsou v main procesu
> a mohou ušetřit 5–15 ms per stisk na HDD. K4 (async onBlur) je tichý bug který se projeví
> při rychlém přepínání jízd.
