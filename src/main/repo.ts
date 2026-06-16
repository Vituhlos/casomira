// Datová vrstva — čte a zapisuje do SQLite. Tvar dat i kanály IPC zůstávají
// stejné jako v dřívější verzi v paměti, takže okno se nijak nemění.

import type {
  ImportCommit,
  ImportPreview,
  QAgregatRadek,
  ImportResult,
  ImportSheetPreview,
  CelkoveRadek,
  Jezdec,
  JezdecPole,
  JezdecUprava,
  Kategorie,
  KlasifikaceRadek,
  KoloTyp,
  MereniKanal,
  MereniRadek,
  MereniSetCisloResult,
  NovyZavod,
  RostKolo,
  RostNavrh,
  RostNavrhJizda,
  RostSlot,
  RostZapisJizda,
  Ruleset,
  SetRostResult,
  BodovaPenalizaceArg,
  CasovaPenalizaceArg,
  PosunPoradiArg,
  SetVysledekArg,
  UpravaLogRadek,
  VysledekJizda,
  VysledekKolo,
  VysledekRadek,
  ZrusPenalizaciArg,
  ZaverStav,
  Zavod,
  ZavodInfo,
  ZavodUprava,
  Stav
} from '../shared/types'
import { getDb } from './db/connection'
import { runInTransaction } from './db/transaction'
import { parseSheets } from './excel'
import { aplikujRucniPoradi, spocitejJizdu, tiebreakPerKolo, type JizdaVstup, type Penalizace } from './scoring'
import {
  celkovePoradi,
  jeKvalifikovan,
  nasazFinaleZeSF,
  nasazSF,
  PRAH_SF
} from './zaver'

const JEZDEC_SLOUPCE =
  'id, kategorie_id, st_cislo, prijmeni, jmeno, znacka, model, rok_narozeni, los'

// Povolené sloupce pro inline editaci — chrání proti vložení cizího SQL přes
// název pole (hodnoty se vždy předávají přes parametr ?).
const EDITOVATELNA: JezdecPole[] = ['los', 'st_cislo', 'prijmeni', 'jmeno', 'znacka', 'model']

function isUniqueError(e: unknown): boolean {
  if (!(e instanceof Error)) return false
  // node:sqlite: errcode = extended SQLite result code.
  // SQLITE_CONSTRAINT_UNIQUE = 2067 (= SQLITE_CONSTRAINT 19 | 8<<8).
  // Záložně testujeme message — obsahuje 'UNIQUE constraint failed: ...'.
  const errcode = (e as { errcode?: number }).errcode
  if (errcode === 2067) return true
  return e.message.includes('UNIQUE constraint')
}

// ---- Nastavení (klíč/hodnota) ----

export function getNastaveni(klic: string): string | null {
  const row = getDb().prepare('SELECT hodnota FROM nastaveni WHERE klic = ?').get(klic) as
    | { hodnota: string }
    | undefined
  return row?.hodnota ?? null
}

export function setNastaveni(klic: string, hodnota: string): void {
  getDb()
    .prepare(
      'INSERT INTO nastaveni (klic, hodnota) VALUES (?, ?) ON CONFLICT(klic) DO UPDATE SET hodnota = excluded.hodnota'
    )
    .run(klic, hodnota)
}

export function deleteNastaveni(klic: string): void {
  getDb().prepare('DELETE FROM nastaveni WHERE klic = ?').run(klic)
}

/** Logo do hlavičky PDF (data URL), nebo null když není nahrané. */
export function getLogo(): string | null {
  return getNastaveni('logo')
}

/** Kořenová složka, kam se ukládají generovaná PDF (nebo null = nenastaveno). */
export function getPdfRoot(): string | null {
  return getNastaveni('pdf_root')
}
export function setPdfRoot(cesta: string): void {
  setNastaveni('pdf_root', cesta)
}

const ZAVOD_SLOUPCE = 'id, nazev, datum, misto, typ'

export function getZavodById(id: number): Zavod | null {
  const row = getDb()
    .prepare(`SELECT ${ZAVOD_SLOUPCE} FROM zavod WHERE id = ?`)
    .get(id) as unknown as Zavod | undefined
  return row ?? null
}

// Aktivní (právě otevřený) závod si pamatujeme v nastavení, ať přežije restart.
// Když není nastavený nebo zmizel, vezmeme první závod v DB.
export function getAktivniZavod(): Zavod | null {
  const ulozeny = getNastaveni('aktivni_zavod')
  if (ulozeny) {
    const z = getZavodById(Number(ulozeny))
    if (z) return z
  }
  const row = getDb()
    .prepare(`SELECT ${ZAVOD_SLOUPCE} FROM zavod ORDER BY id LIMIT 1`)
    .get() as unknown as Zavod | undefined
  return row ?? null
}

export function setAktivniZavod(id: number): void {
  setNastaveni('aktivni_zavod', String(id))
}

// Otevře závod (udělá ho aktivním) a vrátí ho.
export function openZavod(id: number): Zavod | null {
  const z = getZavodById(id)
  if (z) setAktivniZavod(id)
  return z
}

// Seznam všech závodů s počty kategorií a jezdců (pro úvodní obrazovku).
export function listZavody(): ZavodInfo[] {
  return getDb()
    .prepare(
      `SELECT z.id AS id, z.nazev AS nazev, z.datum AS datum, z.misto AS misto, z.typ AS typ,
              (SELECT COUNT(*) FROM kategorie k WHERE k.zavod_id = z.id) AS pocetKategorii,
              (SELECT COUNT(*) FROM jezdec j JOIN kategorie k ON k.id = j.kategorie_id
               WHERE k.zavod_id = z.id) AS pocetJezdcu
       FROM zavod z
       ORDER BY z.datum DESC, z.id DESC`
    )
    .all() as unknown as ZavodInfo[]
}

// Založí nový závod i s kategoriemi, nastaví ho jako aktivní a vrátí ho.
export function createZavod(data: NovyZavod): Zavod {
  const db = getDb()
  const typ = data.typ === 'RX' ? 'RX' : 'RAC'
  const id = runInTransaction(db, () => {
    const r = db
      .prepare('INSERT INTO zavod (nazev, datum, misto, typ) VALUES (?, ?, ?, ?)')
      .run(data.nazev.trim() || 'Nový závod', data.datum, data.misto.trim(), typ)
    const zavodId = Number(r.lastInsertRowid)
    const insKat = db.prepare('INSERT INTO kategorie (zavod_id, nazev, ruleset) VALUES (?, ?, ?)')
    for (const k of data.kategorie) {
      const nazev = k.nazev.trim()
      if (!nazev) continue
      insKat.run(zavodId, nazev, 'STANDARD')
    }
    return zavodId
  })
  setAktivniZavod(id)
  return getZavodById(id) as unknown as Zavod
}

// Srovná kategorie závodu s požadovaným seznamem (přidá nové, odebere chybějící).
function syncKategorie(zavodId: number, pozadovane: { nazev: string; ruleset: Ruleset }[]): void {
  const db = getDb()
  const zavod = getZavodById(zavodId)
  if (!zavod) return

  const normalizuj = (n: string): string => n.trim()
  const uniq: { nazev: string; ruleset: Ruleset }[] = []
  const videne = new Set<string>()
  for (const k of pozadovane) {
    const nazev = normalizuj(k.nazev)
    if (!nazev) continue
    const key = nazev.toLocaleLowerCase('cs')
    if (videne.has(key)) continue
    videne.add(key)
    uniq.push({ nazev, ruleset: 'STANDARD' })
  }

  const stavajici = listKategorie(zavodId)
  const pozadovaneKeys = new Set(uniq.map((k) => k.nazev.toLocaleLowerCase('cs')))

  runInTransaction(db, () => {
    for (const kat of stavajici) {
      if (!pozadovaneKeys.has(kat.nazev.toLocaleLowerCase('cs'))) {
        db.prepare('DELETE FROM kategorie WHERE id = ?').run(kat.id)
      }
    }
    const ins = db.prepare('INSERT INTO kategorie (zavod_id, nazev, ruleset) VALUES (?, ?, ?)')
    const existujiciKeys = new Set(stavajici.map((k) => k.nazev.toLocaleLowerCase('cs')))
    for (const k of uniq) {
      if (!existujiciKeys.has(k.nazev.toLocaleLowerCase('cs'))) {
        ins.run(zavodId, k.nazev, k.ruleset)
      }
    }
  })
}

export function updateZavod(uprava: ZavodUprava): Zavod {
  const db = getDb()
  runInTransaction(db, () => {
    db.prepare('UPDATE zavod SET nazev = ?, datum = ?, misto = ? WHERE id = ?')
      .run(uprava.nazev.trim() || 'Závod', uprava.datum, uprava.misto.trim(), uprava.id)
    if (uprava.kategorie) syncKategorie(uprava.id, uprava.kategorie)
  })
  return getZavodById(uprava.id) as unknown as Zavod
}

// Smaže závod; kaskáda v DB smaže kategorie, jezdce, kola, rošty i výsledky.
export function deleteZavod(id: number): void {
  getDb().prepare('DELETE FROM zavod WHERE id = ?').run(id)
}

export function listKategorie(zavodId: number): Kategorie[] {
  return getDb()
    .prepare(
      `SELECT k.id, k.zavod_id, k.nazev, k.ruleset,
              (SELECT COUNT(*) FROM jezdec j WHERE j.kategorie_id = k.id) AS pocet
       FROM kategorie k
       WHERE k.zavod_id = ?
       ORDER BY k.id`
    )
    .all(zavodId) as unknown as Kategorie[]
}

// Jedna kategorie podle id (i s číslem závodu) — bez počtu jezdců.
export function getKategorieById(
  id: number
): { id: number; zavod_id: number; nazev: string; ruleset: Ruleset } | null {
  const row = getDb()
    .prepare('SELECT id, zavod_id, nazev, ruleset FROM kategorie WHERE id = ?')
    .get(id) as { id: number; zavod_id: number; nazev: string; ruleset: Ruleset } | undefined
  return row ?? null
}

export function listJezdci(kategorieId: number): Jezdec[] {
  return getDb()
    .prepare(
      `SELECT ${JEZDEC_SLOUPCE} FROM jezdec
       WHERE kategorie_id = ?
       ORDER BY los IS NULL, los`
    )
    .all(kategorieId) as unknown as Jezdec[]
}

export function updateJezdec(uprava: JezdecUprava): Jezdec {
  if (!EDITOVATELNA.includes(uprava.pole)) {
    throw new Error(`Nepovolené pole: ${uprava.pole}`)
  }
  const db = getDb()

  // Los musí být v rámci kategorie unikátní (prázdný los je povolen).
  if (uprava.pole === 'los' && typeof uprava.hodnota === 'number') {
    const kat = db.prepare('SELECT kategorie_id FROM jezdec WHERE id = ?').get(uprava.id) as
      | { kategorie_id: number }
      | undefined
    if (kat) {
      const kolize = db
        .prepare('SELECT id FROM jezdec WHERE kategorie_id = ? AND los = ? AND id <> ?')
        .get(kat.kategorie_id, uprava.hodnota, uprava.id)
      if (kolize) throw new Error(`Los ${uprava.hodnota} už v této kategorii má jiný jezdec.`)
    }
  }

  try {
    db.prepare(`UPDATE jezdec SET ${uprava.pole} = ? WHERE id = ?`).run(uprava.hodnota, uprava.id)
  } catch (e) {
    if (uprava.pole === 'st_cislo' && isUniqueError(e)) {
      throw new Error(`Startovní číslo ${uprava.hodnota} už v této kategorii existuje.`)
    }
    throw e
  }
  return db.prepare(`SELECT ${JEZDEC_SLOUPCE} FROM jezdec WHERE id = ?`).get(uprava.id) as unknown as Jezdec
}

// Přidá prázdného jezdce do kategorie (startovní číslo doplní operátor inline).
export function addJezdec(kategorieId: number): Jezdec {
  const db = getDb()
  const r = db
    .prepare(
      `INSERT INTO jezdec (kategorie_id, st_cislo, prijmeni, jmeno, znacka, model)
       VALUES (?, NULL, '', '', '', '')`
    )
    .run(kategorieId)
  return db
    .prepare(`SELECT ${JEZDEC_SLOUPCE} FROM jezdec WHERE id = ?`)
    .get(Number(r.lastInsertRowid)) as unknown as Jezdec
}

export function deleteJezdec(id: number): void {
  getDb().prepare('DELETE FROM jezdec WHERE id = ?').run(id)
}

