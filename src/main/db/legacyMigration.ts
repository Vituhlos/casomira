import { join } from 'node:path'
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  renameSync,
  rmSync
} from 'node:fs'
import { DatabaseSync } from 'node:sqlite'

export const DB_FILE = 'verdict.db'
const LEGACY_DB_FILE = 'casomira.db'
const LEGACY_DB_CANDIDATES = [
  // Zabalená stará appka používala productName Časomíra.
  'Časomíra',
  // Electron dev režim bere userData z package.json name, tedy casomira.
  'casomira'
] as const

export interface LegacyMigrationOptions {
  userData: string
  appData: string
  isPackaged: boolean
  log?: (msg: string) => void
}

function dbSidecars(dbFile: string): string[] {
  return [`${dbFile}-wal`, `${dbFile}-shm`]
}

function copyIfExists(from: string, to: string): void {
  if (existsSync(from)) copyFileSync(from, to)
}

function legacyDbCandidates(appData: string): string[] {
  return LEGACY_DB_CANDIDATES.map((productName) => join(appData, productName, LEGACY_DB_FILE))
}

function findLegacyDb(appData: string): string | null {
  for (const legacyDb of legacyDbCandidates(appData)) {
    if (existsSync(legacyDb)) return legacyDb
  }
  return null
}

function verifySqliteIntegrity(dbFile: string): void {
  const testDb = new DatabaseSync(dbFile)
  try {
    const rows = testDb.prepare('PRAGMA integrity_check').all() as Array<Record<string, unknown>>
    const value = rows.length === 1 ? String(Object.values(rows[0])[0] ?? '') : ''
    if (value !== 'ok') {
      const detail = rows.map((row) => String(Object.values(row)[0] ?? '')).join('; ')
      throw new Error(`SQLite integrity_check selhal: ${detail || 'bez detailu'}`)
    }
    testDb.exec('PRAGMA wal_checkpoint(TRUNCATE)')
  } finally {
    testDb.close()
  }
}

export function migrateLegacyData({
  userData,
  appData,
  isPackaged,
  log = () => {}
}: LegacyMigrationOptions): boolean {
  const targetDb = join(userData, DB_FILE)
  if (existsSync(targetDb)) return false

  const legacyDb = findLegacyDb(appData)
  if (!legacyDb) {
    log(`legacy DB nenalezena, migrace přeskočena: ${legacyDbCandidates(appData).join(', ')}`)
    return false
  }

  if (!isPackaged) {
    log('dev režim: migruji legacy DB kopii pro lokální rebrand test')
  }

  const staleTargetSidecars = dbSidecars(targetDb).filter((file) => existsSync(file))
  if (staleTargetSidecars.length > 0) {
    throw new Error(
      `Nelze migrovat data: ${DB_FILE} neexistuje, ale existují jeho WAL/SHM soubory. ` +
        `Zkontrolujte složku ${userData}.`
    )
  }

  const tmpDir = join(userData, `.legacy-verdict-${Date.now()}-${process.pid}`)
  const tmpDb = join(tmpDir, DB_FILE)
  mkdirSync(tmpDir, { recursive: true })

  try {
    log(`migruji legacy DB kopii: ${legacyDb} → ${targetDb}`)
    copyFileSync(legacyDb, tmpDb)
    copyIfExists(`${legacyDb}-wal`, `${tmpDb}-wal`)
    copyIfExists(`${legacyDb}-shm`, `${tmpDb}-shm`)
    verifySqliteIntegrity(tmpDb)

    renameSync(tmpDb, targetDb)
    log('legacy DB migrace dokončena')
    return true
  } catch (err) {
    log(`legacy DB migrace selhala: ${err instanceof Error ? err.message : String(err)}`)
    throw err
  } finally {
    rmSync(tmpDir, { recursive: true, force: true })
  }
}
