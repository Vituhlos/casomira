import { readFileSync } from 'node:fs'
import * as XLSX from 'xlsx'
import type { ParsedJezdec } from '../shared/types'

// Čisté parsování Excelu — ŽÁDNÝ přístup k databázi ani Electronu, aby se to
// dalo samostatně otestovat. Napojení na kategorie/kolize řeší datová vrstva.

// Mapování názvů listů Excelu → názvy kategorií v appce. SNADNO UPRAVITELNÉ:
// kdyby přišel soubor s jinými názvy listů, stačí doplnit/změnit řádek zde.
// Listy, které tu nejsou, se zkusí napárovat podle shodného názvu kategorie.
export const SHEET_MAP: Record<string, string> = {
  Junior: 'Junior',
  'N do 1400': 'N1400',
  'N do 1600': 'N1600',
  'N 1600 +': 'N1600+',
  'Škoda Cup': 'Škoda Cup',
  'S do 1600': 'S1600',
  'S 1600 +': 'S1600+',
  ženy: 'Dámský pohár',
  Šotolina: 'Šotolina',
  'CROSS CUP': 'Cross Cup',
  TUNING: 'Tuning'
}

export interface ParsedSheet {
  sheet: string
  mappedNazev: string
  jezdci: ParsedJezdec[]
}

function norm(v: unknown): string {
  return String(v ?? '').trim()
}

function toInt(v: unknown): number | null {
  if (v === null || v === undefined || v === '') return null
  const n = typeof v === 'number' ? v : parseInt(String(v).replace(',', '.'), 10)
  return Number.isNaN(n) ? null : Math.round(n)
}

// Odstraní diakritiku pro porovnávání názvů sloupců (robustní vůči "Příjmení").
function deburr(s: unknown): string {
  return String(s ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .trim()
    .toLowerCase()
}

// Najde index řádku se záhlavím (obsahuje "LOS" i "číslo").
function findHeaderRow(rows: unknown[][]): number {
  for (let i = 0; i < Math.min(rows.length, 30); i++) {
    const cells = rows[i].map(deburr)
    const hasLos = cells.some((c) => c.includes('los'))
    const hasCislo = cells.some((c) => c.includes('cislo'))
    if (hasLos && hasCislo) return i
  }
  return -1
}

type ColMap = Partial<Record<keyof ParsedJezdec, number>>

// Z řádku záhlaví zjistí, ve kterém sloupci je které pole.
function mapColumns(header: unknown[]): ColMap {
  const map: ColMap = {}
  header.forEach((cellVal, idx) => {
    const c = deburr(cellVal)
    if (!c) return
    if (c.includes('los')) map.los = idx
    else if (c.includes('cislo')) map.st_cislo = idx
    else if (c.includes('prijmeni')) map.prijmeni = idx
    else if (c.includes('jmeno')) map.jmeno = idx
    else if (c.includes('znacka')) map.znacka = idx
    else if (c.includes('model')) map.model = idx
    else if (c.includes('rok')) map.rok_narozeni = idx
  })
  return map
}

function cell(row: unknown[], idx: number | undefined): unknown {
  return idx === undefined ? null : row[idx]
}

// Rozparsuje sešit a vrátí jezdce po jednotlivých listech.
export function parseSheets(soubor: string): ParsedSheet[] {
  // Bajty souboru načteme sami (spolehlivé i v ESM buildu SheetJS); SheetJS
  // si formát (.xls / .xlsx) i kódování diakritiky rozpozná z obsahu.
  const wb = XLSX.read(readFileSync(soubor), { type: 'buffer' })
  const result: ParsedSheet[] = []

  for (const sheet of wb.SheetNames) {
    const ws = wb.Sheets[sheet]
    const rows = XLSX.utils.sheet_to_json<unknown[]>(ws, {
      header: 1,
      raw: true,
      blankrows: false,
      defval: null
    })

    const hi = findHeaderRow(rows)
    if (hi < 0) continue // list bez rozpoznatelné hlavičky přeskočíme

    const cols = mapColumns(rows[hi])
    const jezdci: ParsedJezdec[] = []

    for (let r = hi + 1; r < rows.length; r++) {
      const row = rows[r]
      const st_cislo = toInt(cell(row, cols.st_cislo))
      const prijmeni = norm(cell(row, cols.prijmeni))
      // Řádek je jezdec jen když má startovní číslo I příjmení — tím vypadnou
      // oddělovače ("Do 1400"), rezervované losy i prázdné řádky.
      if (st_cislo === null || prijmeni === '') continue

      jezdci.push({
        los: toInt(cell(row, cols.los)),
        st_cislo,
        prijmeni,
        jmeno: norm(cell(row, cols.jmeno)),
        znacka: norm(cell(row, cols.znacka)),
        model: norm(cell(row, cols.model)),
        rok_narozeni: toInt(cell(row, cols.rok_narozeni))
      })
    }

    result.push({ sheet, mappedNazev: SHEET_MAP[sheet] ?? sheet.trim(), jezdci })
  }

  return result
}
