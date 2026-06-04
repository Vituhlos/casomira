# Report: Migrace better-sqlite3 → node:sqlite

> Analýza proveditelnosti — zpracoval Claude Code, 2026-06-04.  
> **Krok 1 hotový** na větvi `experiment/node-sqlite`: wrapper + testy — viz
> [node-sqlite-transaction-wrapper.md](./node-sqlite-transaction-wrapper.md).  
> Zbytek migrace (connection, repo, Electron 42) zatím neproveden.

---

## Kontext

Appka dnes používá `better-sqlite3` (nativní modul), což vyžaduje rebuild
pro každou verzi Electronu. Electron 39 je poslední s funkčními prebuildy.
Cíl analýzy: ověřit, zda lze přejít na vestavěný `node:sqlite` (součást
Node.js v Electronu → žádná nativní kompilace) a tím odblokovat přechod
na Electron 42 a novější macOS.

---

## 1. Verze a stabilita

**Electron 42 = Node.js 24.15.0**
(ověřeno z releases.electronjs.org; poslední je Electron 42.3.3 ze 3. 6. 2026)

**node:sqlite stabilita:**
- Stability **1.2 (Release Candidate)** — od Node 22.13.0 / 23.4.0
  **nevyžaduje `--experimental-sqlite` flag**.
- Node 24 je aktivní LTS — pro produkci přijatelné riziko.
- Drobné API změny do `1.0` stále možné, ale nepravděpodobné u základních metod.

**Funguje v Electron main procesu?**
Ano — `node:sqlite` je built-in Node modul
(`import { DatabaseSync } from 'node:sqlite'`), main proces v Electronu je
plnohodnotný Node.js. Renderer ho nesmí volat (ale náš kód ho tak nepoužívá —
vše přes IPC).

---

## 2. Mapování API: better-sqlite3 → node:sqlite

### Co jde 1:1 nebo skoro

| better-sqlite3 | node:sqlite | Poznámka |
|---|---|---|
| `new Database(file)` | `new DatabaseSync(file)` | Jiný název třídy |
| `db.exec(sql)` | `db.exec(sql)` | **Identické** |
| `.prepare(sql).get(...)` | `.prepare(sql).get(...)` | **Identické** |
| `.prepare(sql).all(...)` | `.prepare(sql).all(...)` | **Identické** |
| `.prepare(sql).run(...)` | `.prepare(sql).run(...)` | Návratová hodnota viz níže |
| `r.lastInsertRowid` | `r.lastInsertRowid` | BigInt v obou; `Number()` cast funguje |
| Otevření existující DB souboru | — | SQLite formát je univerzální, žádná konverze |

### Co se liší — `pragma()`

`db.pragma()` v node:sqlite **neexistuje**. Tři různé způsoby použití v naší appce:

```typescript
// connection.ts — nastavení (SET pragma)
db.pragma('journal_mode = WAL')    // → db.exec('PRAGMA journal_mode = WAL')
db.pragma('foreign_keys = ON')     // → db.exec('PRAGMA foreign_keys = ON')

// migrate.ts — čtení hodnoty (simple: true → skalár)
db.pragma('user_version', { simple: true }) as number
// → (db.prepare('PRAGMA user_version').get() as { user_version: number }).user_version

// migrate.ts — čtení struktury (tabulkový výsledek)
db.pragma(`table_info(${table})`) as Array<{ name: string }>
// → db.prepare(`PRAGMA table_info(${table})`).all() as Array<{ name: string }>

// migrate.ts — SET uvnitř transakce
db.pragma(`user_version = ${targetVersion}`)
// → db.exec(`PRAGMA user_version = ${targetVersion}`)
```

**Celkem: 5 míst** (2 v `connection.ts`, 3 v `migrate.ts`).

### Co se liší — chybový formát (UNIQUE constraint)

V `repo.ts` funkce `isUniqueError()` testuje `e.code === 'SQLITE_CONSTRAINT_UNIQUE'`
— to je better-sqlite3 konvence. node:sqlite hází jinak:

