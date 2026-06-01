import type { KoloTyp, RaceType, Ruleset } from '../shared/types'
import type {
  PrehledZavodu,
  StavFaze,
  StavJizdyPrehled,
  StavKategoriePrehled,
  StavKolaPrehled,
  UpozorneniPrechod
} from '../shared/stav'
import { getDb } from './db/connection'
import { listKategorie } from './repo'

type Db = ReturnType<typeof getDb>

/** Jezdec v roštu má vyplněný výsledek = čas nebo nestandardní stav. */
export function radekJeKompletni(namereny_cas_ms: number | null, stav: string): boolean {
  return namereny_cas_ms != null || stav === 'DNF' || stav === 'DNS' || stav === 'DQ'
}

function stavZKol(jizdy: StavJizdyPrehled[]): StavFaze {
  const sRostem = jizdy.filter((j) => j.celkem > 0)
  if (sRostem.length === 0) return 'empty'
  if (sRostem.every((j) => j.kompletni)) return 'done'
  return 'partial'
}

function nactiJizdyKola(db: Db, kategorieId: number, typ: KoloTyp): StavJizdyPrehled[] {
  const kolo = db
    .prepare('SELECT id FROM kolo WHERE kategorie_id = ? AND typ = ?')
    .get(kategorieId, typ) as { id: number } | undefined
  if (!kolo) return []

  const jizdy = db
    .prepare('SELECT id, cislo FROM jizda WHERE kolo_id = ? ORDER BY cislo')
    .all(kolo.id) as { id: number; cislo: number }[]

  const pocetRost = db.prepare(
    'SELECT COUNT(*) AS n FROM rost_pozice WHERE jizda_id = ?'
  )
  const pocetOk = db.prepare(
    `SELECT COUNT(*) AS n FROM rost_pozice rp
     JOIN vysledek v ON v.jizda_id = rp.jizda_id AND v.jezdec_id = rp.jezdec_id
     WHERE rp.jizda_id = ?
       AND (v.namereny_cas_ms IS NOT NULL OR v.stav IN ('DNF','DNS','DQ'))`
  )

  return jizdy.map((jz) => {
    const celkem = (pocetRost.get(jz.id) as { n: number }).n
    const ok = (pocetOk.get(jz.id) as { n: number }).n
    const chybi = Math.max(0, celkem - ok)
    return {
      jizdaId: jz.id,
      cislo: jz.cislo,
      kompletni: celkem === 0 || chybi === 0,
      chybi,
      celkem
    }
  })
}

export function stavKola(kategorieId: number, typ: KoloTyp): StavKolaPrehled {
  const jizdy = nactiJizdyKola(getDb(), kategorieId, typ)
  return { typ, stav: stavZKol(jizdy), jizdy }
}

const FAZE_TAB_KOLO: { id: string; label: string; typ: KoloTyp }[] = [
  { id: 'q1', label: 'Q1', typ: 'Q1' },
  { id: 'q2', label: 'Q2', typ: 'Q2' },
  { id: 'q3', label: 'Q3', typ: 'Q3' },
  { id: 'sf', label: 'SF', typ: 'SF' },
  { id: 'final', label: 'F', typ: 'F' },
  { id: 'final_b', label: 'F-B', typ: 'F_B' },
  { id: 'final_a', label: 'F-A', typ: 'F_A' }
]

function fazeProKategorii(typ: RaceType, ruleset: Ruleset): { id: string; label: string; typ: KoloTyp }[] {
  if (ruleset === 'SOTOLINA') {
    return FAZE_TAB_KOLO.filter((f) =>
      ['q1', 'q2', 'q3', 'final_b', 'final_a'].includes(f.id)
    )
  }
  if (typ === 'RX') {
    return FAZE_TAB_KOLO.filter((f) => ['q1', 'q2', 'q3', 'sf', 'final'].includes(f.id))
  }
  return FAZE_TAB_KOLO.filter((f) => ['q1', 'q2', 'q3', 'sf', 'final'].includes(f.id))
}

