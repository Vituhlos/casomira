import { app } from 'electron'
import { join } from 'node:path'
import { appendFileSync, mkdirSync } from 'node:fs'
import { DatabaseSync } from 'node:sqlite'
import { DB_FILE, migrateLegacyData } from './legacyMigration'

let db: DatabaseSync | null = null

function logDbStartup(msg: string): void {
  try {
    const dir = app.getPath('userData')
    mkdirSync(dir, { recursive: true })
    appendFileSync(join(dir, 'startup.log'), `[${new Date().toISOString()}] ${msg}\n`)
  } catch {
    /* diagnostika nikdy nesmí shodit start aplikace */
  }
}

// Otevře (a při prvním běhu vytvoří) databázový soubor v systémové složce
// aplikace pro data — na Windows %AppData%\Verdict, na macOS
// ~/Library/Application Support/Verdict. Cesta se vždy bere z Electronu
// (app.getPath) + path.join, nikdy se neskládá natvrdo — funguje na obou OS.
export function getDb(): DatabaseSync {
  if (db) return db
  const dir = app.getPath('userData')
  // Na úplně čistém systému (první spuštění) složka ještě nemusí existovat —
  // node:sqlite by pak spadl na „unable to open database file". Vytvoříme ji.
  mkdirSync(dir, { recursive: true })
  migrateLegacyData({
    userData: dir,
    appData: app.getPath('appData'),
    isPackaged: app.isPackaged,
    log: logDbStartup
  })
  const file = join(dir, DB_FILE)
  db = new DatabaseSync(file)
  db.exec('PRAGMA journal_mode = WAL')      // svižnější a odolnější zápisy
  db.exec('PRAGMA synchronous = NORMAL')    // WAL + NORMAL: bezpečné a rychlejší (bez fsync per commit)
  db.exec('PRAGMA busy_timeout = 3000')     // čekej 3 s na zámek místo okamžité chyby
  db.exec('PRAGMA foreign_keys = ON')       // hlídat vazby mezi tabulkami
  db.exec('PRAGMA cache_size = -8000')      // 8 MB page cache v RAM
  db.exec('PRAGMA mmap_size = 67108864')    // 64 MB memory-mapped I/O — čtení bez syscallů
  db.exec('PRAGMA temp_store = MEMORY')     // dočasné tabulky v RAM místo na disku
  return db
}

// Kde leží databázový soubor (hodí se pro zálohu/diagnostiku).
export function dbPath(): string {
  return join(app.getPath('userData'), DB_FILE)
}
