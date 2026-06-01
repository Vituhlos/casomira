import { app } from 'electron'
import { join } from 'node:path'
import Database from 'better-sqlite3'

let db: Database.Database | null = null

// Otevře (a při prvním běhu vytvoří) databázový soubor v systémové složce
// aplikace pro data — na Windows typicky %AppData%\casomira\casomira.db.
export function getDb(): Database.Database {
  if (db) return db
  const file = join(app.getPath('userData'), 'casomira.db')
  db = new Database(file)
  db.pragma('journal_mode = WAL') // svižnější a odolnější zápisy
  db.pragma('foreign_keys = ON') // hlídat vazby mezi tabulkami
  return db
}

// Kde leží databázový soubor (hodí se pro zálohu/diagnostiku).
export function dbPath(): string {
  return join(app.getPath('userData'), 'casomira.db')
}
