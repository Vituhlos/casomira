# node:sqlite — transakční wrapper (`runInTransaction`)

> Větev: `experiment/node-sqlite`  
> Stav: **wrapper + testy hotové**, do appky zatím **nezapojeno**.  
> Souvisí s: [report-node-sqlite-migration.md](./report-node-sqlite-migration.md)

---

## Proč tento modul existuje

Migrace z `better-sqlite3` na vestavěný [`node:sqlite`](https://nodejs.org/api/sqlite.html)
(Electron 42 ≈ Node 24) naráží na to, že **`DatabaseSync` nemá `db.transaction()`**.

V naší appce na transakcích stojí integrita dat z auditu — atomické přepočty jízd,
import zálohy, migrace schématu. Nahrazení musí být **1:1** včetně **vnořených**
transakcí.

### Vnořený případ v produkčním kódu

`getVysledky` otevře transakci a uvnitř volá `prepoctiJizdu`, která má vlastní
`db.transaction()`:

```typescript
// repo.ts (zatím better-sqlite3) — zjednodušeně
const jizdyData = db.transaction(() => {
  // … úklid / ensure …
  return jizdy.map((jz) => {
    prepoctiJizdu(db, ...)  // uvnitř znovu db.transaction()
    return nactiJizdu(...)
  })
})()
```

`better-sqlite3` to řeší přes SQLite **SAVEPOINT**. Holý `BEGIN` uvnitř aktivní
transakce by v `node:sqlite` spadl. Wrapper postavený **vždy na SAVEPOINT** pokrývá
ploché i vnořené volání jedním API.

---

## Proč SAVEPOINT (ne BEGIN/COMMIT)

| Mechanismus | Vnoření | Chování při chybě |
|-------------|---------|-------------------|
| `BEGIN` … `COMMIT` | ❌ druhý BEGIN = chyba | Celá transakce |
| `SAVEPOINT` … `RELEASE` / `ROLLBACK TO` | ✅ vnořené úrovně | Rollback jen do daného bodu |

Důležité: **`RELEASE SAVEPOINT` není trvalý commit** — změny z vnitřní úrovně jsou
součástí vnější transakce, dokud vnější `runInTransaction` úspěšně nedoběhne.
Vnější rollback (chyba po vnitřním „commitu“) zahodí i vnitřní změny — to test
`vnější rollback` ověřuje.

---

## Implementace

**Soubor:** `src/main/db/transaction.ts`

```typescript
import type { DatabaseSync } from 'node:sqlite'

export function runInTransaction<T>(db: DatabaseSync, fn: () => T): T
export function resetTransactionDepthForTests(): void  // jen pro testy
```

### Pojmenování SAVEPOINTů

Používá se **hloubka vnoření** (`transactionDepth`), ne globální čítač napříč
běhy:

- 1. úroveň: `casomira_sp_0`
- 2. úroveň: `casomira_sp_1`
- po `finally` se hloubka sníží → sekvenční transakce znovu začínají od `_0`

Názvy jsou pod naší kontrolou (žádný user input) — bezpečné pro `db.exec()`.

### Algoritmus

1. `SAVEPOINT casomira_sp_{depth}`
2. spustit `fn()`
3. úspěch → `RELEASE SAVEPOINT`
4. chyba → `ROLLBACK TO SAVEPOINT` + `RELEASE SAVEPOINT` + propagace výjimky
5. `finally` → snížit `transactionDepth`

Návratová hodnota: generické `<T>` — vrací výsledek `fn()`.

### Co zatím NENÍ v appce

- `connection.ts`, `migrate.ts`, `repo.ts`, `backup/*`, `seed.ts` — beze změny
- stále `better-sqlite3` + Electron 39 na `v2`
- žádná závislost na `node:sqlite` v `package.json` (modul je built-in Node)

---

## Testy

**Soubor:** `src/main/db/transaction.test.ts`  
**Databáze:** `node:sqlite`, `:memory:`, tabulka `items(id, value)`  
**Runner:** žádný Vitest/Jest — samostatný skript s výpisem `PASS` / `FAIL`

### Spuštění

Z kořene repa (Node **22+**, modul `node:sqlite`):

```bash
npx tsx src/main/db/transaction.test.ts
```

Na Node 22 může Node vypsat `ExperimentalWarning: SQLite is an experimental feature`
— na cílovém Electron 42 / Node 24 má být RC bez flagu (viz migrační report).

Exit code: `0` = vše OK, `1` = alespoň jeden FAIL.

### Pokryté scénáře

| # | Scénář | Očekávání |
|---|--------|-----------|
| 1 | **Commit** | Úspěšná `runInTransaction` zapíše řádky, data přetrvají |
| 2 | **Rollback** | `fn()` vyhodí chybu → změny z transakce se neuloží |
| 3 | **Vnořené: oba commit** | Vnější + vnitřní → všechny INSERTy v DB |
| 4 | **Vnořené: vnitřní rollback, vnější commit** | Vnitřní `throw`, vnější odchytí / pokračuje → vnitřní změny pryč, vnější zůstanou |
| 5 | **Vnořené: vnitřní commit, vnější rollback** | Po úspěšném vnitřním `fn` vnější `throw` → **žádná** změna z obou úrovní (kritický test integrity) |
| 6 | **Sekvenční** | Dvě `runInTransaction` po sobě — obě úspěšné, hloubka se resetuje |
| 7 | **Návratová hodnota** | `runInTransaction` vrátí hodnotu z `fn()` |

Scénář 4 simuluje produkční vzor „vnější transakce pokračuje i když vnitřní
`prepoctiJizdu` selže a je odchycena“ (pokud takový flow v kódu existuje).
Scénář 5 je nejdůležitější pro důvěru ve wrapper před zapojením do `repo.ts`.

### Poslední ověřený běh

```
Celkem: 13 PASS, 0 FAIL
Všechny testy prošly.
```

(`npm run typecheck:node` — bez chyb včetně `transaction.ts`.)

---

## Další krok migrace (až po schválení)

Pořadí z [report-node-sqlite-migration.md](./report-node-sqlite-migration.md):

1. ~~Wrapper + testy~~ ✅ (tento dokument)
2. `connection.ts` — import `DatabaseSync`, pragma → `exec`
3. `migrate.ts` — pragma + `step()` přes `runInTransaction`
4. Mechanická náhrada `db.transaction(() => …)()` → `runInTransaction(db, () => …)` (~18 míst)
5. `isUniqueError` pro formát chyb `node:sqlite`
6. Bump Electron 42, odstranit `better-sqlite3` / `electron-rebuild`
7. Ruční test: výsledky, penalizace (`getVysledky` → `prepoctiJizdu`), restore zálohy

Před merge do `v2`: wrapper musí zůstat zelený; po zapojení do `repo.ts` znovu
spustit testy a projít integrační scénáře z reportu.

---

## Rychlý přehled souborů

| Soubor | Účel |
|--------|------|
| `src/main/db/transaction.ts` | Produkční wrapper |
| `src/main/db/transaction.test.ts` | Unit testy proti `:memory:` |
| `docs/dev/node-sqlite-transaction-wrapper.md` | Tento dokument |
| `docs/dev/report-node-sqlite-migration.md` | Celková analýza migrace |
