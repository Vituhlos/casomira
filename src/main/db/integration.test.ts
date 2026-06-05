/**
 * Integrační smoke test: node:sqlite + migrace + seed + základní CRUD.
 * Běží přes `npx tsx` — nevyžaduje Electron, používá :memory: DB.
 * Testuje celou datovou vrstvu od migrace po repo volání.
 */

import { DatabaseSync } from 'node:sqlite'
import { migrate } from './migrate'
import { seed } from './seed'
import { runInTransaction } from './transaction'
import { SCHEMA_SQL } from './schema'

let pass = 0
let fail = 0

function check(label: string, ok: boolean, detail?: string): void {
  if (ok) {
    console.log(`  PASS: ${label}`)
    pass++
  } else {
    console.log(`  FAIL: ${label}${detail ? ` — ${detail}` : ''}`)
    fail++
  }
}

function section(title: string): void {
  console.log(`\n${title}`)
}

// ---- Pomocné funkce (mini-repo bez Electronu) ----

function openDb(): DatabaseSync {
  const db = new DatabaseSync(':memory:')
  db.exec('PRAGMA journal_mode = WAL')
  db.exec('PRAGMA foreign_keys = ON')
  return db
}

// ---- Testy ----

section('1. Migrace a seed')
{
  const db = openDb()
  // Verze 0 → spusť všech 9 migrací
  migrate(db)
  const ver = (db.prepare('PRAGMA user_version').get() as { user_version: number }).user_version
  check('user_version = 9 po migraci', ver === 9, `actual: ${ver}`)

  // Seed naplní závod + kategorie + jezdce
  seed(db)
  const n = (db.prepare('SELECT COUNT(*) AS n FROM zavod').get() as { n: number }).n
  check('seed vytvořil alespoň 1 závod', n > 0, `count: ${n}`)

  const kats = (db.prepare('SELECT COUNT(*) AS n FROM kategorie').get() as { n: number }).n
  check('seed vytvořil kategorie', kats > 0, `count: ${kats}`)

  const jezdci = (db.prepare('SELECT COUNT(*) AS n FROM jezdec').get() as { n: number }).n
  check('seed vložil jezdce (N1600)', jezdci > 0, `count: ${jezdci}`)

  // Idempotentnost: druhý seed nic nezmění
  seed(db)
  const n2 = (db.prepare('SELECT COUNT(*) AS n FROM zavod').get() as { n: number }).n
  check('seed je idempotentní (druhý běh nepřidá závod)', n2 === n)
}

section('2. Transakce — commit a rollback')
{
  const db = openDb()
  db.exec(`CREATE TABLE t (v INTEGER)`)

  runInTransaction(db, () => { db.exec(`INSERT INTO t VALUES (1)`) })
  const r1 = (db.prepare('SELECT SUM(v) AS s FROM t').get() as { s: number }).s
  check('commit zapíše hodnotu', r1 === 1)

  try {
    runInTransaction(db, () => {
      db.exec(`INSERT INTO t VALUES (99)`)
      throw new Error('záměrný rollback')
    })
  } catch { /* očekáváno */ }
  const r2 = (db.prepare('SELECT SUM(v) AS s FROM t').get() as { s: number }).s
  check('rollback při výjimce', r2 === 1, `sum: ${r2}`)
}

section('3. Migrace je idempotentní')
{
  const db = openDb()
  migrate(db)
  migrate(db) // druhý běh nesmí spadnout
  const ver = (db.prepare('PRAGMA user_version').get() as { user_version: number }).user_version
  check('druhá migrace projde bez chyby a version = 9', ver === 9)
}

section('4. Žebříček bodů')
{
  const db = openDb()
  migrate(db)
  seed(db)
  const b1 = (db.prepare("SELECT body FROM zebricek WHERE ruleset='STANDARD' AND poradi=1").get() as { body: number })?.body
  const b2 = (db.prepare("SELECT body FROM zebricek WHERE ruleset='STANDARD' AND poradi=2").get() as { body: number })?.body
  const b3 = (db.prepare("SELECT body FROM zebricek WHERE ruleset='STANDARD' AND poradi=3").get() as { body: number })?.body
  check('1. místo STANDARD = 50 bodů', b1 === 50, `${b1}`)
  check('2. místo STANDARD = 45 bodů', b2 === 45, `${b2}`)
  check('3. místo STANDARD = 42 bodů', b3 === 42, `${b3}`)
  const s1 = (db.prepare("SELECT body FROM zebricek WHERE ruleset='SOTOLINA' AND poradi=1").get() as { body: number })?.body
  check('1. místo SOTOLINA = 14 bodů', s1 === 14, `${s1}`)
}

section('5. Cizí klíče fungují (foreign_keys = ON)')
{
  const db = openDb()
  migrate(db)
  seed(db)
  let threw = false
  try {
    db.exec(`INSERT INTO kategorie (zavod_id, nazev, ruleset) VALUES (9999, 'Test', 'STANDARD')`)
  } catch {
    threw = true
  }
  check('INSERT s neplatným zavod_id selže', threw)
}

section('6. UNIQUE constraint — isUniqueError vzor')
{
  const db = openDb()
  db.exec(`CREATE TABLE u (v INTEGER UNIQUE)`)
  db.exec(`INSERT INTO u VALUES (1)`)
  let err: unknown
  try {
    db.exec(`INSERT INTO u VALUES (1)`)
  } catch (e) {
    err = e
  }
  const errcode = err instanceof Error ? (err as { errcode?: number }).errcode : undefined
  const msg     = err instanceof Error ? err.message : ''
  // node:sqlite: SQLITE_CONSTRAINT_UNIQUE = 2067 (extended error code)
  check('UNIQUE chyba má errcode = 2067', errcode === 2067, `errcode: ${errcode}`)
  check("UNIQUE chyba message obsahuje 'UNIQUE constraint'", msg.includes('UNIQUE constraint'), `msg: ${msg}`)
}

// ---- Výsledek ----

console.log(`\n${'─'.repeat(40)}`)
console.log(`Celkem: ${pass} PASS, ${fail} FAIL`)
if (fail === 0) {
  console.log('Všechny testy prošly. ✓')
} else {
  console.log('SELHÁNÍ — viz výše.')
  process.exit(1)
}