// Sestaví náhled importu: rozparsuje Excel a ke každému listu doplní, na kterou
// kategorii v aktivním závodě se mapuje a kolik startovních čísel už existuje.
export function buildImportPreview(soubor: string): ImportPreview {
  const db = getDb()
  const zavod = getAktivniZavod() // import míří do právě otevřeného závodu
  const cats = zavod
    ? (db.prepare('SELECT id, nazev FROM kategorie WHERE zavod_id = ?').all(zavod.id) as {
        id: number
        nazev: string
      }[])
    : []
  const catByName = new Map(cats.map((c) => [c.nazev, c.id]))

  const listy: ImportSheetPreview[] = parseSheets(soubor).map((s) => {
    const kategorieId = catByName.get(s.mappedNazev) ?? null
    let konflikty = 0
    if (kategorieId !== null) {
      const existing = new Set(
        (
          db
            .prepare('SELECT st_cislo FROM jezdec WHERE kategorie_id = ? AND st_cislo IS NOT NULL')
            .all(kategorieId) as { st_cislo: number }[]
        ).map((x) => x.st_cislo)
      )
      konflikty = s.jezdci.filter((j) => j.st_cislo !== null && existing.has(j.st_cislo)).length
    }

    // Duplicitní losy v rámci listu (jen vyplněné) — los musí být unikátní.
    const pocty = new Map<number, number>()
    for (const j of s.jezdci) {
      if (j.los !== null) pocty.set(j.los, (pocty.get(j.los) ?? 0) + 1)
    }
    const losKolize = [...pocty.entries()]
      .filter(([, c]) => c >= 2)
      .map(([los]) => los)
      .sort((a, b) => a - b)

    const bezLosu = s.jezdci.filter((j) => j.los === null).length

    return {
      sheet: s.sheet,
      mappedNazev: s.mappedNazev,
      kategorieId,
      pocet: s.jezdci.length,
      konflikty,
      losKolize,
      bezLosu,
      jezdci: s.jezdci
    }
  })

  return { soubor, listy }
}

