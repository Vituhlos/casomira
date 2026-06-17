import type { DatabaseSync } from 'node:sqlite'
import { runInTransaction } from '../db/transaction'
import { getDb } from '../db/connection'
import * as repo from '../repo'
import type {
  BackupCollisionMatch,
  BackupRestorePreview,
  BackupZavodPayload,
  VerdictBackupFile
} from './types'
import { parseBackupJson, BackupValidationError } from './validate'

function najdiKolize(zavod: BackupZavodPayload['zavod']): BackupCollisionMatch[] {
  const db = getDb()
  const out: BackupCollisionMatch[] = []
  const seen = new Set<number>()

  const byId = db
    .prepare('SELECT id, nazev, datum FROM zavod WHERE id = ?')
    .get(zavod.id) as { id: number; nazev: string; datum: string } | undefined
  if (byId && !seen.has(byId.id)) {
    seen.add(byId.id)
    out.push({ id: byId.id, nazev: byId.nazev, datum: byId.datum, duvod: 'source_id' })
  }

  const byNazev = db
    .prepare(
      `SELECT id, nazev, datum FROM zavod
       WHERE lower(trim(nazev)) = lower(trim(?)) AND datum = ? AND id != ?`
    )
    .all(zavod.nazev, zavod.datum, zavod.id) as { id: number; nazev: string; datum: string }[]
  for (const row of byNazev) {
    if (seen.has(row.id)) continue
    seen.add(row.id)
    out.push({ id: row.id, nazev: row.nazev, datum: row.datum, duvod: 'nazev_datum' })
  }

  return out
}

export function previewRestoreFromText(text: string, soubor: string, zavodIndex = 0): BackupRestorePreview {
  const data = parseBackupJson(text)
  const idx = Math.min(Math.max(0, zavodIndex), data.zavody.length - 1)
  const block = data.zavody[idx]
  const kolize = najdiKolize(block.zavod)
  return {
    soubor,
    scope: data.scope,
    zavod: block.zavod,
    appVersion: data.appVersion,
    schemaVersion: data.schemaVersion,
    exportedAt: data.exportedAt,
    pocetZavodu: data.zavody.length,
    kolize,
    pocetKategorii: block.kategorie.length,
    pocetJezdcu: block.jezdci.length
  }
}

function insertZavodBlock(db: DatabaseSync, block: BackupZavodPayload): number {
  const z = block.zavod
  const newZavodId = Number(
    db
      .prepare('INSERT INTO zavod (nazev, datum, misto, typ) VALUES (?, ?, ?, ?)')
      .run(z.nazev, z.datum, z.misto, z.typ).lastInsertRowid
  )

  const katMap = new Map<number, number>()
  const insKat = db.prepare(
    'INSERT INTO kategorie (zavod_id, nazev, ruleset, finale_velikost) VALUES (?, ?, ?, ?)'
  )
  for (const k of block.kategorie) {
    const nid = Number(
      insKat.run(newZavodId, k.nazev, k.ruleset, k.finale_velikost ?? 8).lastInsertRowid
    )
    katMap.set(k.id, nid)
  }

  const skupMap = new Map<number, number>()
  const insSkup = db.prepare('INSERT INTO skupina (kategorie_id, nazev) VALUES (?, ?)')
  for (const s of block.skupiny) {
    const kid = katMap.get(s.kategorie_id)
    if (kid == null) continue
    skupMap.set(s.id, Number(insSkup.run(kid, s.nazev).lastInsertRowid))
  }

  const jezMap = new Map<number, number>()
  const insJez = db.prepare(
    `INSERT INTO jezdec (kategorie_id, st_cislo, prijmeni, jmeno, znacka, model, rok_narozeni, los)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  )
  for (const j of block.jezdci) {
    const kid = katMap.get(j.kategorie_id)
    if (kid == null) continue
    jezMap.set(
      j.id,
      Number(
        insJez.run(
          kid,
          j.st_cislo,
          j.prijmeni,
          j.jmeno,
          j.znacka,
          j.model,
          j.rok_narozeni,
          j.los
        ).lastInsertRowid
      )
    )
  }

  const koloMap = new Map<number, number>()
  const insKolo = db.prepare('INSERT INTO kolo (kategorie_id, typ, poradi) VALUES (?, ?, ?)')
  for (const k of block.kola) {
    const kid = katMap.get(k.kategorie_id)
    if (kid == null) continue
    koloMap.set(k.id, Number(insKolo.run(kid, k.typ, k.poradi).lastInsertRowid))
  }

  const jizdaMap = new Map<number, number>()
  const insJizda = db.prepare(
    'INSERT INTO jizda (kolo_id, cislo, skupina_id) VALUES (?, ?, ?)'
  )
  for (const j of block.jizdy) {
    const kolid = koloMap.get(j.kolo_id)
    if (kolid == null) continue
    const skupinaId = j.skupina_id != null ? (skupMap.get(j.skupina_id) ?? null) : null
    jizdaMap.set(
      j.id,
      Number(insJizda.run(kolid, j.cislo, skupinaId).lastInsertRowid)
    )
  }

  const insRost = db.prepare(
    'INSERT INTO rost_pozice (jizda_id, pozice, jezdec_id) VALUES (?, ?, ?)'
  )
  for (const r of block.rost_pozice) {
    const jid = jizdaMap.get(r.jizda_id)
    const jeid = jezMap.get(r.jezdec_id)
    if (jid == null || jeid == null) continue
    insRost.run(jid, r.pozice, jeid)
  }

  const vysMap = new Map<number, number>()
  const insVys = db.prepare(
    `INSERT INTO vysledek (jizda_id, jezdec_id, namereny_cas_ms, penalizace_ms, stav, body_rucni,
      rucni_poradi, poradi, body, poznamka) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  )
  for (const v of block.vysledky) {
    const jid = jizdaMap.get(v.jizda_id)
    const jeid = jezMap.get(v.jezdec_id)
    if (jid == null || jeid == null) continue
    const nid = Number(
      insVys.run(
        jid,
        jeid,
        v.namereny_cas_ms,
        v.penalizace_ms ?? 0,
        v.stav,
        v.body_rucni,
        v.rucni_poradi,
        v.poradi,
        v.body,
        v.poznamka
      ).lastInsertRowid
    )
    vysMap.set(v.id, nid)
  }

  const insMer = db.prepare(
    'INSERT INTO mereni (jizda_id, zavod_id, poradi_kliku, cas_ms, jezdec_id) VALUES (?, ?, ?, ?, ?)'
  )
  for (const m of block.mereni) {
    const jid = jizdaMap.get(m.jizda_id)
    if (jid == null) continue
    const jeid = m.jezdec_id != null ? (jezMap.get(m.jezdec_id) ?? null) : null
    insMer.run(jid, newZavodId, m.poradi_kliku, m.cas_ms, jeid)
  }

  const insLog = db.prepare(
    'INSERT INTO uprava_log (vysledek_id, typ, hodnota, duvod, rozhodl, kdy) VALUES (?, ?, ?, ?, ?, ?)'
  )
  for (const u of block.uprava_log) {
    const vid = vysMap.get(u.vysledek_id)
    if (vid == null) continue
    insLog.run(vid, u.typ, u.hodnota, u.duvod, u.rozhodl, u.kdy)
  }

  return newZavodId
}

