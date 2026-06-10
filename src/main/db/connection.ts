import { app } from 'electron'
import { join } from 'node:path'
import { mkdirSync } from 'node:fs'
import { DatabaseSync } from 'node:sqlite'

let db: DatabaseSync | null = null

// Otevře (a při prvním běhu vytvoří) databázový soubor v systémové složce
// aplikace pro data — na Windows %AppData%\Časomíra, na macOS
// ~/Library/Application Support/Časomíra. Cesta se vždy bere z Electronu
// (app.getPath) + path.join, nikdy se neskládá natvrdo — funguje na obou OS.
export function getDb(): DatabaseSync {
  if (db) return db
  // CASOMIRA_SCREENSHOT_DB: izolovaná DB pro screenshot tour — nepoškodí prod data.
  const file = process.env['CASOMIRA_SCREENSHOT_DB']
    ? process.env['CASOMIRA_SCREENSHOT_DB']
    : join(app.getPath('userData'), 'casomira.db')
  const dir = join(file, '..')
  // Na úplně čistém systému (první spuštění) složka ještě nemusí existovat —
  // node:sqlite by pak spadl na „unable to open database file". Vytvoříme ji.
  mkdirSync(dir, { recursive: true })
  db = new DatabaseSync(file)
  db.exec('PRAGMA journal_mode = WAL') // svižnější a odolnější zápisy
  db.exec('PRAGMA foreign_keys = ON')  // hlídat vazby mezi tabulkami
  return db
}

// Kde leží databázový soubor (hodí se pro zálohu/diagnostiku).
export function dbPath(): string {
  return process.env['CASOMIRA_SCREENSHOT_DB']
    ? process.env['CASOMIRA_SCREENSHOT_DB']
    : join(app.getPath('userData'), 'casomira.db')
}
