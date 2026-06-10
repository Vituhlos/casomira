/**
 * Screenshot seed — naplní N1600 kategorii kompletními daty pro tour.
 * Spouští se jen při SCREENSHOT_MODE; nikdy nespouštět nad produkční DB.
 */
import type { DatabaseSync } from 'node:sqlite'
import { runInTransaction } from './db/transaction'

function standardBody(pozice: number): number {
  if (pozice === 1) return 50
  if (pozice === 2) return 45
  if (pozice === 3) return 42
  return Math.max(0, 44 - pozice)
}

// Pseudonáhodný čas v rozsahu [base, base+spread) ms — seed pro konzistenci.
let _rng = 12345
function pseudoRand(): number {
  _rng = (_rng * 1664525 + 1013904223) & 0x7fffffff
  return _rng / 0x7fffffff
}
function randTime(base: number, spread: number): number {
  return base + Math.floor(pseudoRand() * spread)
}

export function seedScreenshotData(db: DatabaseSync): void {
  const hasKolo = (db.prepare('SELECT COUNT(*) AS n FROM kolo').get() as { n: number }).n
  if (hasKolo > 0) return

  const zavod = db.prepare('SELECT id FROM zavod LIMIT 1').get() as { id: number } | null
  if (!zavod) return
  const kat = db
    .prepare("SELECT id FROM kategorie WHERE nazev = 'N1600' LIMIT 1")
    .get() as { id: number } | null
  if (!kat) return

  type Driver = { id: number; st_cislo: number }
  const drivers = db
    .prepare('SELECT id, st_cislo FROM jezdec WHERE kategorie_id = ? ORDER BY los ASC')
    .all(kat.id) as Driver[]
  if (drivers.length < 8) return

  const insKolo = db.prepare('INSERT INTO kolo (kategorie_id, typ, poradi) VALUES (?, ?, ?)')
  const insJizda = db.prepare('INSERT INTO jizda (kolo_id, cislo) VALUES (?, ?)')
  const insRost = db.prepare(
    'INSERT INTO rost_pozice (jizda_id, pozice, jezdec_id) VALUES (?, ?, ?)'
  )
  const insVys = db.prepare(
    `INSERT INTO vysledek
       (jizda_id, jezdec_id, namereny_cas_ms, penalizace_ms, stav, poradi, body)
     VALUES (?, ?, ?, 0, ?, ?, ?)`
  )

  /**
   * Vytvoří jednu jízdu s výsledky.
   * @param koloId  ID kola
   * @param cislo   pořadí jízdy v kole
   * @param hd      jezdci přiřazení do této jízdy (v pořadí v roštu)
   * @param baseMs  nejrychlejší očekávaný čas
   * @param dnfIdx  index jezdce (v hd), který dostane DNF (nebo -1 = nikdo)
   */
  function seedHeat(
    koloId: number,
    cislo: number,
    hd: Driver[],
    baseMs: number,
    dnfIdx = -1
  ): void {
    const jizdaId = Number(insJizda.run(koloId, cislo).lastInsertRowid)

    // Přiřaď časy; jezdec s dnfIdx dostane null + stav DNF
    type Slot = { driver: Driver; timeMs: number | null; stav: string }
    const slots: Slot[] = hd.map((d, i) => ({
      driver: d,
      timeMs: i === dnfIdx ? null : randTime(baseMs, 15000),
      stav: i === dnfIdx ? 'DNF' : 'OK'
    }))

    // Seřaď: OK vzestupně dle času, pak DNF/DNS/DQ na konec
    slots.sort((a, b) => {
      if (a.stav === 'OK' && b.stav !== 'OK') return -1
      if (a.stav !== 'OK' && b.stav === 'OK') return 1
      return (a.timeMs ?? 999999) - (b.timeMs ?? 999999)
    })

    for (let i = 0; i < slots.length; i++) {
      const poradi = i + 1
      let body: number
      if (slots[i].stav === 'OK') {
        body = standardBody(poradi)
      } else {
        // DNF = body za poslední místo − 1 (CLAUDE.md §5)
        body = Math.max(0, standardBody(slots.length) - 1)
      }
      insRost.run(jizdaId, i + 1, slots[i].driver.id)
      insVys.run(jizdaId, slots[i].driver.id, slots[i].timeMs, slots[i].stav, poradi, body)
    }
  }

  runInTransaction(db, () => {
    const q1Id = Number(insKolo.run(kat.id, 'Q1', 1).lastInsertRowid)
    const q2Id = Number(insKolo.run(kat.id, 'Q2', 2).lastInsertRowid)
    const q3Id = Number(insKolo.run(kat.id, 'Q3', 3).lastInsertRowid)
    const sfId = Number(insKolo.run(kat.id, 'SF', 4).lastInsertRowid)
    const fId = Number(insKolo.run(kat.id, 'F', 5).lastInsertRowid)

    const g1 = drivers.slice(0, 8)  // los 1–8
    const g2 = drivers.slice(8, 16) // los 9–16

    // Q1: skupina g1 jede jako 1. jízda, g2 jako 2.
    seedHeat(q1Id, 1, g1, 88000, 0) // první z g1 DNF
    seedHeat(q1Id, 2, g2, 87000)

    // Q2: obrácené pořadí skupin i jezdců
    seedHeat(q2Id, 1, [...g2].reverse(), 86000)
    seedHeat(q2Id, 2, [...g1].reverse(), 85000)

    // Q3: seřazeno dle klasifikace po Q2 (zjednodušeno — použijeme původní skupiny)
    seedHeat(q3Id, 1, [...g2], 84000) // pomalejší jede první
    seedHeat(q3Id, 2, [...g1], 83000)

    // Semifinále: liché pořadí do SF-A, sudé do SF-B (16 kvalifikovaných)
    const sfA = drivers.filter((_, i) => i % 2 === 0) // pozice 1,3,5,7,9,11,13,15
    const sfB = drivers.filter((_, i) => i % 2 === 1) // pozice 2,4,6,8,10,12,14,16
    seedHeat(sfId, 1, sfA, 82000)
    seedHeat(sfId, 2, sfB, 81500)

    // Finále: HOBBY = 10 jezdců (top 5 ze SF-A + top 5 ze SF-B → použijeme prvních 10)
    const finalisté = [...drivers.slice(0, 5), ...drivers.slice(8, 13)]
    seedHeat(fId, 1, finalisté, 80000)
  })
}