```
error.code     = 'ERR_SQLITE_ERROR'   // vždy
error.errcode  = 19                   // SQLITE_CONSTRAINT (primární)
error.errstr   = 'UNIQUE constraint failed: ...'
```

Rewrite `isUniqueError`:
```typescript
// node:sqlite verze
function isUniqueError(e: unknown): boolean {
  return e instanceof Error
    && 'errcode' in e
    && (e as any).errcode === 19
    && ((e as any).errstr ?? '').includes('UNIQUE')
}
```

---

## 2b. Transakce — HLAVNÍ PROBLÉM ⚠️

**`db.transaction()` v node:sqlite neexistuje.** To je největší překážka migrace.

### Výčet všech míst s `db.transaction()`

| Soubor | Místo | Speciální? |
|---|---|---|
| `migrate.ts` | `step()` — volaná pro každý z 9 migračních kroků | NE |
| `repo.ts` | `createZavod` | NE |
| `repo.ts` | `syncKategorie` | NE |
| `repo.ts` | `updateZavod` | NE |
| `repo.ts` | `importJezdci` | NE |
| `repo.ts` | `setRostSlot` | NE |
| `repo.ts` | `zapisRost` | NE |
| `repo.ts` | **`prepoctiJizdu`** | **⚠️ VNOŘENÁ — viz níže** |
| `repo.ts` | **`getVysledky`** | **⚠️ VOLÁ `prepoctiJizdu` uvnitř** |
| `repo.ts` | `setVysledek` | NE |
| `repo.ts` | `setCasovaPenalizace` | NE |
| `repo.ts` | `setBodovaPenalizace` | NE |
| `repo.ts` | `setPosunPoradi` | NE |
| `repo.ts` | `zrusPenalizaci` | NE |
| `repo.ts` | `zapisMereniDoVysledku` | NE |
| `backup/import.ts` | `restoreFromText` | NE |
| `backup/import.ts` | `restoreAllZavodyFromText` | NE |
| `db/seed.ts` | `seed()` | NE |
| **Celkem** | **~18 míst** | 1 vnořená situace |

### Vnořená transakce: `getVysledky` → `prepoctiJizdu`

```typescript
// getVysledky otvírá transakci...
const jizdyData = db.transaction(() => {
  for (const jz of jizdy) { clean.run(...); ensure.run(...) }
  return jizdy.map((jz) => {
    prepoctiJizdu(db, ...)  // ← a uvnitř ní je DALŠÍ db.transaction()
    return nactiJizdu(...)
  })
})()
```

V better-sqlite3 toto funguje automaticky přes **SQLite SAVEPOINT**. V node:sqlite
by se volání `BEGIN` uvnitř aktivní transakce zhroutilo s chybou.

### Řešení: wrapper s SAVEPOINT ✅ (implementováno)

Implementace: `src/main/db/transaction.ts` — pojmenování přes **hloubku vnoření**
(`casomira_sp_0`, `casomira_sp_1`, …), ne jednoduchý globální čítač.

**Dokumentace a testy:** [node-sqlite-transaction-wrapper.md](./node-sqlite-transaction-wrapper.md)

```bash
npx tsx src/main/db/transaction.test.ts   # 13× PASS (commit, rollback, vnořené, sekvenční)
```

Další krok: všechna `db.transaction(() => { ... })()` nahradit za
`runInTransaction(db, () => { ... })` — mechanická záměna až po schválení.

---

## 3. Rozsah migrace

### Soubory ke změně

| Soubor | Typ změny | Náročnost |
|---|---|---|
| `src/main/db/connection.ts` | `pragma()` → `exec()`, jiný import | Triviální (5 řádků) |
| `src/main/db/migrate.ts` | `pragma()` → 3 způsoby, `db.transaction()` v `step()` | Malá |
| `src/main/db/seed.ts` | `db.transaction()` → wrapper | Triviální |
| `src/main/repo.ts` | 15× `db.transaction()`, `isUniqueError` | Střední (mechanické) |
| `src/main/backup/import.ts` | 2× `db.transaction()` | Triviální |
| `src/main/backup/export.ts` | Jen import `type Database` — jiný typ | Triviální |
| **Nový soubor** | `src/main/db/transaction.ts` — wrapper | ~20 řádků |