// Zapíše naimportované jezdce. Při kolizi startovního čísla buď přepíše
// existujícího jezdce (overwrite), nebo ho přeskočí (skip).
export function importJezdci(commit: ImportCommit): ImportResult {
  const db = getDb()
  const najdi = db.prepare('SELECT id FROM jezdec WHERE kategorie_id = ? AND st_cislo = ?')
  const vloz = db.prepare(
    `INSERT INTO jezdec (kategorie_id, st_cislo, prijmeni, jmeno, znacka, model, rok_narozeni, los)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  )
  const prepis = db.prepare(
    `UPDATE jezdec SET prijmeni = ?, jmeno = ?, znacka = ?, model = ?, rok_narozeni = ?, los = ?
     WHERE id = ?`
  )

  let vlozeno = 0
  let prepsano = 0
  let preskoceno = 0

  runInTransaction(db, () => {
    for (const list of commit.listy) {
      for (const j of list.jezdci) {
        const existing =
          j.st_cislo !== null
            ? (najdi.get(list.kategorieId, j.st_cislo) as { id: number } | undefined)
            : undefined
        if (existing) {
          if (commit.policy === 'overwrite') {
            prepis.run(j.prijmeni, j.jmeno, j.znacka, j.model, j.rok_narozeni, j.los, existing.id)
            prepsano++
          } else {
            preskoceno++
          }
        } else {
          vloz.run(
            list.kategorieId,
            j.st_cislo,
            j.prijmeni,
            j.jmeno,
            j.znacka,
            j.model,
            j.rok_narozeni,
            j.los
          )
          vlozeno++
        }
      }
    }
  })

  return { vlozeno, prepsano, preskoceno }
}

// =====================================================================
// Rošty / Výsledky / Klasifikace
// =====================================================================

type Db = ReturnType<typeof getDb>

const JEZDEC_COLS_J =
  'j.id AS id, j.kategorie_id AS kategorie_id, j.st_cislo AS st_cislo, j.prijmeni AS prijmeni, j.jmeno AS jmeno, j.znacka AS znacka, j.model AS model, j.rok_narozeni AS rok_narozeni, j.los AS los'

const MAX_NA_JIZDU = 8

function koloPoradi(typ: KoloTyp): number {
  return { Q1: 1, Q2: 2, Q3: 3, SF: 4, F: 5 }[typ] ?? 5
}

function jezdecZRadku(r: Record<string, unknown>): Jezdec {
  return {
    id: r.id as number,
    kategorie_id: r.kategorie_id as number,
    st_cislo: (r.st_cislo as number | null) ?? null,
    prijmeni: r.prijmeni as string,
    jmeno: r.jmeno as string,
    znacka: r.znacka as string,
    model: r.model as string,
    rok_narozeni: (r.rok_narozeni as number | null) ?? null,
    los: (r.los as number | null) ?? null
  }
}

// Zajistí kolo. Nové kolo dostane výchozí vyrovnaný počet jízd; u existujícího
// počet jízd PONECHÁME (operátor ho mohl ručně změnit), jen doplníme na
// kapacitní minimum (strop 8/jízda), kdyby přibyli jezdci. Vrátí id kola.
function ensureKolo(db: Db, kategorieId: number, typ: KoloTyp): number {
  const pocet = (
    db.prepare('SELECT COUNT(*) AS n FROM jezdec WHERE kategorie_id = ?').get(kategorieId) as {
      n: number
    }
  ).n
  const kolo = db.prepare('SELECT id FROM kolo WHERE kategorie_id = ? AND typ = ?').get(
    kategorieId,
    typ
  ) as { id: number } | undefined

  // Jen kvalifikace (Q) mají počet jízd odvozený od počtu jezdců. SF/finále si
  // jízdy vytvoří generování (nasazení), tady je neřešíme.
  const jeQ = typ === 'Q1' || typ === 'Q2' || typ === 'Q3'

  if (kolo) {
    if (jeQ) {
      const min = Math.max(1, Math.ceil(pocet / MAX_NA_JIZDU))
      const mam = (
        db.prepare('SELECT COUNT(*) AS n FROM jizda WHERE kolo_id = ?').get(kolo.id) as { n: number }
      ).n
      const ins = db.prepare('INSERT INTO jizda (kolo_id, cislo) VALUES (?, ?)')
      for (let c = mam + 1; c <= min; c++) ins.run(kolo.id, c)
    }
    return kolo.id
  }

  const r = db
    .prepare('INSERT INTO kolo (kategorie_id, typ, poradi) VALUES (?, ?, ?)')
    .run(kategorieId, typ, koloPoradi(typ))
  const koloId = Number(r.lastInsertRowid)
  if (jeQ) {
    const ins = db.prepare('INSERT INTO jizda (kolo_id, cislo) VALUES (?, ?)')
    for (let c = 1; c <= pocetJizd(pocet); c++) ins.run(koloId, c)
  }
  return koloId
}

export function getRosty(kategorieId: number, typ: KoloTyp): RostKolo {
  const db = getDb()
  const koloId = ensureKolo(db, kategorieId, typ)
  const jizdy = db
    .prepare('SELECT id, cislo FROM jizda WHERE kolo_id = ? ORDER BY cislo')
    .all(koloId) as { id: number; cislo: number }[]

  // Kolik pozic ukázat na jízdu: Q/SF mají strop 8, finále podle nastavené
  // velikosti finále (8 nebo 10) — ať jsou u finále o 10 vidět i pozice 9 a 10.
  const jeFinale = typ === 'F'
  const cap = jeFinale
    ? (
        db.prepare('SELECT finale_velikost FROM kategorie WHERE id = ?').get(kategorieId) as {
          finale_velikost: number
        }
      ).finale_velikost
    : MAX_NA_JIZDU

  const selPoz = db.prepare(
    `SELECT rp.pozice AS pozice, ${JEZDEC_COLS_J}
     FROM rost_pozice rp JOIN jezdec j ON j.id = rp.jezdec_id
     WHERE rp.jizda_id = ?`
  )

  return {
    koloId,
    jizdy: jizdy.map((jz) => {
      const rows = selPoz.all(jz.id) as (Record<string, unknown> & { pozice: number })[]
      const byPoz = new Map(rows.map((r) => [r.pozice, r]))
      // Aspoň `cap` pozic, a kdyby ručně přibyla vyšší pozice, ukaž i ji.
      const nejvyssi = rows.reduce((m, r) => Math.max(m, r.pozice), 0)
      const pocetSlotu = Math.max(cap, nejvyssi)
      const sloty: RostSlot[] = []
      for (let p = 1; p <= pocetSlotu; p++) {
        const r = byPoz.get(p)
        sloty.push({ pozice: p, jezdec: r ? jezdecZRadku(r) : null })
      }
      return { id: jz.id, cislo: jz.cislo, sloty }
    })
  }
}

export function setRostSlot(
  jizdaId: number,
  pozice: number,
  st_cislo: number | null
): SetRostResult {
  const db = getDb()
  const meta = db
    .prepare('SELECT k.kategorie_id AS kategorie_id FROM jizda jz JOIN kolo k ON k.id = jz.kolo_id WHERE jz.id = ?')
    .get(jizdaId) as { kategorie_id: number } | undefined
  if (!meta) throw new Error('Jízda neexistuje')

  if (st_cislo === null) {
    db.prepare('DELETE FROM rost_pozice WHERE jizda_id = ? AND pozice = ?').run(jizdaId, pozice)
    return { ok: true, jezdec: null }
  }

  const jezdec = db
    .prepare(`SELECT ${JEZDEC_SLOUPCE} FROM jezdec WHERE kategorie_id = ? AND st_cislo = ?`)
    .get(meta.kategorie_id, st_cislo) as unknown as Jezdec | undefined
  if (!jezdec) return { ok: false, jezdec: null }

  // Jeden jezdec nesmí být v téže jízdě na dvou pozicích.
  const dup = db
    .prepare('SELECT 1 FROM rost_pozice WHERE jizda_id = ? AND jezdec_id = ? AND pozice <> ?')
    .get(jizdaId, jezdec.id, pozice)
  if (dup) return { ok: false, jezdec: null, duplicitni: true }

  runInTransaction(db, () => {
    db.prepare('DELETE FROM rost_pozice WHERE jizda_id = ? AND pozice = ?').run(jizdaId, pozice)
    db.prepare('INSERT INTO rost_pozice (jizda_id, pozice, jezdec_id) VALUES (?, ?, ?)').run(
      jizdaId,
      pozice,
      jezdec.id
    )
  })

  return { ok: true, jezdec }
}

// Je v daném roštu (kole) už nějaký jezdec?
function rostObsazen(db: Db, kategorieId: number, typ: KoloTyp): boolean {
  const kolo = db.prepare('SELECT id FROM kolo WHERE kategorie_id = ? AND typ = ?').get(
    kategorieId,
    typ
  ) as { id: number } | undefined
  if (!kolo) return false
  const c = db
    .prepare(
      'SELECT COUNT(*) AS n FROM rost_pozice rp JOIN jizda jz ON jz.id = rp.jizda_id WHERE jz.kolo_id = ?'
    )
    .get(kolo.id) as { n: number }
  return c.n > 0
}

// Sekundární klíč: startovní číslo (chybějící až nakonec) — kvůli determinismu.
function porovnejCislo(a: Jezdec, b: Jezdec): number {
  return (a.st_cislo ?? Number.POSITIVE_INFINITY) - (b.st_cislo ?? Number.POSITIVE_INFINITY)
}

// Porovnání podle losu. Jezdci BEZ losu jdou vždy ZA ty s losem; při shodě
// (i mezi bezlosými) rozhoduje startovní číslo.
function porovnejLos(a: Jezdec, b: Jezdec, vzestupne: boolean): number {
  if (a.los === null && b.los === null) return porovnejCislo(a, b)
  if (a.los === null) return 1
  if (b.los === null) return -1
  if (a.los !== b.los) return vzestupne ? a.los - b.los : b.los - a.los
  return porovnejCislo(a, b)
}

// Rovnoměrné velikosti skupin: N jezdců do `h` jízd (zbytek do prvních jízd).
// Příklady: 9,2→[5,4] · 17,3→[6,6,5] · 15,3→[5,5,5].
function rovneVelikosti(n: number, h: number): number[] {
  const base = Math.floor(n / h)
  const rem = n % h
  return Array.from({ length: h }, (_, i) => base + (i < rem ? 1 : 0))
}

// Výchozí (vyrovnaný) počet jízd dle reálných pravidel:
// ceil(N/8), ale když by tak vznikla „nečistá" jízda s 8 a N není násobek 8,
// přidá jízdu navíc. (15→3 ⇒ 5+5+5, ale 16→2 ⇒ 8+8.)
function pocetJizd(n: number): number {
  if (n <= MAX_NA_JIZDU) return 1
  let h = Math.ceil(n / MAX_NA_JIZDU)
  if (n % MAX_NA_JIZDU !== 0 && Math.ceil(n / h) === MAX_NA_JIZDU) h += 1
  return h
}

// =====================================================================
// Fixní skupiny — jen ruleset SOTOLINA (CLAUDE.md §6, Šotolina Cup)
// =====================================================================
// V Šotolině jezdí stejní jezdci spolu napříč Q1–Q3 (skupina A jede spolu
// v Q1, Q2 i Q3). Skupiny se vytvoří při zápisu Q1 a propojí s jízdami přes
// `jizda.skupina_id`. Q2/Q3 pak generujeme v rámci těchto skupin.

interface SkupinaInfo {
  id: number
  nazev: string
}

function listSkupiny(db: Db, kategorieId: number): SkupinaInfo[] {
  return db
    .prepare('SELECT id, nazev FROM skupina WHERE kategorie_id = ? ORDER BY id')
    .all(kategorieId) as unknown as SkupinaInfo[]
}

// Idempotentně doplní chybějící skupiny na požadovaný počet (A, B, C…).
// Existující nikdy neruší — uživatel by tak přišel o jezdce v Q2/Q3.
function ensureSkupiny(db: Db, kategorieId: number, pocet: number): SkupinaInfo[] {
  const stav = listSkupiny(db, kategorieId)
  if (stav.length >= pocet) return stav
  const ins = db.prepare('INSERT INTO skupina (kategorie_id, nazev) VALUES (?, ?)')
  const out = stav.slice()
  for (let i = stav.length; i < pocet; i++) {
    const nazev = String.fromCharCode(65 + i) // A, B, C…
    const r = ins.run(kategorieId, nazev)
    out.push({ id: Number(r.lastInsertRowid), nazev })
  }
  return out
}

// Vrátí jízdy Q1 pro STANDARD kategorii: pole polí jezdců (v pořadí pozice).
// Používá se pro Q2 seeding — skupiny z Q1 se zachovají, jen obrátí pořadí.
function q1JizdyStandard(db: Db, kategorieId: number): Jezdec[][] {
  const rows = db
    .prepare(
      `SELECT jz.cislo AS jizda_cislo, rp.pozice AS pozice, ${JEZDEC_COLS_J}
       FROM jizda jz
       JOIN kolo k ON k.id = jz.kolo_id
       JOIN rost_pozice rp ON rp.jizda_id = jz.id
       JOIN jezdec j ON j.id = rp.jezdec_id
       WHERE k.kategorie_id = ? AND k.typ = 'Q1'
       ORDER BY jz.cislo, rp.pozice`
    )
    .all(kategorieId) as (Record<string, unknown> & { jizda_cislo: number })[]
  const mapa = new Map<number, Jezdec[]>()
  for (const r of rows) {
    const c = r.jizda_cislo
    if (!mapa.has(c)) mapa.set(c, [])
    mapa.get(c)!.push(jezdecZRadku(r))
  }
  return [...mapa.entries()].sort((a, b) => a[0] - b[0]).map(([, jezdci]) => jezdci)
}

// Kdo je v dané skupině podle Q1 roštu (Q1 určuje, kdo s kým jezdí).
function jezdciVeSkupineQ1(db: Db, kategorieId: number, skupinaId: number): Jezdec[] {
  const rows = db
    .prepare(
      `SELECT ${JEZDEC_COLS_J}
       FROM jizda jz
       JOIN kolo k ON k.id = jz.kolo_id
       JOIN rost_pozice rp ON rp.jizda_id = jz.id
       JOIN jezdec j ON j.id = rp.jezdec_id
       WHERE jz.skupina_id = ? AND k.kategorie_id = ? AND k.typ = 'Q1'
       ORDER BY rp.pozice`
    )
    .all(skupinaId, kategorieId) as unknown as Record<string, unknown>[]
  return rows.map(jezdecZRadku)
}

// Navrhne rošt podle pravidel §6 (RAC Race / RX Cup).
// Bez zápisu — vrací jen náhled.
export function navrhniRost(
  kategorieId: number,
  typ: KoloTyp,
  pozadovanyPocet?: number
): RostNavrh {
  const db = getDb()
  const prazdny = { pocetJizd: 0, minJizd: 0, maxJizd: 0 }
  // Jezdci bez losu neprojeli přejímkou — do roštů nevstupují.
  const jezdci = listJezdci(kategorieId).filter((j) => j.los !== null)
  if (jezdci.length === 0) {
    return {
      ok: false,
      chyba: 'V kategorii nejsou žádní jezdci s přiděleným losem.',
      obsazeno: false,
      jizdy: [],
      ...prazdny
    }
  }
  const obsazeno = rostObsazen(db, kategorieId, typ)

  // 1) Seřazení podle kritéria daného kolem.
  let sorted: Jezdec[]
  let reverseGrouping: boolean // true = nejhorší skupina do 1. jízdy (Q3)

  if (typ === 'Q1') {
    sorted = [...jezdci].sort((a, b) => porovnejLos(a, b, true))
    reverseGrouping = false
  } else if (typ === 'Q2') {
    // Q2: zachovat skupiny z Q1, obrátit pořadí jízd i jezdců uvnitř každé skupiny.
    // (Q1 jízda N → Q2 jízda 1, jezdci v ní v obráceném pořadí.)
    const q1Skupiny = q1JizdyStandard(db, kategorieId)
    if (q1Skupiny.length === 0) {
      return {
        ok: false,
        chyba: 'Nejdřív nasaď Q1 rošt.',
        obsazeno,
        jizdy: [],
        ...prazdny
      }
    }
    const reversedGroups = [...q1Skupiny].reverse()
    const jizdy: RostNavrhJizda[] = reversedGroups.map((skupina, i) => ({
      cislo: i + 1,
      jezdci: [...skupina].reverse()
    }))
    const h = jizdy.length
    return { ok: true, chyba: null, obsazeno, jizdy, pocetJizd: h, minJizd: h, maxJizd: h }
  } else if (typ === 'Q3') {
    const klas = getKlasifikace(kategorieId, ['Q1', 'Q2'])
    const maData = klas.some((r) => r.celkem !== 0)
    if (klas.length === 0 || !maData) {
      return {
        ok: false,
        chyba: 'Nejdřív zadej výsledky Q1 a Q2 — klasifikace po Q2 je zatím prázdná.',
        obsazeno,
        jizdy: [],
        ...prazdny
      }
    }
    const poradi = new Map(klas.map((r, i) => [r.jezdec_id, i]))
    sorted = [...jezdci].sort((a, b) => {
      const pa = poradi.has(a.id) ? (poradi.get(a.id) as number) : Number.POSITIVE_INFINITY
      const pb = poradi.has(b.id) ? (poradi.get(b.id) as number) : Number.POSITIVE_INFINITY
      if (pa !== pb) return pa - pb
      // jezdci mimo klasifikaci (bez výsledků) → dle losu (bezlosí nakonec), pak čísla
      return porovnejLos(a, b, true)
    })
    reverseGrouping = true
  } else {
    return { ok: false, chyba: 'Generování zatím jen pro Q1–Q3.', obsazeno, jizdy: [], ...prazdny }
  }

  // 2) Počet jízd: výchozí vyrovnaný, nebo ruční volba (osekaná na rozsah).
  const n = sorted.length
  const minJizd = Math.max(1, Math.ceil(n / MAX_NA_JIZDU)) // strop 8 na jízdu
  const maxJizd = Math.max(1, n) // až 1 jezdec na jízdu
  const h = Math.min(maxJizd, Math.max(minJizd, pozadovanyPocet ?? pocetJizd(n)))

  // 3) Rozdělení do jízd rovnoměrně.
  const sizes = rovneVelikosti(n, h)
  const bloky: Jezdec[][] = []
  let idx = 0
  for (const s of sizes) {
    bloky.push(sorted.slice(idx, idx + s))
    idx += s
  }

  // 4) Přiřazení bloků jízdám. Q3 obráceně (nejlepší blok do poslední jízdy).
  const jizdy: RostNavrhJizda[] = []
  for (let i = 0; i < h; i++) {
    const blok = reverseGrouping ? bloky[h - 1 - i] : bloky[i]
    jizdy.push({ cislo: i + 1, jezdci: blok })
  }

  return { ok: true, chyba: null, obsazeno, jizdy, pocetJizd: h, minJizd, maxJizd }
}

// Zapíše vygenerovaný rošt: srovná počet jízd na požadovaný, vymaže staré
// rozsazení a uloží nové. (Počet jízd si tak operátor může ručně nastavit.)
export function zapisRost(kategorieId: number, typ: KoloTyp, jizdy: RostZapisJizda[]): RostKolo {
  const db = getDb()
  const koloId = ensureKolo(db, kategorieId, typ)
  const potreba = Math.max(1, jizdy.length)

  runInTransaction(db, () => {
    const mam = (
      db.prepare('SELECT COUNT(*) AS n FROM jizda WHERE kolo_id = ?').get(koloId) as { n: number }
    ).n
    // doplň chybějící jízdy a zruš přebytečné (kaskáda smaže i jejich data)
    const ins = db.prepare('INSERT INTO jizda (kolo_id, cislo) VALUES (?, ?)')
    for (let c = mam + 1; c <= potreba; c++) ins.run(koloId, c)
    db.prepare('DELETE FROM jizda WHERE kolo_id = ? AND cislo > ?').run(koloId, potreba)

    const jizdyDb = db
      .prepare('SELECT id, cislo FROM jizda WHERE kolo_id = ? ORDER BY cislo')
      .all(koloId) as { id: number; cislo: number }[]
    const byCislo = new Map(jizdyDb.map((j) => [j.cislo, j.id]))

    for (const j of jizdyDb) db.prepare('DELETE FROM rost_pozice WHERE jizda_id = ?').run(j.id)
    const insP = db.prepare('INSERT INTO rost_pozice (jizda_id, pozice, jezdec_id) VALUES (?, ?, ?)')
    for (const jz of jizdy) {
      const jizdaId = byCislo.get(jz.cislo)
      if (jizdaId === undefined) continue
      // finále má až 10 míst v jedné jízdě, proto neořezáváme na 8
      jz.jezdecIds.slice(0, 16).forEach((jid, i) => insP.run(jizdaId, i + 1, jid))
    }
  })

  return getRosty(kategorieId, typ)
}

function rulesetKategorie(db: Db, kategorieId: number): Ruleset {
  return (db.prepare('SELECT ruleset FROM kategorie WHERE id = ?').get(kategorieId) as {
    ruleset: Ruleset
  }).ruleset
}

type Bodovani = { bodyZaPozici: (p: number) => number; penalizace: Penalizace }
// zebricek a pravidla jsou read-only po inicializaci DB → cache platí po celý běh aplikace.
const bodovaniCache = new Map<Ruleset, Bodovani>()

// Načte žebříček a penalizace pro daný ruleset (z tabulek zebricek/pravidla).
function nactiBodovani(db: Db, ruleset: Ruleset): Bodovani {
  const cached = bodovaniCache.get(ruleset)
  if (cached) return cached

  const zRows = db.prepare('SELECT poradi, body FROM zebricek WHERE ruleset = ?').all(ruleset) as {
    poradi: number
    body: number
  }[]
  const zMap = new Map(zRows.map((r) => [r.poradi, r.body]))
  const pr = db
    .prepare(
      'SELECT dnf_offset, dns_offset, dq_offset, dnf_body, dns_body, dq_body FROM pravidla WHERE ruleset = ?'
    )
    .get(ruleset) as unknown as Penalizace | undefined
  const result: Bodovani = {
    bodyZaPozici: (p: number) => zMap.get(p) ?? 0,
    penalizace: pr ?? {
      dnf_offset: null,
      dns_offset: null,
      dq_offset: null,
      dnf_body: null,
      dns_body: null,
      dq_body: null
    }
  }
  bodovaniCache.set(ruleset, result)
  return result
}

/** Automatická body jezdce v jízdě (bez `body_rucni` — čistý výpočet z času/stavu). */
function vypocetAutoBodyJezdce(
  db: Db,
  jizdaId: number,
  jezdecId: number,
  bodyZaPozici: (p: number) => number,
  penalizace: Penalizace
): number | null {
  const rows = db
    .prepare(
      'SELECT jezdec_id, namereny_cas_ms, penalizace_ms, stav FROM vysledek WHERE jizda_id = ?'
    )
    .all(jizdaId) as {
    jezdec_id: number
    namereny_cas_ms: number | null
    penalizace_ms: number
    stav: JizdaVstup['stav']
  }[]
  const vstupy: JizdaVstup[] = rows.map((r) => ({
    jezdec_id: r.jezdec_id,
    cas_ms: r.namereny_cas_ms === null ? null : r.namereny_cas_ms + (r.penalizace_ms ?? 0),
    stav: r.stav
  }))
  const vysl = spocitejJizdu(vstupy, bodyZaPozici, penalizace)
  return vysl.find((v) => v.jezdec_id === jezdecId)?.body ?? null
}

// Přepočítá pořadí a body celé jízdy a uloží je do databáze.
function prepoctiJizdu(
  db: Db,
  jizdaId: number,
  bodyZaPozici: (p: number) => number,
  penalizace: Penalizace
): void {
  const rows = db
    .prepare(
      `SELECT jezdec_id, namereny_cas_ms, penalizace_ms, stav, body_rucni, rucni_poradi
       FROM vysledek WHERE jizda_id = ?`
    )
    .all(jizdaId) as {
    jezdec_id: number
    namereny_cas_ms: number | null
    penalizace_ms: number
    stav: JizdaVstup['stav']
    body_rucni: number | null
    rucni_poradi: number | null
  }[]

  const vstupy: JizdaVstup[] = rows.map((r) => ({
    jezdec_id: r.jezdec_id,
    cas_ms: r.namereny_cas_ms === null ? null : r.namereny_cas_ms + (r.penalizace_ms ?? 0),
    stav: r.stav
  }))
  const override = new Map(rows.map((r) => [r.jezdec_id, r.body_rucni]))
  const rucniPoradi = new Map<number, number>()
  const stavByJezdec = new Map<number, JizdaVstup['stav']>()
  const casByJezdec = new Map<number, number | null>()
  for (const r of rows) {
    stavByJezdec.set(r.jezdec_id, r.stav)
    casByJezdec.set(
      r.jezdec_id,
      r.namereny_cas_ms === null ? null : r.namereny_cas_ms + (r.penalizace_ms ?? 0)
    )
    if (r.rucni_poradi != null) rucniPoradi.set(r.jezdec_id, r.rucni_poradi)
  }

  let vysl = spocitejJizdu(vstupy, bodyZaPozici, penalizace)
  if (rucniPoradi.size > 0) {
    vysl = aplikujRucniPoradi(
      vysl,
      stavByJezdec,
      casByJezdec,
      rucniPoradi,
      bodyZaPozici,
      penalizace
    )
  }
  const upd = db.prepare('UPDATE vysledek SET poradi = ?, body = ? WHERE jizda_id = ? AND jezdec_id = ?')
  runInTransaction(db, () => {
    for (const v of vysl) {
      // Ruční override má přednost — uloží se jako finální `body` (klasifikace
      // čte právě tento sloupec, takže se upravené body promítnou všude).
      const rucni = override.get(v.jezdec_id)
      const finalBody = rucni !== null && rucni !== undefined ? rucni : v.body
      upd.run(v.poradi, finalBody, jizdaId, v.jezdec_id)
    }
  })
}

function nactiJizdu(db: Db, jizdaId: number, cislo: number): VysledekJizda {
  const vysledky = db
    .prepare(
      `SELECT v.id AS vysledek_id, v.jezdec_id AS jezdec_id, j.st_cislo AS st_cislo,
              j.prijmeni AS prijmeni, j.jmeno AS jmeno, j.znacka AS znacka, j.model AS model,
              v.namereny_cas_ms AS namereny_cas_ms,
              COALESCE(v.penalizace_ms, 0) AS penalizace_ms,
              v.stav AS stav, v.poradi AS poradi, v.body AS body,
              v.body_rucni AS body_rucni, v.rucni_poradi AS rucni_poradi,
              ul.typ AS uprava_typ, ul.hodnota AS uprava_hodnota,
              ul.duvod AS uprava_duvod, ul.kdy AS uprava_kdy
       FROM vysledek v
       JOIN jezdec j ON j.id = v.jezdec_id
       LEFT JOIN uprava_log ul ON ul.id = (
         SELECT id FROM uprava_log WHERE vysledek_id = v.id ORDER BY kdy DESC LIMIT 1
       )
       WHERE v.jizda_id = ?
       ORDER BY (v.poradi IS NULL), v.poradi`
    )
    .all(jizdaId) as unknown as VysledekRadek[]
  return { id: jizdaId, cislo, vysledky }
}

function ensureVysledekRow(db: Db, jizdaId: number, jezdecId: number): number {
  db.prepare(
    `INSERT OR IGNORE INTO vysledek (jizda_id, jezdec_id, penalizace_ms, stav) VALUES (?, ?, 0, 'OK')`
  ).run(jizdaId, jezdecId)
  const row = db
    .prepare('SELECT id FROM vysledek WHERE jizda_id = ? AND jezdec_id = ?')
    .get(jizdaId, jezdecId) as { id: number } | undefined
  if (!row) throw new Error('Výsledek neexistuje')
  return row.id
}

function zapisUpravaLog(
  db: Db,
  vysledekId: number,
  typ: 'CASOVA_PENALIZACE' | 'BODOVA_PENALIZACE' | 'POSUN_PORADI' | 'ZRUSENI',
  hodnota: number | null,
  duvod: string
): void {
  db.prepare(
    `INSERT INTO uprava_log (vysledek_id, typ, hodnota, duvod, rozhodl, kdy)
     VALUES (?, ?, ?, ?, 'ředitel', ?)`
  ).run(vysledekId, typ, hodnota, duvod.trim(), new Date().toISOString())
}

function jizdaMeta(
  db: Db,
  jizdaId: number
): { kategorie_id: number; cislo: number } {
  const meta = db
    .prepare(
      `SELECT k.kategorie_id AS kategorie_id, jz.cislo AS cislo
       FROM jizda jz JOIN kolo k ON k.id = jz.kolo_id WHERE jz.id = ?`
    )
    .get(jizdaId) as { kategorie_id: number; cislo: number } | undefined
  if (!meta) throw new Error('Jízda neexistuje')
  return meta
}

export function getVysledky(kategorieId: number, typ: KoloTyp): VysledekKolo {
  const db = getDb()
  const koloId = ensureKolo(db, kategorieId, typ)
  const jizdy = db
    .prepare('SELECT id, cislo FROM jizda WHERE kolo_id = ? ORDER BY cislo')
    .all(koloId) as { id: number; cislo: number }[]

  // Sesynchronizuj výsledkové řádky s rošty: smaž jezdce, co už v jízdě nejsou,
  // a doplň prázdné řádky pro ty, kdo přibyli.
  const clean = db.prepare(
    'DELETE FROM vysledek WHERE jizda_id = ? AND jezdec_id NOT IN (SELECT jezdec_id FROM rost_pozice WHERE jizda_id = ?)'
  )
  const ensure = db.prepare(
    `INSERT OR IGNORE INTO vysledek (jizda_id, jezdec_id, penalizace_ms, stav) VALUES (?, ?, 0, 'OK')`
  )
  const selPoz = db.prepare('SELECT jezdec_id FROM rost_pozice WHERE jizda_id = ?')
  const { bodyZaPozici, penalizace } = nactiBodovani(db, rulesetKategorie(db, kategorieId))

  // Sync roštu s výsledky + podmíněný přepočet bodů v jediné transakci.
  // prepoctiJizdu se volá jen když se roster skutečně změnil (přibyl/ubyl jezdec);
  // při prostém čtení výsledků (obvyklý případ) přepočet přeskočíme.
  const jizdyData = runInTransaction(db, () => {
    return jizdy.map((jz) => {
      const deleted = Number(clean.run(jz.id, jz.id).changes) > 0
      let added = false
      for (const p of selPoz.all(jz.id) as { jezdec_id: number }[]) {
        if (Number(ensure.run(jz.id, p.jezdec_id).changes) > 0) added = true
      }
      if (deleted || added) prepoctiJizdu(db, jz.id, bodyZaPozici, penalizace)
      return nactiJizdu(db, jz.id, jz.cislo)
    })
  })

  return { koloId, jizdy: jizdyData }
}

export function setVysledek(arg: SetVysledekArg): VysledekJizda {
  const db = getDb()
  const meta = db
    .prepare(
      `SELECT k.kategorie_id AS kategorie_id, k.id AS kolo_id, jz.cislo AS cislo
       FROM jizda jz JOIN kolo k ON k.id = jz.kolo_id WHERE jz.id = ?`
    )
    .get(arg.jizdaId) as { kategorie_id: number; cislo: number } | undefined
  if (!meta) throw new Error('Jízda neexistuje')

  runInTransaction(db, () => {
    db.prepare(
      `INSERT OR IGNORE INTO vysledek (jizda_id, jezdec_id, penalizace_ms, stav) VALUES (?, ?, 0, 'OK')`
    ).run(arg.jizdaId, arg.jezdecId)
    if (arg.cas_ms !== undefined) {
      // Zadání času znamená, že jezdec dojel (stav OK).
      db.prepare(`UPDATE vysledek SET namereny_cas_ms = ?, stav = 'OK' WHERE jizda_id = ? AND jezdec_id = ?`).run(
        arg.cas_ms,
        arg.jizdaId,
        arg.jezdecId
      )
    } else if (arg.stav !== undefined) {
      // Měníme jen stav. Naměřený čas SCHOVÁVÁME (nezahazujeme) — pro tooltip
      // a pro návrat zpět na čas (CLAUDE.md §11: namereny_cas_ms se nepřepisuje).
      // Pro bodování stejně rozhoduje stav, ne čas (viz scoring.ts).
      db.prepare('UPDATE vysledek SET stav = ? WHERE jizda_id = ? AND jezdec_id = ?').run(
        arg.stav,
        arg.jizdaId,
        arg.jezdecId
      )
    }
  })

  const { bodyZaPozici, penalizace } = nactiBodovani(db, rulesetKategorie(db, meta.kategorie_id))
  prepoctiJizdu(db, arg.jizdaId, bodyZaPozici, penalizace)
  return nactiJizdu(db, arg.jizdaId, meta.cislo)
}

// Ruční přepis bodů. body = null zruší override (návrat k automatu). Přepočet
// pak zapíše do vysledek.body finální hodnotu (override má přednost).
export function setBodyOverride(
  jizdaId: number,
  jezdecId: number,
  body: number | null
): VysledekJizda {
  const db = getDb()
  const meta = db
    .prepare(
      `SELECT k.kategorie_id AS kategorie_id, jz.cislo AS cislo
       FROM jizda jz JOIN kolo k ON k.id = jz.kolo_id WHERE jz.id = ?`
    )
    .get(jizdaId) as { kategorie_id: number; cislo: number } | undefined
  if (!meta) throw new Error('Jízda neexistuje')

  db.prepare(
    `INSERT OR IGNORE INTO vysledek (jizda_id, jezdec_id, penalizace_ms, stav) VALUES (?, ?, 0, 'OK')`
  ).run(jizdaId, jezdecId)
  db.prepare('UPDATE vysledek SET body_rucni = ? WHERE jizda_id = ? AND jezdec_id = ?').run(
    body,
    jizdaId,
    jezdecId
  )

  const { bodyZaPozici, penalizace } = nactiBodovani(db, rulesetKategorie(db, meta.kategorie_id))
  prepoctiJizdu(db, jizdaId, bodyZaPozici, penalizace)
  return nactiJizdu(db, jizdaId, meta.cislo)
}

/** Časová penalizace ředitele — celková hodnota v sekundách, přepočet jízdy. */
export function setCasovaPenalizace(arg: CasovaPenalizaceArg): VysledekJizda {
  const duvod = arg.duvod.trim()
  if (!duvod) throw new Error('Důvod penalizace je povinný')
  if (!Number.isFinite(arg.sekundy) || arg.sekundy < 0) {
    throw new Error('Penalizace musí být nezáporné číslo sekund')
  }

  const db = getDb()
  const meta = jizdaMeta(db, arg.jizdaId)
  const vysledekId = ensureVysledekRow(db, arg.jizdaId, arg.jezdecId)
  const penalizaceMs = Math.round(arg.sekundy * 1000)

  runInTransaction(db, () => {
    db.prepare('UPDATE vysledek SET penalizace_ms = ? WHERE id = ?').run(penalizaceMs, vysledekId)
    zapisUpravaLog(db, vysledekId, 'CASOVA_PENALIZACE', penalizaceMs, duvod)
  })

  const { bodyZaPozici, penalizace } = nactiBodovani(db, rulesetKategorie(db, meta.kategorie_id))
  prepoctiJizdu(db, arg.jizdaId, bodyZaPozici, penalizace)
  return nactiJizdu(db, arg.jizdaId, meta.cislo)
}

/** Automatická body jezdce v jízdě (pro dialog bodové penalizace). */
export function getAutoBodyJizdy(jizdaId: number, jezdecId: number): number | null {
  const db = getDb()
  const meta = jizdaMeta(db, jizdaId)
  const { bodyZaPozici, penalizace } = nactiBodovani(db, rulesetKategorie(db, meta.kategorie_id))
  ensureVysledekRow(db, jizdaId, jezdecId)
  return vypocetAutoBodyJezdce(db, jizdaId, jezdecId, bodyZaPozici, penalizace)
}

/** Bodová penalizace ředitele — delta vůči automatickým bodům, nezávisle na čase. */
export function setBodovaPenalizace(arg: BodovaPenalizaceArg): VysledekJizda {
  const duvod = arg.duvod.trim()
  if (!duvod) throw new Error('Důvod penalizace je povinný')
  if (!Number.isFinite(arg.delta)) throw new Error('Zadej platnou úpravu bodů (např. −5)')

  const db = getDb()
  const meta = jizdaMeta(db, arg.jizdaId)
  const vysledekId = ensureVysledekRow(db, arg.jizdaId, arg.jezdecId)
  const { bodyZaPozici, penalizace } = nactiBodovani(db, rulesetKategorie(db, meta.kategorie_id))
  const auto = vypocetAutoBodyJezdce(db, arg.jizdaId, arg.jezdecId, bodyZaPozici, penalizace)
  if (auto === null) {
    throw new Error('Jezdec nemá automatická body — nejdřív zadej čas nebo stav (DNF/DNS/DQ).')
  }
  const delta = Math.round(arg.delta)
  const finalBody = auto + delta

  runInTransaction(db, () => {
    db.prepare('UPDATE vysledek SET body_rucni = ? WHERE id = ?').run(finalBody, vysledekId)
    zapisUpravaLog(db, vysledekId, 'BODOVA_PENALIZACE', delta, duvod)
  })

  prepoctiJizdu(db, arg.jizdaId, bodyZaPozici, penalizace)
  return nactiJizdu(db, arg.jizdaId, meta.cislo)
}

/** Posun pořadí ředitele — ruční pozice v jízdě, ostatní se posunou, body z žebříčku. */
export function setPosunPoradi(arg: PosunPoradiArg): VysledekJizda {
  const duvod = arg.duvod.trim()
  if (!duvod) throw new Error('Důvod posunu je povinný')
  const pozice = Math.round(arg.poradi)
  if (!Number.isFinite(pozice) || pozice < 1) {
    throw new Error('Cílové pořadí musí být kladné celé číslo (1 = první)')
  }

  const db = getDb()
  const meta = jizdaMeta(db, arg.jizdaId)
  const vysledekId = ensureVysledekRow(db, arg.jizdaId, arg.jezdecId)
  const { bodyZaPozici, penalizace } = nactiBodovani(db, rulesetKategorie(db, meta.kategorie_id))

  // Ověř, že jezdec má výsledek v jízdě (pořadí z času/stavu).
  prepoctiJizdu(db, arg.jizdaId, bodyZaPozici, penalizace)
  const akt = db
    .prepare('SELECT poradi FROM vysledek WHERE jizda_id = ? AND jezdec_id = ?')
    .get(arg.jizdaId, arg.jezdecId) as { poradi: number | null } | undefined
  if (!akt?.poradi) {
    throw new Error('Jezdec nemá pořadí v jízdě — nejdřív zadej čas nebo stav (DNF/DNS/DQ).')
  }

  const maxPoradi = db
    .prepare('SELECT COUNT(*) AS n FROM vysledek WHERE jizda_id = ? AND poradi IS NOT NULL')
    .get(arg.jizdaId) as { n: number }
  if (pozice > maxPoradi.n) {
    throw new Error(`V jízdě je jen ${maxPoradi.n} jezdců s pořadím (max. pozice ${maxPoradi.n}).`)
  }

  runInTransaction(db, () => {
    db.prepare('UPDATE vysledek SET rucni_poradi = ? WHERE id = ?').run(pozice, vysledekId)
    zapisUpravaLog(db, vysledekId, 'POSUN_PORADI', pozice, duvod)
  })

  prepoctiJizdu(db, arg.jizdaId, bodyZaPozici, penalizace)
  return nactiJizdu(db, arg.jizdaId, meta.cislo)
}

/** Zruší zásah ředitele (dle typu) a přepočte jízdu. */
export function zrusPenalizaci(arg: ZrusPenalizaciArg): VysledekJizda {
  const duvod = arg.duvod.trim()
  if (!duvod) throw new Error('Důvod zrušení je povinný')

  const db = getDb()
  const meta = jizdaMeta(db, arg.jizdaId)
  const vysledekId = ensureVysledekRow(db, arg.jizdaId, arg.jezdecId)
  const typ = arg.typ ?? 'CASOVA_PENALIZACE'

  runInTransaction(db, () => {
    if (typ === 'CASOVA_PENALIZACE') {
      db.prepare('UPDATE vysledek SET penalizace_ms = 0 WHERE id = ?').run(vysledekId)
      zapisUpravaLog(db, vysledekId, 'ZRUSENI', null, `Časová penalizace zrušena: ${duvod}`)
    } else if (typ === 'BODOVA_PENALIZACE') {
      db.prepare('UPDATE vysledek SET body_rucni = NULL WHERE id = ?').run(vysledekId)
      zapisUpravaLog(db, vysledekId, 'ZRUSENI', null, `Bodová penalizace zrušena: ${duvod}`)
    } else if (typ === 'POSUN_PORADI') {
      db.prepare('UPDATE vysledek SET rucni_poradi = NULL WHERE id = ?').run(vysledekId)
      zapisUpravaLog(db, vysledekId, 'ZRUSENI', null, `Posun pořadí zrušen: ${duvod}`)
    }
  })

  const { bodyZaPozici, penalizace } = nactiBodovani(db, rulesetKategorie(db, meta.kategorie_id))
  prepoctiJizdu(db, arg.jizdaId, bodyZaPozici, penalizace)
  return nactiJizdu(db, arg.jizdaId, meta.cislo)
}

/** Auditní přehled zásahů ředitele v kategorii (nejnovější nahoře). */
export function listUpravaLog(kategorieId: number): UpravaLogRadek[] {
  const db = getDb()
  return db
    .prepare(
      `SELECT ul.id, ul.vysledek_id, ul.typ, ul.hodnota, ul.duvod, ul.rozhodl, ul.kdy,
              v.jezdec_id, j.st_cislo, j.prijmeni, j.jmeno, k.typ AS kolo_typ, jz.cislo AS jizda_cislo,
              kat.nazev AS kategorie_nazev
       FROM uprava_log ul
       JOIN vysledek v ON v.id = ul.vysledek_id
       JOIN jezdec j ON j.id = v.jezdec_id
       JOIN jizda jz ON jz.id = v.jizda_id
       JOIN kolo k ON k.id = jz.kolo_id
       JOIN kategorie kat ON kat.id = k.kategorie_id
       WHERE k.kategorie_id = ?
       ORDER BY ul.kdy DESC`
    )
    .all(kategorieId) as unknown as UpravaLogRadek[]
}

/**
 * Agregované výsledky jednoho kola (Q1 nebo Q2): všichni jezdci ze všech jízd
 * kola spojeni do jedné tabulky, seřazeni podle času a ohodnoceni jako jedna
 * velká jízda.
 *
 * Body = automat z pořadí + delta bodové penalizace z jízdy (body_rucni z vysledek,
 * uložené přes setBodovaPenalizace). Override na úrovni agregátu (q_agregat_override)
 * má přednost před automatem.
 */
export function getQAgregat(kategorieId: number, typ: KoloTyp): QAgregatRadek[] {
  const db = getDb()

  const koloRow = db
    .prepare('SELECT id FROM kolo WHERE kategorie_id = ? AND typ = ?')
    .get(kategorieId, typ) as { id: number } | undefined
  if (!koloRow) return []
  const koloId = koloRow.id

  // bodova_pen_delta: součet všech aktivních BODOVA_PENALIZACE zásahů v jízdě
  // (záporná hodnota = odečet bodů). ZRUSENI zásahy filtrujeme tím, že bereme
  // jen nejnovější záznam pro daný vysledek_id a typ BODOVA_PENALIZACE — pokud
  // byl zrušen, body_rucni v vysledku je NULL, takže delta je 0.
  const rows = db
    .prepare(
      `SELECT v.jezdec_id, j.st_cislo, j.prijmeni, j.jmeno, j.znacka, j.model,
              jz.cislo AS cislo_jizdy,
              v.namereny_cas_ms AS cas_ms,
              v.penalizace_ms,
              v.stav,
              CASE WHEN v.body_rucni IS NOT NULL
                   AND EXISTS (SELECT 1 FROM uprava_log ul2
                               WHERE ul2.vysledek_id = v.id
                               AND ul2.typ = 'BODOVA_PENALIZACE')
                   THEN (SELECT ul2.hodnota FROM uprava_log ul2
                         WHERE ul2.vysledek_id = v.id AND ul2.typ = 'BODOVA_PENALIZACE'
                         ORDER BY ul2.id DESC LIMIT 1)
                   ELSE 0
              END AS bodova_pen_delta
       FROM vysledek v
       JOIN jizda jz ON jz.id = v.jizda_id
       JOIN kolo k ON k.id = jz.kolo_id
       JOIN jezdec j ON j.id = v.jezdec_id
       WHERE k.kategorie_id = ? AND k.typ = ?
       ORDER BY jz.cislo, v.jezdec_id`
    )
    .all(kategorieId, typ) as {
      jezdec_id: number
      st_cislo: number | null
      prijmeni: string
      jmeno: string
      znacka: string | null
      model: string | null
      cislo_jizdy: number
      cas_ms: number | null
      penalizace_ms: number
      stav: Stav
      bodova_pen_delta: number | null
    }[]

  if (rows.length === 0) return []

  // Načti overrides pro toto kolo
  const overrides = db
    .prepare('SELECT jezdec_id, body_rucni FROM q_agregat_override WHERE kolo_id = ?')
    .all(koloId) as { jezdec_id: number; body_rucni: number }[]
  const overrideMap = new Map(overrides.map((o) => [o.jezdec_id, o.body_rucni]))

  const ruleset = rulesetKategorie(db, kategorieId)
  const { bodyZaPozici, penalizace } = nactiBodovani(db, ruleset)

  const vstupy: JizdaVstup[] = rows.map((r) => ({
    jezdec_id: r.jezdec_id,
    cas_ms: r.cas_ms !== null ? r.cas_ms + r.penalizace_ms : null,
    stav: r.stav
  }))
  const vypocty = spocitejJizdu(vstupy, bodyZaPozici, penalizace)
  const vypMap = new Map(vypocty.map((v) => [v.jezdec_id, v]))

  return rows.map((r) => {
    const v = vypMap.get(r.jezdec_id)
    const delta = r.bodova_pen_delta ?? 0
    const body_auto = v?.body != null ? v.body + delta : null
    const body_rucni = overrideMap.get(r.jezdec_id) ?? null
    return {
      jezdec_id: r.jezdec_id,
      st_cislo: r.st_cislo,
      prijmeni: r.prijmeni,
      jmeno: r.jmeno,
      znacka: r.znacka,
      model: r.model,
      cislo_jizdy: r.cislo_jizdy,
      cas_ms: r.cas_ms,
      penalizace_ms: r.penalizace_ms,
      delta_z_jizdy: delta,
      stav: r.stav,
      poradi: v?.poradi ?? null,
      body_auto,
      body_rucni,
      body: body_rucni ?? body_auto
    }
  }).sort((a, b) => {
    if (a.poradi == null && b.poradi == null) return 0
    if (a.poradi == null) return 1
    if (b.poradi == null) return -1
    return a.poradi - b.poradi
  })
}

/** Ruční přepis bodů v agregátu (null = zrušit override → návrat k automatu). */
export function setQAgregatBodyOverride(
  kategorieId: number,
  typ: KoloTyp,
  jezdecId: number,
  body: number | null
): QAgregatRadek[] {
  const db = getDb()
  const koloRow = db
    .prepare('SELECT id FROM kolo WHERE kategorie_id = ? AND typ = ?')
    .get(kategorieId, typ) as { id: number } | undefined
  if (!koloRow) throw new Error('Kolo nenalezeno')

  if (body === null) {
    db.prepare('DELETE FROM q_agregat_override WHERE kolo_id = ? AND jezdec_id = ?')
      .run(koloRow.id, jezdecId)
  } else {
    db.prepare(
      'INSERT INTO q_agregat_override (kolo_id, jezdec_id, body_rucni) VALUES (?, ?, ?) ' +
      'ON CONFLICT(kolo_id, jezdec_id) DO UPDATE SET body_rucni = excluded.body_rucni'
    ).run(koloRow.id, jezdecId, body)
  }
  return getQAgregat(kategorieId, typ)
}

// Klasifikace = součet bodů přes jízdy uvedených kol. Tiebreak: lepší (vyšší)
// výsledek v jakékoli jízdě (RAC / RX — CLAUDE.md §7).
export function getKlasifikace(kategorieId: number, koloTypy: KoloTyp[]): KlasifikaceRadek[] {
  if (koloTypy.length === 0) return []
  const db = getDb()
  const ph = koloTypy.map(() => '?').join(',')
  const rows = db
    .prepare(
      `SELECT v.jezdec_id AS jezdec_id, k.typ AS typ, v.body AS body
       FROM vysledek v
       JOIN jizda jz ON jz.id = v.jizda_id
       JOIN kolo k ON k.id = jz.kolo_id
       JOIN jezdec j ON j.id = v.jezdec_id
       WHERE k.kategorie_id = ? AND k.typ IN (${ph}) AND j.los IS NOT NULL`
    )
    .all(kategorieId, ...koloTypy) as { jezdec_id: number; typ: string; body: number | null }[]

  const map = new Map<number, { perKolo: Record<string, number>; celkem: number }>()
  for (const r of rows) {
    let e = map.get(r.jezdec_id)
    if (!e) {
      e = { perKolo: {}, celkem: 0 }
      map.set(r.jezdec_id, e)
    }
    const b = r.body ?? 0
    e.perKolo[r.typ] = (e.perKolo[r.typ] ?? 0) + b
    e.celkem += b
  }

  const ids = [...map.keys()]
  const jezMap = new Map(
    ids.length === 0
      ? []
      : (db
          .prepare(
            `SELECT id, st_cislo, prijmeni, jmeno, los FROM jezdec WHERE id IN (${ids.map(() => '?').join(',')})`
          )
          .all(...ids) as { id: number; st_cislo: number | null; prijmeni: string; jmeno: string; los: number | null }[]
        ).map((j) => [j.id, j])
  )
  const list = [...map.entries()].map(([jezdec_id, e]) => {
    const j = jezMap.get(jezdec_id) ?? { st_cislo: null, prijmeni: '', jmeno: '', los: null }
    return {
      jezdec_id,
      st_cislo: j.st_cislo,
      prijmeni: j.prijmeni,
      jmeno: j.jmeno,
      los: j.los,
      perKolo: e.perKolo,
      celkem: e.celkem
    }
  })

  list.sort((a, b) => {
    if (a.celkem !== b.celkem) return b.celkem - a.celkem
    return tiebreakPerKolo(a.perKolo, b.perKolo, koloTypy)
  })

  return list.map((r, i) => ({
    poradi: i + 1,
    jezdec_id: r.jezdec_id,
    st_cislo: r.st_cislo,
    prijmeni: r.prijmeni,
    jmeno: r.jmeno,
    los: r.los,
    perKolo: r.perKolo,
    celkem: r.celkem
  }))
}


// =====================================================================
// Závěr závodu — semifinále
// =====================================================================

// Kvalifikovaní jezdci seřazení dle Klasifikace po Q3 (nejlepší první).
function kvalifikovaniPoradi(db: Db, kategorieId: number): number[] {
  const stats = db
    .prepare(
      `SELECT v.jezdec_id AS jezdec_id,
              SUM(CASE WHEN v.stav = 'OK' AND v.namereny_cas_ms IS NOT NULL THEN 1 ELSE 0 END) AS dokoncil,
              SUM(CASE WHEN v.stav IN ('OK','DNF') THEN 1 ELSE 0 END) AS odstartoval
       FROM vysledek v JOIN jizda jz ON jz.id = v.jizda_id JOIN kolo k ON k.id = jz.kolo_id
       WHERE k.kategorie_id = ? AND k.typ IN ('Q1','Q2','Q3')
       GROUP BY v.jezdec_id`
    )
    .all(kategorieId) as { jezdec_id: number; dokoncil: number; odstartoval: number }[]
  const kval = new Set(
    stats.filter((s) => jeKvalifikovan(s.dokoncil, s.odstartoval)).map((s) => s.jezdec_id)
  )
  // Pořadí dle Klasifikace po Q3, profiltrované jen na kvalifikované.
  return getKlasifikace(kategorieId, ['Q1', 'Q2', 'Q3'])
    .filter((r) => kval.has(r.jezdec_id))
    .map((r) => r.jezdec_id)
}

export function getZaverStav(kategorieId: number): ZaverStav {
  const db = getDb()
  const kval = kvalifikovaniPoradi(db, kategorieId)
  const finaleVelikost = (
    db.prepare('SELECT finale_velikost FROM kategorie WHERE id = ?').get(kategorieId) as {
      finale_velikost: number
    }
  ).finale_velikost
  const maJizdy = (typ: KoloTyp): boolean => {
    const k = db.prepare('SELECT id FROM kolo WHERE kategorie_id = ? AND typ = ?').get(
      kategorieId,
      typ
    ) as { id: number } | undefined
    if (!k) return false
    return (db.prepare('SELECT COUNT(*) AS n FROM jizda WHERE kolo_id = ?').get(k.id) as {
      n: number
    }).n > 0
  }

  return {
    kvalifikovani: kval.length,
    prahSF: PRAH_SF,
    sfSeKona: kval.length >= PRAH_SF,
    sfHotovo: maJizdy('SF'),
    finaleHotovo: maJizdy('F'),
    finaleVelikost
  }
}

export function setFinaleVelikost(kategorieId: number, velikost: number): void {
  getDb()
    .prepare('UPDATE kategorie SET finale_velikost = ? WHERE id = ?')
    .run(velikost === 10 ? 10 : 8, kategorieId)
}

// Návrh nasazení semifinále (liché/sudé z Klasifikace po Q3). Vrací RostNavrh
// (zápis se pak udělá přes zapisRost(kategorieId, 'SF', …) — stejně jako rošty).
export function navrhSF(kategorieId: number): RostNavrh {
  const db = getDb()
  const prazdny = { pocetJizd: 0, minJizd: 0, maxJizd: 0 }
  const kval = kvalifikovaniPoradi(db, kategorieId)
  if (kval.length < PRAH_SF) {
    return {
      ok: false,
      chyba: `Semifinále se nekoná — jen ${kval.length} kvalifikovaných (potřeba ${PRAH_SF}). Jeď rovnou finále.`,
      obsazeno: rostObsazen(db, kategorieId, 'SF'),
      jizdy: [],
      ...prazdny
    }
  }
  const sel = db.prepare(`SELECT ${JEZDEC_SLOUPCE} FROM jezdec WHERE id = ?`)
  const toJezdci = (ids: number[]): Jezdec[] => ids.map((id) => sel.get(id) as unknown as Jezdec)
  const { heat1, heat2 } = nasazSF(kval)
  return {
    ok: true,
    chyba: null,
    obsazeno: rostObsazen(db, kategorieId, 'SF'),
    jizdy: [
      { cislo: 1, jezdci: toJezdci(heat1) },
      { cislo: 2, jezdci: toJezdci(heat2) }
    ],
    pocetJizd: 2,
    minJizd: 2,
    maxJizd: 2
  }
}

// Návrh nasazení finále (§D/§E). Když bylo SF → postupující z obou jízd spárované
// dle bodů po Q3; když SF nebylo → prvních N kvalifikovaných dle Klasifikace po Q3.
// N = velikost finále (8/10). Finále je jedna jízda.
export function navrhFinale(kategorieId: number): RostNavrh {
  const db = getDb()
  const prazdny = { pocetJizd: 0, minJizd: 0, maxJizd: 0 }
  const stav = getZaverStav(kategorieId)
  const N = stav.finaleVelikost
  const obsazeno = rostObsazen(db, kategorieId, 'F')
  const sel = db.prepare(`SELECT ${JEZDEC_SLOUPCE} FROM jezdec WHERE id = ?`)
  const MAX_NAHRADNICI = 5
  const jizda = (ids: number[], nahradniciIds: number[] = []): RostNavrh => {
    const vsichni = [...ids, ...nahradniciIds.slice(0, MAX_NAHRADNICI)]
    return {
      ok: true,
      chyba: null,
      obsazeno,
      jizdy: [{ cislo: 1, jezdci: vsichni.map((id) => sel.get(id) as unknown as Jezdec) }],
      pocetJizd: 1,
      minJizd: 1,
      maxJizd: 1,
      finaleVelikost: N
    }
  }
  const chyba = (msg: string): RostNavrh => ({
    ok: false,
    chyba: msg,
    obsazeno,
    jizdy: [],
    ...prazdny
  })

  if (stav.sfSeKona) {
    // Finále z postupujících SF.
    if (!stav.sfHotovo) return chyba('Nejdřív vygeneruj semifinále (záložka Semifinále).')
    const sfKolo = db.prepare("SELECT id FROM kolo WHERE kategorie_id = ? AND typ = 'SF'").get(
      kategorieId
    ) as { id: number }
    const sfJizdy = db
      .prepare('SELECT id, cislo FROM jizda WHERE kolo_id = ? ORDER BY cislo')
      .all(sfKolo.id) as { id: number; cislo: number }[]
    const poradiJizdy = (jizdaId: number): { jezdec_id: number; poradi: number | null }[] =>
      db
        .prepare(
          'SELECT jezdec_id, poradi FROM vysledek WHERE jizda_id = ? ORDER BY (poradi IS NULL), poradi'
        )
        .all(jizdaId) as { jezdec_id: number; poradi: number | null }[]
    const h1 = sfJizdy[0] ? poradiJizdy(sfJizdy[0].id) : []
    const h2 = sfJizdy[1] ? poradiJizdy(sfJizdy[1].id) : []
    if (![...h1, ...h2].some((r) => r.poradi !== null)) {
      return chyba('Nejdřív zadej výsledky semifinále.')
    }
    const naJizdu = Math.floor(N / 2) // 8 → 4, 10 → 5
    const postup1 = h1.slice(0, naJizdu).map((r) => r.jezdec_id)
    const postup2 = h2.slice(0, naJizdu).map((r) => r.jezdec_id)
    const bodyQ3 = new Map(
      getKlasifikace(kategorieId, ['Q1', 'Q2', 'Q3']).map((r) => [r.jezdec_id, r.celkem])
    )
    const finalisteIds = nasazFinaleZeSF(postup1, postup2, bodyQ3)
    const finalisteSet = new Set(finalisteIds)

    // Náhradníci ze SF: nepostupující seřazení dle pořadí v SF, pak zbytek dle Q3.
    const sfJezdci = [...h1, ...h2].map((r) => r.jezdec_id)
    const nepostupujiciSF = sfJezdci.filter((id) => !finalisteSet.has(id))
    const kvalQ3 = kvalifikovaniPoradi(db, kategorieId)
    const sfSet = new Set(sfJezdci)
    const zbyliQ3 = kvalQ3.filter((id) => !finalisteSet.has(id) && !sfSet.has(id))
    const nahradniciIds = [...new Set([...nepostupujiciSF, ...zbyliQ3])]

    return jizda(finalisteIds, nahradniciIds)
  }

  // SF se nekoná → prvních N kvalifikovaných dle Klasifikace po Q3.
  const kval = kvalifikovaniPoradi(db, kategorieId)
  if (kval.length === 0) return chyba('Nejsou kvalifikovaní jezdci — zadej výsledky kvalifikace.')
  return jizda(kval.slice(0, N), kval.slice(N))
}

// Celkové výsledky (§9). Pořadí řídí finále, body se nepřičítají (BQ = body po Q3).
export function getCelkove(kategorieId: number): CelkoveRadek[] {
  const db = getDb()
  const klas = getKlasifikace(kategorieId, ['Q1', 'Q2', 'Q3'])

  // Pořadí jezdců v daném kole (jezdec_id → poradi), jen pokud kolo existuje.
  const poradiKola = (typ: KoloTyp): Map<number, number> => {
    const k = db.prepare('SELECT id FROM kolo WHERE kategorie_id = ? AND typ = ?').get(
      kategorieId,
      typ
    ) as { id: number } | undefined
    const m = new Map<number, number>()
    if (!k) return m
    const rows = db
      .prepare(
        'SELECT v.jezdec_id AS jezdec_id, v.poradi AS poradi FROM vysledek v JOIN jizda jz ON jz.id = v.jizda_id WHERE jz.kolo_id = ?'
      )
      .all(k.id) as { jezdec_id: number; poradi: number | null }[]
    for (const r of rows) if (r.poradi !== null) m.set(r.jezdec_id, r.poradi)
    return m
  }

  // STANDARD (RAC / RX)
  const psfMap = poradiKola('SF')
  const pfMap = poradiKola('F')
  const vstupy = klas.map((r, i) => ({
    jezdec_id: r.jezdec_id,
    pq: i + 1,
    psf: psfMap.get(r.jezdec_id) ?? null,
    pf: pfMap.get(r.jezdec_id) ?? null,
    bq: r.celkem
  }))
  const info = new Map(klas.map((r) => [r.jezdec_id, r]))
  const byId = new Map(vstupy.map((v) => [v.jezdec_id, v]))

  return celkovePoradi(vstupy).map((id, i) => {
    const v = byId.get(id)!
    const j = info.get(id)!
    return {
      poradi: i + 1,
      jezdec_id: id,
      st_cislo: j.st_cislo,
      prijmeni: j.prijmeni,
      jmeno: j.jmeno,
      pq: v.pq,
      psf: v.psf,
      pf: v.pf,
      bq: v.bq
    }
  })
}

// =====================================================================
// Stopky / měření (CLAUDE.md §13.8)
// =====================================================================

function zavodIdProJizdu(db: Db, jizdaId: number): number | null {
  const row = db
    .prepare(
      `SELECT k.zavod_id AS zavodId FROM jizda jz
       JOIN kolo ko ON ko.id = jz.kolo_id
       JOIN kategorie k ON k.id = ko.kategorie_id
       WHERE jz.id = ?`
    )
    .get(jizdaId) as { zavodId: number } | undefined
  return row?.zavodId ?? null
}

function aktivniZavodIdNeboChyba(): number {
  const z = getAktivniZavod()
  if (!z) throw new Error('Není otevřený žádný závod.')
  return z.id
}

function overMereniPatriAktivnimuZavodu(db: Db, mereniId: number): void {
  const row = db
    .prepare('SELECT zavod_id AS zid FROM mereni WHERE id = ?')
    .get(mereniId) as { zid: number | null } | undefined
  if (!row?.zid) throw new Error('Záznam měření neexistuje.')
  const aktivni = aktivniZavodIdNeboChyba()
  if (row.zid !== aktivni) {
    throw new Error('Toto měření patří jinému závodu.')
  }
}

function overJizdaPatriAktivnimuZavodu(db: Db, jizdaId: number): number {
  const zid = zavodIdProJizdu(db, jizdaId)
  if (zid == null) throw new Error('Jízda neexistuje.')
  const aktivni = aktivniZavodIdNeboChyba()
  if (zid !== aktivni) throw new Error('Tato jízda patří jinému závodu.')
  return zid
}

const MERENI_SLOUPCE =
  'm.id AS id, m.jizda_id AS jizda_id, m.poradi_kliku AS poradi_kliku, m.cas_ms AS cas_ms, ' +
  'm.jezdec_id AS jezdec_id, j.st_cislo AS st_cislo, j.prijmeni AS prijmeni, j.jmeno AS jmeno, ' +
  'j.znacka AS znacka, j.model AS model'

function mereniRadek(db: Db, id: number): MereniRadek {
  return db
    .prepare(`SELECT ${MERENI_SLOUPCE} FROM mereni m LEFT JOIN jezdec j ON j.id = m.jezdec_id WHERE m.id = ?`)
    .get(id) as unknown as MereniRadek
}

// Přehled rozměřených jízd (kanálů) — jen aktivní závod.
export function mereniKanaly(): MereniKanal[] {
  const zavod = getAktivniZavod()
  if (!zavod) return []
  const rows = getDb()
    .prepare(
      `SELECT m.jizda_id AS jizdaId, COUNT(*) AS pocet,
              k.id AS kategorieId, k.nazev AS katNazev, ko.typ AS koloTyp, jz.cislo AS jizdaCislo
       FROM mereni m
       JOIN jizda jz ON jz.id = m.jizda_id
       JOIN kolo ko ON ko.id = jz.kolo_id
       JOIN kategorie k ON k.id = ko.kategorie_id
       WHERE m.zavod_id = ?
       GROUP BY m.jizda_id
       ORDER BY k.nazev, ko.poradi, jz.cislo`
    )
    .all(zavod.id) as {
    jizdaId: number
    pocet: number
    kategorieId: number
    katNazev: string
    koloTyp: KoloTyp
    jizdaCislo: number
  }[]
  return rows.map((r) => ({
    jizdaId: r.jizdaId,
    kategorieId: r.kategorieId,
    koloTyp: r.koloTyp,
    jizdaCislo: r.jizdaCislo,
    pocet: r.pocet,
    label: `${r.katNazev} · ${r.koloTyp} · ${r.jizdaCislo}. jízda`
  }))
}

export function mereniList(jizdaId: number): MereniRadek[] {
  const db = getDb()
  const zavodId = overJizdaPatriAktivnimuZavodu(db, jizdaId)
  return db
    .prepare(
      `SELECT ${MERENI_SLOUPCE} FROM mereni m LEFT JOIN jezdec j ON j.id = m.jezdec_id
       WHERE m.jizda_id = ? AND m.zavod_id = ? ORDER BY m.poradi_kliku`
    )
    .all(jizdaId, zavodId) as unknown as MereniRadek[]
}

export function mereniPridej(jizdaId: number, cas_ms: number): MereniRadek {
  const db = getDb()
  const zavodId = overJizdaPatriAktivnimuZavodu(db, jizdaId)
  const max = (
    db.prepare('SELECT COALESCE(MAX(poradi_kliku), 0) AS m FROM mereni WHERE jizda_id = ?').get(
      jizdaId
    ) as { m: number }
  ).m
  const r = db
    .prepare(
      'INSERT INTO mereni (jizda_id, zavod_id, poradi_kliku, cas_ms) VALUES (?, ?, ?, ?)'
    )
    .run(jizdaId, zavodId, max + 1, Math.round(cas_ms))
  return mereniRadek(db, Number(r.lastInsertRowid))
}

export function mereniVratPosledni(jizdaId: number): void {
  const db = getDb()
  overJizdaPatriAktivnimuZavodu(db, jizdaId)
  const row = db
    .prepare('SELECT id FROM mereni WHERE jizda_id = ? ORDER BY poradi_kliku DESC LIMIT 1')
    .get(jizdaId) as { id: number } | undefined
  if (row) db.prepare('DELETE FROM mereni WHERE id = ?').run(row.id)
}

// Smaže jeden konkrétní záznam měření (křížek v tabulce). Ověří, že patří
// aktivnímu závodu — jinak vyhodí (ochrana proti zásahu do cizích dat).
export function mereniSmazRadek(id: number): void {
  const db = getDb()
  overMereniPatriAktivnimuZavodu(db, id)
  db.prepare('DELETE FROM mereni WHERE id = ?').run(id)
}

export function mereniOpravCas(id: number, cas_ms: number): MereniRadek {
  const db = getDb()
  overMereniPatriAktivnimuZavodu(db, id)
  db.prepare('UPDATE mereni SET cas_ms = ? WHERE id = ?').run(Math.round(cas_ms), id)
  return mereniRadek(db, id)
}

export function mereniSmazKanal(jizdaId: number): void {
  const db = getDb()
  const zavodId = overJizdaPatriAktivnimuZavodu(db, jizdaId)
  db.prepare('DELETE FROM mereni WHERE jizda_id = ? AND zavod_id = ?').run(jizdaId, zavodId)
  mereniSmazTimer(jizdaId)
}

// Přiřadí startovní číslo k záznamu. Jezdec se hledá v kategorii dané jízdy;
// stejný jezdec nesmí být přiřazen víc časům téže jízdy.
export function mereniSetCislo(id: number, st_cislo: number | null): MereniSetCisloResult {
  const db = getDb()
  overMereniPatriAktivnimuZavodu(db, id)
  const meta = db
    .prepare(
      `SELECT m.jizda_id AS jizdaId, ko.kategorie_id AS katId
       FROM mereni m JOIN jizda jz ON jz.id = m.jizda_id JOIN kolo ko ON ko.id = jz.kolo_id
       WHERE m.id = ?`
    )
    .get(id) as { jizdaId: number; katId: number } | undefined
  if (!meta) throw new Error('Záznam měření neexistuje')

  if (st_cislo === null) {
    db.prepare('UPDATE mereni SET jezdec_id = NULL WHERE id = ?').run(id)
    return { ok: true, jezdec: null }
  }

  const jezdec = db
    .prepare(`SELECT ${JEZDEC_SLOUPCE} FROM jezdec WHERE kategorie_id = ? AND st_cislo = ?`)
    .get(meta.katId, st_cislo) as unknown as Jezdec | undefined
  if (!jezdec) return { ok: false, jezdec: null }

  const dup = db
    .prepare('SELECT 1 FROM mereni WHERE jizda_id = ? AND jezdec_id = ? AND id <> ?')
    .get(meta.jizdaId, jezdec.id, id)
  if (dup) return { ok: false, jezdec: null, duplicitni: true }

  db.prepare('UPDATE mereni SET jezdec_id = ? WHERE id = ?').run(jezdec.id, id)
  return { ok: true, jezdec }
}

// Vrátí sloty roštu pro jednu konkrétní jízdu — bez nutnosti znát kategorii/kolo.
// Vrátí prázdné pole, pokud rošt ještě nebyl nasazen.
export function getRostJizda(jizdaId: number): RostSlot[] {
  const db = getDb()
  const rows = db
    .prepare(
      `SELECT rp.pozice AS pozice, ${JEZDEC_COLS_J}
       FROM rost_pozice rp JOIN jezdec j ON j.id = rp.jezdec_id
       WHERE rp.jizda_id = ?
       ORDER BY rp.pozice`
    )
    .all(jizdaId) as (Record<string, unknown> & { pozice: number })[]
  if (rows.length === 0) return []
  const byPoz = new Map(rows.map((r) => [r.pozice, r]))
  const highest = rows.reduce((m, r) => Math.max(m, r.pozice), 0)
  const sloty: RostSlot[] = []
  for (let p = 1; p <= highest; p++) {
    const r = byPoz.get(p)
    sloty.push({ pozice: p, jezdec: r ? jezdecZRadku(r) : null })
  }
  return sloty
}

// Vrátí návrh předvýběru: první neodměřená jízda po posledním záznamu měření.
// Logika: vezme kolo posledního mereni, najde v něm první jízdu bez mereni/vysledků;
// pokud jsou všechny hotové, přeskočí do dalšího kola (dle poradi).
export function mereniDalsiJizda(): import('../shared/types').MereniDalsiJizda | null {
  const zavod = getAktivniZavod()
  if (!zavod) return null
  const db = getDb()
  const last = db
    .prepare(
      `SELECT ko.id AS koloId, ko.typ AS koloTyp, ko.kategorie_id AS katId, ko.poradi AS koloPoradi
       FROM mereni m
       JOIN jizda jz ON jz.id = m.jizda_id
       JOIN kolo ko ON ko.id = jz.kolo_id
       WHERE m.zavod_id = ?
       ORDER BY m.id DESC
       LIMIT 1`
    )
    .get(zavod.id) as
    | { koloId: number; koloTyp: KoloTyp; katId: number; koloPoradi: number }
    | undefined
  if (!last) return null

  const firstEmpty = db
    .prepare(
      `SELECT jz.id AS jizdaId FROM jizda jz
       WHERE jz.kolo_id = ?
         AND NOT EXISTS (SELECT 1 FROM mereni WHERE jizda_id = jz.id)
         AND NOT EXISTS (SELECT 1 FROM vysledek WHERE jizda_id = jz.id)
       ORDER BY jz.cislo ASC LIMIT 1`
    )
    .get(last.koloId) as { jizdaId: number } | undefined
  if (firstEmpty) return { katId: last.katId, koloTyp: last.koloTyp, jizdaId: firstEmpty.jizdaId }

  // Všechny jízdy kola jsou hotové — zkus první jízdu dalšího kola.
  const nextKolo = db
    .prepare(
      `SELECT id, typ FROM kolo WHERE kategorie_id = ? AND poradi > ? ORDER BY poradi ASC LIMIT 1`
    )
    .get(last.katId, last.koloPoradi) as { id: number; typ: KoloTyp } | undefined
  if (nextKolo) {
    const firstJizda = db
      .prepare('SELECT id AS jizdaId FROM jizda WHERE kolo_id = ? ORDER BY cislo ASC LIMIT 1')
      .get(nextKolo.id) as { jizdaId: number } | undefined
    if (firstJizda) return { katId: last.katId, koloTyp: nextKolo.typ, jizdaId: firstJizda.jizdaId }
  }
  return null
}

// Vrátí jizdaId jízd v daném kole, které mají aspoň jeden záznam mereni nebo vysledek.
export function mereniJizdyHotovo(katId: number, koloTyp: KoloTyp): number[] {
  const rows = getDb()
    .prepare(
      `SELECT DISTINCT jz.id AS id
       FROM jizda jz JOIN kolo ko ON ko.id = jz.kolo_id
       WHERE ko.kategorie_id = ? AND ko.typ = ?
         AND (
           EXISTS (SELECT 1 FROM mereni WHERE jizda_id = jz.id)
           OR EXISTS (SELECT 1 FROM vysledek
                      WHERE jizda_id = jz.id
                        AND (namereny_cas_ms IS NOT NULL OR stav <> 'OK' OR poradi IS NOT NULL))
         )`
    )
    .all(katId, koloTyp) as { id: number }[]
  return rows.map((r) => r.id)
}

// Read-only přehled pro navigaci Stopek: všechny jízdy daného kola napříč
// kategoriemi aktivního závodu, se stavem odvozeným z dat. NIC nezakládá ani
// nemaže — jen čte existující strukturu (jízdy vznikají dál jen v rošt gridu).
export function listJizdyKola(koloTyp: KoloTyp): import('../shared/types').JizdaKolaRadek[] {
  const zavod = getAktivniZavod()
  if (!zavod) return []
  const rows = getDb()
    .prepare(
      `SELECT jz.id AS jizdaId, k.id AS kategorieId, k.nazev AS katNazev,
              ko.typ AS koloTyp, jz.cislo AS jizdaCislo,
              (SELECT COUNT(*) FROM mereni m WHERE m.jizda_id = jz.id) AS pocetKliku,
              (SELECT COUNT(*) FROM vysledek v WHERE v.jizda_id = jz.id
                 AND (v.namereny_cas_ms IS NOT NULL OR v.stav <> 'OK' OR v.poradi IS NOT NULL))
                AS maVysledkyN,
              (SELECT COUNT(*) FROM rost_pozice rp WHERE rp.jizda_id = jz.id) AS obsazenoRostem
       FROM jizda jz
       JOIN kolo ko ON ko.id = jz.kolo_id
       JOIN kategorie k ON k.id = ko.kategorie_id
       WHERE k.zavod_id = ? AND ko.typ = ?
       ORDER BY k.nazev, jz.cislo`
    )
    .all(zavod.id, koloTyp) as {
    jizdaId: number
    kategorieId: number
    katNazev: string
    koloTyp: KoloTyp
    jizdaCislo: number
    pocetKliku: number
    maVysledkyN: number
    obsazenoRostem: number
  }[]
  return rows.map((r) => ({
    jizdaId: r.jizdaId,
    kategorieId: r.kategorieId,
    katNazev: r.katNazev,
    koloTyp: r.koloTyp,
    jizdaCislo: r.jizdaCislo,
    pocetKliku: r.pocetKliku,
    maVysledky: r.maVysledkyN > 0,
    obsazenoRostem: r.obsazenoRostem,
    label: `${r.katNazev} · ${r.koloTyp} · ${r.jizdaCislo}. jízda`
  }))
}

// Má daná jízda už zadané výsledky? (čas / nestandardní stav / pořadí)
export function mereniMaVysledky(jizdaId: number): boolean {
  const db = getDb()
  try {
    overJizdaPatriAktivnimuZavodu(db, jizdaId)
  } catch {
    return false
  }
  const r = db
    .prepare(
      `SELECT COUNT(*) AS n FROM vysledek
       WHERE jizda_id = ? AND (namereny_cas_ms IS NOT NULL OR stav <> 'OK' OR poradi IS NOT NULL)`
    )
    .get(jizdaId) as { n: number }
  return r.n > 0
}

// Propíše naměřené časy (jen ty s přiřazeným jezdcem) do Výsledků jízdy a
// přepočítá pořadí + body stejnou logikou jako ruční zadání.
export function zapisMereniDoVysledku(jizdaId: number): VysledekJizda {
  const db = getDb()
  const zavodId = overJizdaPatriAktivnimuZavodu(db, jizdaId)
  const meta = db
    .prepare(
      `SELECT ko.kategorie_id AS katId, jz.cislo AS cislo
       FROM jizda jz JOIN kolo ko ON ko.id = jz.kolo_id WHERE jz.id = ?`
    )
    .get(jizdaId) as { katId: number; cislo: number } | undefined
  if (!meta) throw new Error('Jízda neexistuje')

  const rows = db
    .prepare(
      `SELECT cas_ms, jezdec_id FROM mereni
       WHERE jizda_id = ? AND zavod_id = ? AND jezdec_id IS NOT NULL ORDER BY poradi_kliku`
    )
    .all(jizdaId, zavodId) as { cas_ms: number; jezdec_id: number }[]

  runInTransaction(db, () => {
    // Zajisti, že přiřazení jezdci jsou v roštu jízdy — jinak by je synchronizace
    // ve Výsledcích smazala (vysledek je vázán na rost_pozice).
    let next = (
      db.prepare('SELECT COALESCE(MAX(pozice), 0) AS m FROM rost_pozice WHERE jizda_id = ?').get(
        jizdaId
      ) as { m: number }
    ).m
    const jeVRostu = db.prepare('SELECT 1 FROM rost_pozice WHERE jizda_id = ? AND jezdec_id = ?')
    const insPoz = db.prepare(
      'INSERT INTO rost_pozice (jizda_id, pozice, jezdec_id) VALUES (?, ?, ?)'
    )
    const insV = db.prepare(
      `INSERT OR IGNORE INTO vysledek (jizda_id, jezdec_id, penalizace_ms, stav) VALUES (?, ?, 0, 'OK')`
    )
    const updV = db.prepare(
      `UPDATE vysledek SET namereny_cas_ms = ?, stav = 'OK' WHERE jizda_id = ? AND jezdec_id = ?`
    )
    for (const r of rows) {
      if (!jeVRostu.get(jizdaId, r.jezdec_id)) {
        next += 1
        insPoz.run(jizdaId, next, r.jezdec_id)
      }
      insV.run(jizdaId, r.jezdec_id)
      updV.run(r.cas_ms, jizdaId, r.jezdec_id)
    }
  })

  const { bodyZaPozici, penalizace } = nactiBodovani(db, rulesetKategorie(db, meta.katId))
  prepoctiJizdu(db, jizdaId, bodyZaPozici, penalizace)
  mereniOznacZapsano(jizdaId)
  return nactiJizdu(db, jizdaId, meta.cislo)
}

// ---- Autosave stopek + detekce nezapsaného měření ----

function klicMereniZapis(jizdaId: number): string {
  return `mereni_zapis_max_${jizdaId}`
}

/** Po zápisu do výsledků — další kliky znovu vyžadují zápis. */
export function mereniOznacZapsano(jizdaId: number): void {
  const db = getDb()
  const row = db
    .prepare('SELECT COALESCE(MAX(id), 0) AS m FROM mereni WHERE jizda_id = ?')
    .get(jizdaId) as { m: number }
  setNastaveni(klicMereniZapis(jizdaId), String(row.m))
}

/** Existují záznamy mereni novější než poslední zápis do výsledků? */
export function mereniMaNezapsane(zavodId: number): boolean {
  const db = getDb()
  const rows = db
    .prepare(
      `SELECT jizda_id AS jizdaId, MAX(id) AS maxId
       FROM mereni WHERE zavod_id = ?
       GROUP BY jizda_id`
    )
    .all(zavodId) as { jizdaId: number; maxId: number }[]
  for (const r of rows) {
    const ulozeny = getNastaveni(klicMereniZapis(r.jizdaId))
    if (!ulozeny || Number(ulozeny) < r.maxId) return true
  }
  return false
}

export function mereniUlozTimer(
  jizdaId: number,
  stav: { running: boolean; baseMs: number; startEpochMs: number | null }
): void {
  const db = getDb()
  const zavodId = zavodIdProJizdu(db, jizdaId)
  if (zavodId == null) return
  db.prepare(
    `INSERT INTO mereni_timer (jizda_id, zavod_id, running, base_ms, start_epoch_ms)
     VALUES (?, ?, ?, ?, ?)
     ON CONFLICT(jizda_id) DO UPDATE SET
       zavod_id = excluded.zavod_id,
       running = excluded.running,
       base_ms = excluded.base_ms,
       start_epoch_ms = excluded.start_epoch_ms`
  ).run(
    jizdaId,
    zavodId,
    stav.running ? 1 : 0,
    Math.round(stav.baseMs),
    stav.startEpochMs != null ? Math.round(stav.startEpochMs) : null
  )
}

export function mereniNactiTimery(zavodId: number): import('../shared/types').MereniTimerStav[] {
  const rows = getDb()
    .prepare(
      `SELECT jizda_id AS jizdaId, running, base_ms AS baseMs, start_epoch_ms AS startEpochMs
       FROM mereni_timer WHERE zavod_id = ?`
    )
    .all(zavodId) as {
    jizdaId: number
    running: number
    baseMs: number
    startEpochMs: number | null
  }[]
  return rows.map((r) => ({
    jizdaId: r.jizdaId,
    running: r.running === 1,
    baseMs: r.baseMs,
    startEpochMs: r.startEpochMs
  }))
}

export function mereniSmazTimer(jizdaId: number): void {
  getDb().prepare('DELETE FROM mereni_timer WHERE jizda_id = ?').run(jizdaId)
  deleteNastaveni(klicMereniZapis(jizdaId))
}

export function mereniUlozAktivniJizdu(zavodId: number, jizdaId: number | null): void {
  const klic = `stopky_aktivni_${zavodId}`
  if (jizdaId == null) deleteNastaveni(klic)
  else setNastaveni(klic, String(jizdaId))
}

export function mereniNactiAktivniJizdu(zavodId: number): number | null {
  const v = getNastaveni(`stopky_aktivni_${zavodId}`)
  if (!v) return null
  const n = Number(v)
  return Number.isFinite(n) ? n : null
}

// ---- Sportity integrace ----

export function getSportityZavodMap(
  zavodId: number
): { channelPassword: string; eventId: string | null; resultsFolderId: string; resultsFolderName: string } | null {
  const row = getDb()
    .prepare('SELECT channel_password, event_id, results_folder_id, results_folder_name FROM sportity_zavod_map WHERE zavod_id = ?')
    .get(zavodId) as { channel_password: string; event_id: string | null; results_folder_id: string; results_folder_name: string } | undefined
  if (!row) return null
  return {
    channelPassword: row.channel_password,
    eventId: row.event_id,
    resultsFolderId: row.results_folder_id,
    resultsFolderName: row.results_folder_name
  }
}

export function setSportityZavodMap(
  zavodId: number,
  channelPassword: string,
  eventId: string | null,
  resultsFolderId: string,
  resultsFolderName: string
): void {
  getDb()
    .prepare(
      `INSERT INTO sportity_zavod_map (zavod_id, channel_password, event_id, results_folder_id, results_folder_name, updated_at)
       VALUES (?, ?, ?, ?, ?, ?)
       ON CONFLICT(zavod_id) DO UPDATE SET
         channel_password = excluded.channel_password,
         event_id = excluded.event_id,
         results_folder_id = excluded.results_folder_id,
         results_folder_name = excluded.results_folder_name,
         updated_at = excluded.updated_at`
    )
    .run(zavodId, channelPassword, eventId, resultsFolderId, resultsFolderName, new Date().toISOString())
}

export function getSportityKategorieMap(
  kategorieId: number
): { folderId: string; folderName: string } | null {
  const row = getDb()
    .prepare('SELECT folder_id, folder_name FROM sportity_kategorie_map WHERE kategorie_id = ?')
    .get(kategorieId) as { folder_id: string; folder_name: string } | undefined
  if (!row) return null
  return { folderId: row.folder_id, folderName: row.folder_name }
}

export function setSportityKategorieMap(
  kategorieId: number,
  folderId: string,
  folderName: string
): void {
  getDb()
    .prepare(
      `INSERT INTO sportity_kategorie_map (kategorie_id, folder_id, folder_name, updated_at)
       VALUES (?, ?, ?, ?)
       ON CONFLICT(kategorie_id) DO UPDATE SET
         folder_id = excluded.folder_id,
         folder_name = excluded.folder_name,
         updated_at = excluded.updated_at`
    )
    .run(kategorieId, folderId, folderName, new Date().toISOString())
}

export function clearSportityKategorieMap(kategorieId: number): void {
  getDb().prepare('DELETE FROM sportity_kategorie_map WHERE kategorie_id = ?').run(kategorieId)
}

export function getKategorieMapForZavod(
  zavodId: number
): Array<{ kategorieId: number; kategorieNazev: string; folderId: string | null; folderName: string | null }> {
  return (
    getDb()
      .prepare(
        `SELECT k.id AS kategorie_id, k.nazev AS kategorie_nazev,
                m.folder_id, m.folder_name
         FROM kategorie k
         LEFT JOIN sportity_kategorie_map m ON m.kategorie_id = k.id
         WHERE k.zavod_id = ?
         ORDER BY k.id`
      )
      .all(zavodId) as Array<{
        kategorie_id: number
        kategorie_nazev: string
        folder_id: string | null
        folder_name: string | null
      }>
  ).map((r) => ({
    kategorieId: r.kategorie_id,
    kategorieNazev: r.kategorie_nazev,
    folderId: r.folder_id,
    folderName: r.folder_name
  }))
}

export function getSportityDocumentId(kategorieId: number, listKey: string): string | null {
  const row = getDb()
    .prepare('SELECT document_id FROM sportity_document_map WHERE kategorie_id = ? AND list_key = ?')
    .get(kategorieId, listKey) as { document_id: string } | undefined
  return row?.document_id ?? null
}

export function setSportityDocumentId(
  kategorieId: number,
  listKey: string,
  documentId: string
): void {
  getDb()
    .prepare(
      `INSERT INTO sportity_document_map (kategorie_id, list_key, document_id, updated_at)
       VALUES (?, ?, ?, ?)
       ON CONFLICT(kategorie_id, list_key) DO UPDATE SET
         document_id = excluded.document_id,
         updated_at = excluded.updated_at`
    )
    .run(kategorieId, listKey, documentId, new Date().toISOString())
}

export function addSportityPublishLog(
  zavodId: number | null,
  kategorieId: number | null,
  listKey: string | null,
  action: string,
  status: string,
  message?: string
): void {
  getDb()
    .prepare(
      `INSERT INTO sportity_publish_log (zavod_id, kategorie_id, list_key, action, status, message, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    )
    .run(zavodId, kategorieId, listKey, action, status, message ?? null, new Date().toISOString())
}

export function getSportityPublishLog(
  zavodId: number,
  limit = 50
): Array<{
  id: number
  kategorieNazev: string | null
  listKey: string | null
  action: string
  status: string
  message: string | null
  createdAt: string
}> {
  return (
    getDb()
      .prepare(
        `SELECT l.id, k.nazev AS kategorie_nazev, l.list_key, l.action, l.status, l.message, l.created_at
         FROM sportity_publish_log l
         LEFT JOIN kategorie k ON k.id = l.kategorie_id
         WHERE l.zavod_id = ?
         ORDER BY l.id DESC
         LIMIT ?`
      )
      .all(zavodId, limit) as Array<{
        id: number
        kategorie_nazev: string | null
        list_key: string | null
        action: string
        status: string
        message: string | null
        created_at: string
      }>
  ).map((r) => ({
    id: r.id,
    kategorieNazev: r.kategorie_nazev,
    listKey: r.list_key,
    action: r.action,
    status: r.status,
    message: r.message,
    createdAt: r.created_at
  }))
}
