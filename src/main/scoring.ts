// scoring.ts — BODOVÁ LOGIKA (srdce závodu). Čistá funkce, žádná databáze.
//
// Pravidla pocházejí z CLAUDE.md §4–§5 (ne z prototypu — ten měl bodování
// zjednodušené a špatné!). Logika je PARAMETRIZOVANÁ: žebříček (pozice→body)
// i penalizace se předávají zvenčí, takže stejná funkce zvládne RAC/RX
// (STANDARD) i Šotolinu (SOTOLINA) — liší se jen data z tabulek `zebricek`
// a `pravidla`.
//
// Bodování se počítá VŽDY V RÁMCI JEDNÉ JÍZDY (CLAUDE.md §5, §7):
//   - „poslední místo" = počet jezdců v této jízdě,
//   - 1. v jízdě = nejvíc bodů (50 u STANDARD), atd.

import type { Stav } from '../shared/types'

export interface JizdaVstup {
  jezdec_id: number
  /** Výsledný čas pro řazení (naměřeno + penalizace), nebo null. */
  cas_ms: number | null
  stav: Stav
}

export interface JizdaVypocet {
  jezdec_id: number
  poradi: number | null // null = ještě nezadáno (OK bez času)
  body: number | null
}

// Penalizační pravidla dle ruleset (CLAUDE.md §5).
// STANDARD: offset od bodů za POSLEDNÍ místo (DNF −1, DNS −5, DQ −10).
// SOTOLINA: pevné body (DNS 0, DNF 0, DQ −20). Nepoužité hodnoty = null.
export interface Penalizace {
  dnf_offset: number | null
  dns_offset: number | null
  dq_offset: number | null
  dnf_body: number | null
  dns_body: number | null
  dq_body: number | null
}

// Pořadí „nedojezdů" mezi sebou (za platné časy): DNF, pak DNS, pak DQ.
const STAV_RANK: Record<Stav, number> = { OK: 3, DNF: 0, DNS: 1, DQ: 2 }

function penalizacniBody(stav: Stav, bodyZaPosledni: number, p: Penalizace): number {
  switch (stav) {
    case 'DNF':
      return p.dnf_offset !== null ? bodyZaPosledni + p.dnf_offset : (p.dnf_body ?? 0)
    case 'DNS':
      return p.dns_offset !== null ? bodyZaPosledni + p.dns_offset : (p.dns_body ?? 0)
    case 'DQ':
      return p.dq_offset !== null ? bodyZaPosledni + p.dq_offset : (p.dq_body ?? 0)
    default:
      return 0
  }
}

/**
 * Spočítá pořadí a body pro JEDNU jízdu.
 * @param vstupy        všichni jezdci přiřazení do jízdy
 * @param bodyZaPozici  žebříček: pozice (1..) → body (z tabulky `zebricek`)
 * @param penalizace    pravidla pro DNF/DNS/DQ (z tabulky `pravidla`)
 */
export function spocitejJizdu(
  vstupy: JizdaVstup[],
  bodyZaPozici: (pozice: number) => number,
  penalizace: Penalizace
): JizdaVypocet[] {
  // Dokončili s platným časem → řadí se podle času (nejrychlejší = 1.).
  const dojeli = vstupy
    .filter((v) => v.stav === 'OK' && v.cas_ms !== null)
    .sort((a, b) => (a.cas_ms as number) - (b.cas_ms as number))

  // Základ pro penalizace = body POSLEDNÍHO jezdce S ČASEM (CLAUDE.md §5,
  // upřesněno): DNF/DNS/DQ se počítají od bodů posledního dojetého, ne od
  // velikosti jízdy. Když ještě nikdo nedojel, ber 1. místo jako rozumný základ.
  const bodyZaPosledni = bodyZaPozici(Math.max(1, dojeli.length))

  // DNF/DNS/DQ → řadí se ZA platné časy (CLAUDE.md: nejdřív kdo dojel).
  const nedojeli = vstupy
    .filter((v) => v.stav !== 'OK')
    .sort((a, b) => STAV_RANK[a.stav] - STAV_RANK[b.stav] || a.jezdec_id - b.jezdec_id)

  // OK bez zadaného času = zatím nezadáno → bez pořadí a bodů.
  const cekajici = vstupy.filter((v) => v.stav === 'OK' && v.cas_ms === null)

  const out: JizdaVypocet[] = []
  let poradi = 0

  for (const v of dojeli) {
    poradi++
    out.push({ jezdec_id: v.jezdec_id, poradi, body: bodyZaPozici(poradi) })
  }
  for (const v of nedojeli) {
    poradi++
    out.push({ jezdec_id: v.jezdec_id, poradi, body: penalizacniBody(v.stav, bodyZaPosledni, penalizace) })
  }
  for (const v of cekajici) {
    out.push({ jezdec_id: v.jezdec_id, poradi: null, body: null })
  }

  return out
}

/**
 * Přepočte pořadí po ručním posunu (`rucni_poradi`) — ostatní jezdci se posunou,
 * body dojetých z žebříčku dle nového pořadí OK; DNF/DNS/DQ penalizace od posledního dojetého.
 */
export function aplikujRucniPoradi(
  vysl: JizdaVypocet[],
  stavByJezdec: Map<number, Stav>,
  casByJezdec: Map<number, number | null>,
  rucniPoradi: Map<number, number>,
  bodyZaPozici: (pozice: number) => number,
  penalizace: Penalizace
): JizdaVypocet[] {
  if (rucniPoradi.size === 0) return vysl

  const ranked = vysl.filter((v) => v.poradi !== null).sort((a, b) => a.poradi! - b.poradi!)
  const waiting = vysl.filter((v) => v.poradi === null)
  let lineup = ranked.map((v) => v.jezdec_id)

  const manuals = [...rucniPoradi.entries()].sort((a, b) => a[1] - b[1])
  for (const [jezdecId, target] of manuals) {
    const idx = lineup.indexOf(jezdecId)
    if (idx === -1) continue
    lineup.splice(idx, 1)
    const insertAt = Math.max(0, Math.min(target - 1, lineup.length))
    lineup.splice(insertAt, 0, jezdecId)
  }

  const okWithTime = lineup.filter((id) => {
    const stav = stavByJezdec.get(id)
    const cas = casByJezdec.get(id)
    return stav === 'OK' && cas !== null && cas !== undefined
  }).length
  const bodyZaPosledni = bodyZaPozici(Math.max(1, okWithTime))

  const out: JizdaVypocet[] = []
  let okRank = 0
  for (let i = 0; i < lineup.length; i++) {
    const jezdec_id = lineup[i]
    const poradi = i + 1
    const stav = stavByJezdec.get(jezdec_id) ?? 'OK'
    const cas = casByJezdec.get(jezdec_id) ?? null
    let body: number
    if (stav === 'OK' && cas !== null) {
      okRank++
      body = bodyZaPozici(okRank)
    } else if (stav !== 'OK') {
      body = penalizacniBody(stav, bodyZaPosledni, penalizace)
    } else {
      body = 0
    }
    out.push({ jezdec_id, poradi, body })
  }

  return [...out, ...waiting]
}
