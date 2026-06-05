import type { DatabaseSync } from 'node:sqlite'
import { runInTransaction } from './transaction'

// Bodový žebříček STANDARD (CLAUDE.md §4): 1=50, 2=45, 3=42, dál 44−pořadí.
function standardBody(pozice: number): number {
  if (pozice === 1) return 50
  if (pozice === 2) return 45
  if (pozice === 3) return 42
  return Math.max(0, 44 - pozice) // 4→40, 5→39, … , 44→0
}

// Testovací jezdci kategorie N1600 (převzato z prototypu).
// [st_cislo, prijmeni, jmeno, znacka, model, los]
const N1600: [number, string, string, string, string, number][] = [
  [11, 'Šaroun', 'Adam', 'Volkswagen', 'Lupo', 54],
  [94, 'Lagron', 'Jaroslav', 'Peugeot', '306', 25],
  [779, 'Bartuška', 'Stanislav', 'Peugeot', '206', 65],
  [93, 'Ladra', 'Štěpán', 'Škoda', 'Favorit', 46],
  [197, 'Vnouček', 'Franta', 'Peugeot', '206', 32],
  [7, 'Novák', 'Petr', 'Škoda', 'Fabia', 8],
  [41, 'Dvořák', 'Martin', 'Citroën', 'Saxo', 17],
  [55, 'Procházka', 'Tomáš', 'Peugeot', '205', 39],
  [23, 'Kučera', 'Lukáš', 'Škoda', 'Felicia', 71],
  [88, 'Veselý', 'Jan', 'Renault', 'Clio', 12],
  [12, 'Horák', 'Pavel', 'Volkswagen', 'Polo', 50],
  [64, 'Němec', 'David', 'Opel', 'Corsa', 28],
  [3, 'Pokorný', 'Radek', 'Škoda', 'Favorit', 4],
  [71, 'Marek', 'Ondřej', 'Peugeot', '106', 60],
  [28, 'Beneš', 'Jiří', 'Ford', 'Fiesta', 19],
  [5, 'Král', 'Michal', 'Citroën', 'C2', 43]
]

const KATEGORIE: [string, 'STANDARD'][] = [
  ['Junior', 'STANDARD'],
  ['N1400', 'STANDARD'],
  ['N1600', 'STANDARD'],
  ['N1600+', 'STANDARD'],
  ['S1600', 'STANDARD'],
  ['S1600+', 'STANDARD'],
  ['Tuning', 'STANDARD'],
  ['Škoda Cup', 'STANDARD'],
  ['Cross Cup', 'STANDARD'],
  ['Dámský pohár', 'STANDARD'],
  ['Šotolina', 'STANDARD']
]

// Naplní prázdnou databázi výchozími daty. Pokud už závod existuje, nedělá nic.
export function seed(db: DatabaseSync): void {
  const existuje = db.prepare('SELECT COUNT(*) AS n FROM zavod').get() as { n: number }
  if (existuje.n > 0) return

  runInTransaction(db, () => {
    // Závod
    const zavod = db
      .prepare('INSERT INTO zavod (nazev, datum, misto, typ) VALUES (?, ?, ?, ?)')
      .run('MČR Autocross — Přerov', '2026-05-30', 'Přerov', 'RAC')
    const zavodId = Number(zavod.lastInsertRowid)

    // Kategorie
    const insKat = db.prepare('INSERT INTO kategorie (zavod_id, nazev, ruleset) VALUES (?, ?, ?)')
    const katIds: Record<string, number> = {}
    for (const [nazev, ruleset] of KATEGORIE) {
      const r = insKat.run(zavodId, nazev, ruleset)
      katIds[nazev] = Number(r.lastInsertRowid)
    }

    // Žebříčky bodů
    const insZeb = db.prepare('INSERT INTO zebricek (ruleset, poradi, body) VALUES (?, ?, ?)')
    for (let p = 1; p <= 40; p++) insZeb.run('STANDARD', p, standardBody(p))

    // Pravidla (penalizace + prahy dle CLAUDE.md §5, §8)
    db.prepare(
      `INSERT INTO pravidla
       (ruleset, max_na_jizdu, sf_prah, sf_max, dnf_offset, dns_offset, dq_offset, dnf_body, dns_body, dq_body)
       VALUES ('STANDARD', 8, 12, 16, -1, -5, -10, NULL, NULL, NULL)`
    ).run()

    // Jezdci N1600
    const insJ = db.prepare(
      `INSERT INTO jezdec (kategorie_id, st_cislo, prijmeni, jmeno, znacka, model, los)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    )
    const n1600 = katIds['N1600']
    for (const [st, prijmeni, jmeno, znacka, model, los] of N1600) {
      insJ.run(n1600, st, prijmeni, jmeno, znacka, model, los)
    }
  })
}
