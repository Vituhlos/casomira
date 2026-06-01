import type Database from 'better-sqlite3'
import { SCHEMA_SQL } from './schema'

// Číslo poslední migrace. Až budeme schéma měnit (např. přidáme `mereni`),
// přibude další krok a zvýšíme číslo. `user_version` si SQLite pamatuje v souboru.
const LATEST = 7

export function migrate(db: Database.Database): void {
  const version = db.pragma('user_version', { simple: true }) as number

  if (version < 1) {
    db.exec(SCHEMA_SQL)
  }

  if (version < 2) {
    // Jeden výsledek = jeden jezdec v jedné jízdě.
    db.exec(
      'CREATE UNIQUE INDEX IF NOT EXISTS ux_vysledek_jizda_jezdec ON vysledek(jizda_id, jezdec_id)'
    )
  }

  if (version < 3) {
    // Ruční přepis bodů (override). Když je vyplněno, má přednost před automatem;
    // výsledné body v `body` se pak rovnají této hodnotě (čte je klasifikace).
    db.exec('ALTER TABLE vysledek ADD COLUMN body_rucni INTEGER')
  }

  if (version < 4) {
    // Velikost finále kategorie: 8 (standard) nebo 10 (Hobby). CLAUDE.md §8/C.
    db.exec('ALTER TABLE kategorie ADD COLUMN finale_velikost INTEGER NOT NULL DEFAULT 8')
  }

  if (version < 5) {
    // Jednoduché klíč/hodnota nastavení (globální). Zatím: logo do hlavičky PDF
    // (uložené jako data URL). Klidně později doplníme další klíče.
    db.exec('CREATE TABLE IF NOT EXISTS nastaveni (klic TEXT PRIMARY KEY, hodnota TEXT)')
  }

  if (version < 6) {
    // Vestavěné stopky (CLAUDE.md §11/§13): jeden řádek = jedno kliknutí v cíli.
    db.exec(`
      CREATE TABLE IF NOT EXISTS mereni (
        id           INTEGER PRIMARY KEY,
        jizda_id     INTEGER NOT NULL REFERENCES jizda(id) ON DELETE CASCADE,
        poradi_kliku INTEGER NOT NULL,
        cas_ms       INTEGER NOT NULL,
        jezdec_id    INTEGER REFERENCES jezdec(id) ON DELETE SET NULL
      )
    `)
  }

  if (version < 7) {
    // Audit zásahů ředitele do výsledku (CLAUDE.md §11, fáze 2 — penalizace).
    db.exec(`
      CREATE TABLE IF NOT EXISTS uprava_log (
        id          INTEGER PRIMARY KEY,
        vysledek_id INTEGER NOT NULL REFERENCES vysledek(id) ON DELETE CASCADE,
        typ         TEXT NOT NULL CHECK (typ IN (
          'CASOVA_PENALIZACE','BODOVA_PENALIZACE','POSUN_PORADI','ZRUSENI'
        )),
        hodnota     INTEGER,
        duvod       TEXT NOT NULL,
        rozhodl     TEXT NOT NULL DEFAULT 'ředitel',
        kdy         TEXT NOT NULL
      )
    `)
    db.exec(
      'CREATE INDEX IF NOT EXISTS ix_uprava_vysledek ON uprava_log(vysledek_id, kdy DESC)'
    )
  }

  db.pragma(`user_version = ${LATEST}`)
}
