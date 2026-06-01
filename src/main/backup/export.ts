import type Database from 'better-sqlite3'
import { getDb } from '../db/connection'
import { backupEnvelopeBase } from './meta'
import type {
  BackupJezdecRow,
  BackupJizdaRow,
  BackupKategorieRow,
  BackupKoloRow,
  BackupMereniRow,
  BackupNastaveniRow,
  BackupPravidlaRow,
  BackupRostPoziceRow,
  BackupSkupinaRow,
  BackupUpravaLogRow,
  BackupVysledekRow,
  BackupZavodPayload,
  BackupZavodRow,
  BackupZebricekRow,
  CasomiraBackupFile
} from './types'

function idsIn(ids: number[]): string {
  if (ids.length === 0) return '0'
  return ids.join(',')
}

function exportZavodPayload(db: Database.Database, zavodId: number): BackupZavodPayload {
  const zavod = db
    .prepare('SELECT id, nazev, datum, misto, typ FROM zavod WHERE id = ?')
    .get(zavodId) as BackupZavodRow | undefined
  if (!zavod) throw new Error('Závod nenalezen.')

  const kategorie = db
    .prepare(
      'SELECT id, zavod_id, nazev, ruleset, finale_velikost FROM kategorie WHERE zavod_id = ? ORDER BY id'
    )
    .all(zavodId) as BackupKategorieRow[]
  const katIds = kategorie.map((k) => k.id)

  if (katIds.length === 0) {
    return {
      zavod,
      kategorie: [],
      skupiny: [],
      jezdci: [],
      kola: [],
      jizdy: [],
      rost_pozice: [],
      vysledky: [],
      mereni: [],
      uprava_log: []
    }
  }

  const inKat = idsIn(katIds)

  const skupiny = db
    .prepare(`SELECT id, kategorie_id, nazev FROM skupina WHERE kategorie_id IN (${inKat})`)
    .all() as BackupSkupinaRow[]

  const jezdci = db
    .prepare(
      `SELECT id, kategorie_id, st_cislo, prijmeni, jmeno, znacka, model, rok_narozeni, los
       FROM jezdec WHERE kategorie_id IN (${inKat}) ORDER BY id`
    )
    .all() as BackupJezdecRow[]

  const kola = db
    .prepare(
      `SELECT id, kategorie_id, typ, poradi FROM kolo WHERE kategorie_id IN (${inKat}) ORDER BY id`
    )
    .all() as BackupKoloRow[]
  const koloIds = kola.map((k) => k.id)

  let jizdy: BackupJizdaRow[] = []
  if (koloIds.length > 0) {
    jizdy = db
      .prepare(
        `SELECT id, kolo_id, cislo, skupina_id FROM jizda WHERE kolo_id IN (${idsIn(koloIds)}) ORDER BY id`
      )
      .all() as BackupJizdaRow[]
  }
  const jizdaIds = jizdy.map((j) => j.id)

  let rost_pozice: BackupRostPoziceRow[] = []
  let vysledky: BackupVysledekRow[] = []
  let mereni: BackupMereniRow[] = []
  if (jizdaIds.length > 0) {
    const inJ = idsIn(jizdaIds)
    rost_pozice = db
      .prepare(
        `SELECT id, jizda_id, pozice, jezdec_id FROM rost_pozice WHERE jizda_id IN (${inJ}) ORDER BY id`
      )
      .all() as BackupRostPoziceRow[]
    vysledky = db
      .prepare(
        `SELECT id, jizda_id, jezdec_id, namereny_cas_ms, penalizace_ms, stav, body_rucni,
                rucni_poradi, poradi, body, poznamka
         FROM vysledek WHERE jizda_id IN (${inJ}) ORDER BY id`
      )
      .all() as BackupVysledekRow[]
    mereni = db
      .prepare(
        `SELECT id, jizda_id, zavod_id, poradi_kliku, cas_ms, jezdec_id FROM mereni WHERE jizda_id IN (${inJ}) ORDER BY id`
      )
      .all() as BackupMereniRow[]
  }

  let uprava_log: BackupUpravaLogRow[] = []
  const vysIds = vysledky.map((v) => v.id)
  if (vysIds.length > 0) {
    uprava_log = db
      .prepare(
        `SELECT id, vysledek_id, typ, hodnota, duvod, rozhodl, kdy
         FROM uprava_log WHERE vysledek_id IN (${idsIn(vysIds)}) ORDER BY id`
      )
      .all() as BackupUpravaLogRow[]
  }

  return {
    zavod,
    kategorie,
    skupiny,
    jezdci,
    kola,
    jizdy,
    rost_pozice,
    vysledky,
    mereni,
    uprava_log
  }
}

function exportGlobalTables(db: Database.Database): {
  zebricek: BackupZebricekRow[]
  pravidla: BackupPravidlaRow[]
  nastaveni: BackupNastaveniRow[]
} {
  const zebricek = db
    .prepare('SELECT id, ruleset, poradi, body FROM zebricek ORDER BY ruleset, poradi')
    .all() as BackupZebricekRow[]
  const pravidla = db
    .prepare(
      `SELECT id, ruleset, max_na_jizdu, sf_prah, sf_max, dnf_offset, dns_offset, dq_offset,
              dnf_body, dns_body, dq_body FROM pravidla ORDER BY ruleset`
    )
    .all() as BackupPravidlaRow[]
  const nastaveni = db
    .prepare('SELECT klic, hodnota FROM nastaveni ORDER BY klic')
    .all() as BackupNastaveniRow[]
  return { zebricek, pravidla, nastaveni }
}

export function buildZavodBackup(zavodId: number): CasomiraBackupFile {
  const db = getDb()
  return {
    ...backupEnvelopeBase('zavod'),
    zavody: [exportZavodPayload(db, zavodId)]
  }
}

export function buildDatabaseBackup(): CasomiraBackupFile {
  const db = getDb()
  const ids = db.prepare('SELECT id FROM zavod ORDER BY id').all() as { id: number }[]
  const zavody = ids.map((r) => exportZavodPayload(db, r.id))
  const global = exportGlobalTables(db)
  return {
    ...backupEnvelopeBase('database'),
    zavody,
    ...global
  }
}

export function serializeBackup(data: CasomiraBackupFile): string {
  return JSON.stringify(data, null, 2)
}