export function prehledZavodu(zavodId: number, typ: RaceType): PrehledZavodu {
  const db = getDb()
  const kats = listKategorie(zavodId)
  const kategorie: StavKategoriePrehled[] = kats.map((k) => {
    const defs = fazeProKategorii(typ, k.ruleset)
    const kola: StavKolaPrehled[] = defs.map((d) => stavKola(k.id, d.typ))
    return {
      kategorieId: k.id,
      nazev: k.nazev,
      ruleset: k.ruleset,
      faze: defs.map((d, i) => ({
        id: d.id,
        label: d.label,
        stav: kola[i].stav
      })),
      kola
    }
  })
  return { zavodId, typ, kategorie }
}

/** Fáze záložky → která kola musí být kompletní před vstupem. */
const ZAVISLOSTI_FAZE: Record<string, KoloTyp[]> = {
  q2: ['Q1'],
  q3: ['Q1', 'Q2'],
  class_q2: ['Q1', 'Q2'],
  class_q3: ['Q1', 'Q2', 'Q3'],
  sf: ['Q1', 'Q2', 'Q3'],
  final: ['Q1', 'Q2', 'Q3'],
  final_b: ['Q1', 'Q2', 'Q3'],
  final_a: ['Q1', 'Q2', 'Q3', 'F_B'],
  overall: ['Q1', 'Q2', 'Q3']
}

const KOLO_LABEL: Record<KoloTyp, string> = {
  Q1: 'Q1',
  Q2: 'Q2',
  Q3: 'Q3',
  SF: 'Semifinále',
  F: 'Finále',
  F_A: 'Finále A',
  F_B: 'Finále B'
}

function zpravaNekompletnihoKola(katNazev: string, typ: KoloTyp, jizdy: StavJizdyPrehled[]): string[] {
  const out: string[] = []
  for (const j of jizdy) {
    if (j.celkem > 0 && !j.kompletni) {
      out.push(
        `${KOLO_LABEL[typ]} — ${j.cislo}. jízda: u ${j.chybi} z ${j.celkem} jezdců chybí čas nebo stav (DNF/DNS/DQ)`
      )
    }
  }
  if (out.length === 0 && jizdy.every((j) => j.celkem === 0)) {
    out.push(`${KOLO_LABEL[typ]} — rošt ještě není sestaven nebo bez jezdců`)
  }
  if (out.length > 0 && katNazev) {
    return out.map((z) => `${katNazev}: ${z}`)
  }
  return out
}

export function upozorneniPrechodFaze(
  kategorieId: number,
  kategorieNazev: string,
  cilovaFaze: string,
  ruleset: Ruleset
): UpozorneniPrechod | null {
  let potrebna = ZAVISLOSTI_FAZE[cilovaFaze]
  if (!potrebna) return null

  if (cilovaFaze === 'overall') {
    potrebna =
      ruleset === 'SOTOLINA'
        ? ['Q1', 'Q2', 'Q3', 'F_B', 'F_A']
        : ['Q1', 'Q2', 'Q3', 'SF', 'F']
  }
  if (cilovaFaze === 'final' && ruleset === 'SOTOLINA') {
    potrebna = ['Q1', 'Q2', 'Q3', 'F_B']
  }

  const zpravy: string[] = []
  for (const typ of potrebna) {
    const k = stavKola(kategorieId, typ)
    if (k.stav === 'done') continue
    zpravy.push(...zpravaNekompletnihoKola(kategorieNazev, typ, k.jizdy))
  }

  if (zpravy.length === 0) return null
  return { zpravy }
}

/** Export pro renderer — stejná logika jako v DB. */
export function jizdaJeNekompletni(
  vysledky: { namereny_cas_ms: number | null; stav: string }[]
): boolean {
  if (vysledky.length === 0) return false
  return vysledky.some((r) => !radekJeKompletni(r.namereny_cas_ms, r.stav))
}
