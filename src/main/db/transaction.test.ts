/**
 * Testy runInTransaction proti node:sqlite (:memory:).
 * Spuštění: npx tsx src/main/db/transaction.test.ts
 */
import { DatabaseSync } from 'node:sqlite'
import { resetTransactionDepthForTests, runInTransaction } from './transaction'

let passed = 0
let failed = 0

function assert(condition: boolean, message: string): void {
  if (condition) {
    passed++
    console.log(`  PASS: ${message}`)
  } else {
    failed++
    console.error(`  FAIL: ${message}`)
  }
}

function countItems(db: DatabaseSync): number {
  const row = db.prepare('SELECT COUNT(*) AS c FROM items').get() as { c: number }
  return row.c
}

function sumValues(db: DatabaseSync): number {
  const row = db.prepare('SELECT COALESCE(SUM(value), 0) AS s FROM items').get() as { s: number }
  return row.s
}

function createTestDb(): DatabaseSync {
  const db = new DatabaseSync(':memory:')
  db.exec('CREATE TABLE items (id INTEGER PRIMARY KEY AUTOINCREMENT, value INTEGER NOT NULL)')
  return db
}

function testCommit(): void {
  console.log('\ncommit')
  const db = createTestDb()
  resetTransactionDepthForTests()

  runInTransaction(db, () => {
    db.prepare('INSERT INTO items (value) VALUES (?)').run(10)
    db.prepare('INSERT INTO items (value) VALUES (?)').run(20)
  })

  assert(countItems(db) === 2, 'zapíše oba řádky')
  assert(sumValues(db) === 30, 'součet hodnot = 30')
  db.close()
}

function testRollback(): void {
  console.log('\nrollback')
  const db = createTestDb()
  resetTransactionDepthForTests()

  db.prepare('INSERT INTO items (value) VALUES (?)').run(1)

  try {
    runInTransaction(db, () => {
      db.prepare('INSERT INTO items (value) VALUES (?)').run(99)
      throw new Error('záměrně')
    })
  } catch {
    /* očekáváno */
  }

  assert(countItems(db) === 1, 'po rollbacku zůstane jen řádek před transakcí')
  assert(sumValues(db) === 1, 'hodnota 99 se neuložila')
  db.close()
}

function testNestedBothCommit(): void {
  console.log('\nvnořené: vnější commit + vnitřní commit')
  const db = createTestDb()
  resetTransactionDepthForTests()

  runInTransaction(db, () => {
    db.prepare('INSERT INTO items (value) VALUES (?)').run(1)
    runInTransaction(db, () => {
      db.prepare('INSERT INTO items (value) VALUES (?)').run(2)
    })
    db.prepare('INSERT INTO items (value) VALUES (?)').run(3)
  })

  assert(countItems(db) === 3, 'všechny tři řádky zapsány')
  assert(sumValues(db) === 6, 'součet 1+2+3')
  db.close()
}

function testNestedInnerRollbackOuterContinues(): void {
  console.log('\nvnořené: vnitřní rollback, vnější commit')
  const db = createTestDb()
  resetTransactionDepthForTests()

  runInTransaction(db, () => {
    db.prepare('INSERT INTO items (value) VALUES (?)').run(100)
    try {
      runInTransaction(db, () => {
        db.prepare('INSERT INTO items (value) VALUES (?)').run(200)
        throw new Error('vnitřní chyba')
      })
    } catch {
      /* vnější pokračuje — jako getVysledky + prepoctiJizdu s odchycením */
    }
    db.prepare('INSERT INTO items (value) VALUES (?)').run(300)
  })

  assert(countItems(db) === 2, 'vnitřní 200 chybí, vnější 100 a 300 zůstanou')
  assert(sumValues(db) === 400, 'součet 100+300')
  db.close()
}

function testNestedOuterRollbackUndoesInner(): void {
  console.log('\nvnořené: vnitřní commit, vnější rollback')
  const db = createTestDb()
  resetTransactionDepthForTests()

  db.prepare('INSERT INTO items (value) VALUES (?)').run(7)

  try {
    runInTransaction(db, () => {
      db.prepare('INSERT INTO items (value) VALUES (?)').run(10)
      runInTransaction(db, () => {
        db.prepare('INSERT INTO items (value) VALUES (?)').run(20)
      })
      throw new Error('vnější selže po vnitřním commitu')
    })
  } catch {
    /* očekáváno */
  }

  assert(countItems(db) === 1, 'vnější i vnitřní změny vráceny — jen seed 7')
  assert(sumValues(db) === 7, 'žádné 10 ani 20')
  db.close()
}

function testSequential(): void {
  console.log('\nsekvenční: dvě transakce po sobě')
  const db = createTestDb()
  resetTransactionDepthForTests()

  runInTransaction(db, () => {
    db.prepare('INSERT INTO items (value) VALUES (?)').run(1)
  })
  runInTransaction(db, () => {
    db.prepare('INSERT INTO items (value) VALUES (?)').run(2)
  })

  assert(countItems(db) === 2, 'obě transakce commitly')
  assert(sumValues(db) === 3, 'součet 1+2')
  db.close()
}

function testReturnValue(): void {
  console.log('\nnávratová hodnota fn()')
  const db = createTestDb()
  resetTransactionDepthForTests()

  const n = runInTransaction(db, () => 42)
  assert(n === 42, 'vrací výsledek fn')
  db.close()
}

function main(): void {
  console.log('runInTransaction — testy (node:sqlite :memory:)')
  testCommit()
  testRollback()
  testNestedBothCommit()
  testNestedInnerRollbackOuterContinues()
  testNestedOuterRollbackUndoesInner()
  testSequential()
  testReturnValue()

  console.log('\n---')
  console.log(`Celkem: ${passed} PASS, ${failed} FAIL`)
  if (failed > 0) {
    process.exit(1)
  }
  console.log('Všechny testy prošly.')
}

main()