**Zbytek appky (`ipc.ts`, `scoring.ts`, `zaver.ts`, React UI atd.) se nemění** —
better-sqlite3 typy/volání se nerozlézají mimo `src/main/db/` a `src/main/repo.ts`.
Datová vrstva je dobře oddělená.

**Odhad celkového rozsahu:** ~60–80 řádků změn + 1 nový soubor (wrapper).
Žádná změna API směrem k UI/IPC vrstvě.

---

## 4. Rizika a alternativy

### Rizika migrace

| Riziko | Závažnost | Mitigace |
|---|---|---|
| SAVEPOINT wrapper — chybná implementace narušuje atomicitu | **VYSOKÁ** (základ integrity auditu) | Wrapper musí projít testy, zvláště nested případ `getVysledky→prepoctiJizdu` |
| `PRAGMA user_version` čtení — špatný klíč v objektu | Střední | Unit test migrace |
| `isUniqueError` — nový error formát se změní | Nízká | Logovat celý error objekt, přidat `errstr` check |
| node:sqlite API change před `1.0` | Nízká | Node 24 LTS + RC status; základní metody stabilní |
| WAL mode přes `exec` místo `pragma` | Nízká | SQL `PRAGMA journal_mode = WAL` funguje identicky |
| Existující uživatelská DB — kompatibilita | **Žádná** | SQLite soubor je tentýž formát; node:sqlite ho otevře bez konverze |

### Alternativy

**A) Zůstat na better-sqlite3 + čekat na fix prebuilds pro Electron 39+**
- *Pro:* nulové vývojové náklady teď; kód neměnit
- *Proti:* better-sqlite3 prebuilds pro Electron 39+ jsou dlouhodobě rozbité;
  CI build na macOS 26 žije na ad-hoc signing workaroundu — nestabilní
- *Hodnocení:* Přijatelné krátkodobě (1–2 měsíce); pak stejně nutné řešit

**B) Přejít na node:sqlite** *(hlavní varianta)*
- *Pro:* žádná nativní kompilace, žádný NODE_MODULE_VERSION mismatch,
  Electron 42 = aktuální macOS podpora, udržitelné dlouhodobě
- *Proti:* ~60–80 řádků změn, nutný SAVEPOINT wrapper, riziko implementace
- *Hodnocení:* Proveditelné s rozumným rizikem, pokud wrapper projde testy

**C) Čistě-JS driver (sql.js, @sqlite.org/sqlite-wasm)**
- *Pro:* bez nativní kompilace
- *Proti:* sql.js = starší API, in-memory zaměření, WASM overhead;
  nehodí se pro produkci s perzistentní soubor-DB
- *Hodnocení:* Nedoporučuji — node:sqlite je lepší volba

---

## Doporučení

**Jít do toho — ale napřed stabilizovat wrapper testy.**

Migrace je technicky proveditelná a rizika jsou zvládnutelná, ale integrita dat
závisí na správném SAVEPOINT wrapperu. Doporučené pořadí kroků:

1. ~~Napsat `src/main/db/transaction.ts` + unit testy~~ ✅ viz [node-sqlite-transaction-wrapper.md](./node-sqlite-transaction-wrapper.md)
2. Zaměnit import v `connection.ts`, ověřit WAL + foreign keys přes `exec`
3. Opravit `pragma()` → 5 míst v `connection.ts` a `migrate.ts`
4. Mechanicky nahradit všechna `db.transaction()()` → `runInTransaction(db, () => {})`
   ve všech 6 souborech
5. Opravit `isUniqueError` a ověřit edge case při importu/unikátním st. čísle
6. Bump Electron na 42 v `package.json`, odstranit `electron-rebuild`,
   `@electron/rebuild` z devDependencies, odstranit `"rebuild"` script
7. Test: spustit appku, otevřít závod, zapsat výsledky, otestovat penalizační dialog
   (testuje nested path `getVysledky → prepoctiJizdu`)
8. Test: restore zálohy (testuje největší transakci v `backup/import.ts`)
