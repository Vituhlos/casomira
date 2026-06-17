import type { DatabaseSync } from 'node:sqlite'

/** Hloubka vnoření — každá úroveň dostane vlastní SAVEPOINT (sp_0, sp_1, …). */
let transactionDepth = 0

/**
 * Spustí `fn` v transakčním obalu přes SQLite SAVEPOINT (kompatibilní s vnořením).
 * Ekvivalent better-sqlite3 `db.transaction()` včetně vnořených volání.
 */
export function runInTransaction<T>(db: DatabaseSync, fn: () => T): T {
  const savepoint = `verdict_sp_${transactionDepth}`
  transactionDepth++

  db.exec(`SAVEPOINT ${savepoint}`)
  try {
    const result = fn()
    db.exec(`RELEASE SAVEPOINT ${savepoint}`)
    return result
  } catch (error) {
    db.exec(`ROLLBACK TO SAVEPOINT ${savepoint}`)
    db.exec(`RELEASE SAVEPOINT ${savepoint}`)
    throw error
  } finally {
    transactionDepth--
  }
}

/** Jen pro unit testy — obnoví počítadlo hloubky mezi izolovanými běhy. */
export function resetTransactionDepthForTests(): void {
  transactionDepth = 0
}