function importGlobalTables(db: DatabaseSync, data: VerdictBackupFile): void {
  if (!data.zebricek?.length && !data.pravidla?.length && !data.nastaveni?.length) return

  if (data.zebricek?.length) {
    db.prepare('DELETE FROM zebricek').run()
    const ins = db.prepare('INSERT INTO zebricek (ruleset, poradi, body) VALUES (?, ?, ?)')
    for (const z of data.zebricek) ins.run(z.ruleset, z.poradi, z.body)
  }

  if (data.pravidla?.length) {
    for (const p of data.pravidla) {
      db.prepare(
        `UPDATE pravidla SET max_na_jizdu=?, sf_prah=?, sf_max=?, dnf_offset=?, dns_offset=?,
         dq_offset=?, dnf_body=?, dns_body=?, dq_body=? WHERE ruleset=?`
      ).run(
        p.max_na_jizdu,
        p.sf_prah,
        p.sf_max,
        p.dnf_offset,
        p.dns_offset,
        p.dq_offset,
        p.dnf_body,
        p.dns_body,
        p.dq_body,
        p.ruleset
      )
    }
  }

  if (data.nastaveni?.length) {
    const ups = db.prepare(
      'INSERT INTO nastaveni (klic, hodnota) VALUES (?, ?) ON CONFLICT(klic) DO UPDATE SET hodnota = excluded.hodnota'
    )
    for (const n of data.nastaveni) {
      if (n.klic === 'aktivni_zavod') continue
      ups.run(n.klic, n.hodnota)
    }
  }
}

export function restoreFromText(
  text: string,
  mode: 'new' | 'overwrite',
  targetZavodId?: number,
  zavodIndex = 0
): { zavodId: number; nazev: string } {
  const data = parseBackupJson(text)

  const idx = Math.min(Math.max(0, zavodIndex), data.zavody.length - 1)
  const block = data.zavody[idx]

  const db = getDb()
  const zavodId = runInTransaction(db, () => {
    if (mode === 'overwrite') {
      if (targetZavodId == null) {
        throw new BackupValidationError('Chybí cílový závod pro přepsání.')
      }
      const exist = db.prepare('SELECT id FROM zavod WHERE id = ?').get(targetZavodId)
      if (!exist) throw new BackupValidationError('Závod k přepsání už v databázi není.')
      repo.deleteZavod(targetZavodId)
    }

    const newId = insertZavodBlock(db, block)

    if (data.scope === 'database') {
      importGlobalTables(db, data)
    }

    return newId
  })

  repo.setAktivniZavod(zavodId)
  return { zavodId, nazev: block.zavod.nazev }
}

export function restoreAllZavodyFromText(text: string): number[] {
  const data = parseBackupJson(text)
  const db = getDb()
  return runInTransaction(db, () => {
    const ids: number[] = []
    for (const block of data.zavody) {
      ids.push(insertZavodBlock(db, block))
    }
    if (data.scope === 'database') importGlobalTables(db, data)
    if (ids.length > 0) repo.setAktivniZavod(ids[ids.length - 1])
    return ids
  })
}

export { BackupValidationError }
