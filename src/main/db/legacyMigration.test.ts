import { mkdtempSync, rmSync, mkdirSync, existsSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { DatabaseSync } from 'node:sqlite'
import { afterEach, describe, expect, it } from 'vitest'
import { DB_FILE, migrateLegacyData } from './legacyMigration'

const LEGACY_PRODUCT_NAME = 'Časomíra'
const LEGACY_DEV_PRODUCT_NAME = 'casomira'
const LEGACY_DB_FILE = 'casomira.db'

let tempRoots: string[] = []

function tempRoot(): string {
  const root = mkdtempSync(join(tmpdir(), 'verdict-migration-'))
  tempRoots.push(root)
  return root
}

function createLegacyDb(appData: string, productName = LEGACY_PRODUCT_NAME): string {
  const legacyDir = join(appData, productName)
  mkdirSync(legacyDir, { recursive: true })
  const dbFile = join(legacyDir, LEGACY_DB_FILE)
  const db = new DatabaseSync(dbFile)
  try {
    db.exec(`
      CREATE TABLE marker (
        id INTEGER PRIMARY KEY,
        value TEXT NOT NULL
      );
      INSERT INTO marker (value) VALUES ('legacy-data');
    `)
  } finally {
    db.close()
  }
  return dbFile
}

function markerValue(dbFile: string): string {
  const db = new DatabaseSync(dbFile)
  try {
    const row = db.prepare('SELECT value FROM marker WHERE id = 1').get() as
      | { value: string }
      | undefined
    return row?.value ?? ''
  } finally {
    db.close()
  }
}

afterEach(() => {
  for (const root of tempRoots) {
    rmSync(root, { recursive: true, force: true })
  }
  tempRoots = []
})

describe('migrateLegacyData', () => {
  it('zkopíruje legacy databázi do verdict.db a nechá původní soubor být', () => {
    const root = tempRoot()
    const appData = join(root, 'AppData')
    const userData = join(appData, 'Verdict')
    mkdirSync(userData, { recursive: true })
    const legacyDb = createLegacyDb(appData)
    const logs: string[] = []

    const migrated = migrateLegacyData({
      userData,
      appData,
      isPackaged: true,
      log: (msg) => logs.push(msg)
    })

    const targetDb = join(userData, DB_FILE)
    expect(migrated).toBe(true)
    expect(existsSync(legacyDb)).toBe(true)
    expect(existsSync(targetDb)).toBe(true)
    expect(markerValue(targetDb)).toBe('legacy-data')
    expect(logs.some((msg) => msg.includes('dokončena'))).toBe(true)
  })

  it('přeskočí migraci, když verdict.db už existuje', () => {
    const root = tempRoot()
    const appData = join(root, 'AppData')
    const userData = join(appData, 'Verdict')
    mkdirSync(userData, { recursive: true })
    createLegacyDb(appData)
    const targetDb = join(userData, DB_FILE)
    const db = new DatabaseSync(targetDb)
    db.close()

    const migrated = migrateLegacyData({ userData, appData, isPackaged: true })

    expect(migrated).toBe(false)
    expect(existsSync(targetDb)).toBe(true)
  })

  it('zkopíruje legacy databázi i z vývojové složky casomira', () => {
    const root = tempRoot()
    const appData = join(root, 'AppData')
    const userData = join(appData, 'verdict')
    mkdirSync(userData, { recursive: true })
    const legacyDb = createLegacyDb(appData, LEGACY_DEV_PRODUCT_NAME)

    const migrated = migrateLegacyData({ userData, appData, isPackaged: false })
    const targetDb = join(userData, DB_FILE)

    expect(migrated).toBe(true)
    expect(existsSync(legacyDb)).toBe(true)
    expect(existsSync(targetDb)).toBe(true)
    expect(markerValue(targetDb)).toBe('legacy-data')
  })

  it('spadne raději nahlas, když po cílové databázi zůstaly jen WAL/SHM sidecary', () => {
    const root = tempRoot()
    const appData = join(root, 'AppData')
    const userData = join(appData, 'Verdict')
    mkdirSync(userData, { recursive: true })
    createLegacyDb(appData)
    const sidecar = new DatabaseSync(join(userData, `${DB_FILE}-wal`))
    sidecar.close()

    expect(() => migrateLegacyData({ userData, appData, isPackaged: true })).toThrow('WAL/SHM')
  })
})
