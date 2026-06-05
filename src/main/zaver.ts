// zaver.ts — ČISTÁ logika závěru závodu (kvalifikace, nasazení SF/finále,
// celkové pořadí). Žádná databáze — repo dodá data a tyto funkce zavolá.
//
// Platí pro RAC Race i RX Cup (STANDARD ruleset).
// Pravidla: CLAUDE.md §8 (kvalifikace, SF), §9 (celkově).

/**
 * Kvalifikace do SF/finále (RAC, §8): jezdec musí mít aspoň jednu Q jízdu
 * KOMPLETNÍ (dojel s časem) A zároveň aspoň DVĚ jízdy, do kterých reálně nastoupil.
 * DQ a DNS se nepočítají jako nastoupení — pouze OK a DNF.
 * Příklady: OK+DNF+DNS ✓, OK+DNS+DNS ✗, OK+DQ+DNS ✗, DNF+DNF+DNS ✗.
 * @param dokoncil          počet Q jízd se stavem OK a měřeným časem
 * @param odstartovalBezDq  počet Q jízd se stavem OK nebo DNF (NE DNS/DQ)
 */
export function jeKvalifikovan(dokoncil: number, odstartovalBezDq: number): boolean {
  return dokoncil >= 1 && odstartovalBezDq >= 2
}

/** Práh počtu kvalifikovaných, od kterého se koná semifinále (RAC). */
export const PRAH_SF = 12

/**
 * Nasazení do semifinále (§8): z pořadí dle Klasifikace po Q3 (jen kvalifikovaní)
 * jdou liché pozice do 1. jízdy, sudé do 2. jízdy. Max 16 jezdců (2×8).
 * @param poradiQ3 jezdec_id seřazení dle Klasifikace po Q3 (nejlepší první)
 */
export function nasazSF(poradiQ3: number[]): { heat1: number[]; heat2: number[] } {
  const top = poradiQ3.slice(0, 16)
  const heat1: number[] = []
  const heat2: number[] = []
  top.forEach((id, i) => {
    if (i % 2 === 0) heat1.push(id) // 1., 3., 5., … (liché pořadí)
    else heat2.push(id) // 2., 4., 6., … (sudé pořadí)
  })
  return { heat1, heat2 }
}

/**
 * Nasazení finále z postupujících SF (§E): spáruje jezdce na STEJNÉ pozici
 * z obou SF jízd; z dvojice jede dřív ten, kdo má víc bodů po Q3 (při shodě
 * první z 1. SF jízdy). Tím vznikne pořadí na startu finále.
 * @param postup1 postupující z 1. SF jízdy, seřazení dle SF pořadí (1.,2.,…)
 * @param postup2 postupující z 2. SF jízdy
 * @param bodyQ3  jezdec_id → body po Q3
 */
export function nasazFinaleZeSF(
  postup1: number[],
  postup2: number[],
  bodyQ3: Map<number, number>
): number[] {
  const out: number[] = []
  const dvojic = Math.max(postup1.length, postup2.length)
  for (let p = 0; p < dvojic; p++) {
    const a = postup1[p]
    const b = postup2[p]
    if (a !== undefined && b !== undefined) {
      if ((bodyQ3.get(a) ?? 0) >= (bodyQ3.get(b) ?? 0)) {
        out.push(a, b)
      } else {
        out.push(b, a)
      }
    } else if (a !== undefined) {
      out.push(a)
    } else if (b !== undefined) {
      out.push(b)
    }
  }
  return out
}

export interface CelkovyVstup {
  jezdec_id: number
  pq: number | null // pořadí po Q3
  psf: number | null // pořadí v SF (v rámci jízdy)
  pf: number | null // pořadí ve finále
  bq: number // body po Q3 (jen podklad, NEpřičítá se)
}

/**
 * Celkové pořadí (§9): NEsčítá body. Pořadí řídí finále:
 *   1) finalisté podle výsledku finále,
 *   2) za nimi ti, co byli v SF ale nepostoupili, podle pořadí v SF
 *      (při shodě pozice rozhodují body po Q3),
 *   3) zbytek podle Klasifikace po Q3.
 * Vrací jezdec_ids v celkovém pořadí.
 */
export function celkovePoradi(vstupy: CelkovyVstup[]): number[] {
  const finaliste = vstupy
    .filter((v) => v.pf !== null)
    .sort((a, b) => (a.pf as number) - (b.pf as number))
  const finalSet = new Set(finaliste.map((v) => v.jezdec_id))

  const sfNepostoupili = vstupy
    .filter((v) => v.psf !== null && !finalSet.has(v.jezdec_id))
    .sort((a, b) => (a.psf as number) - (b.psf as number) || b.bq - a.bq)
  const sfSet = new Set(vstupy.filter((v) => v.psf !== null).map((v) => v.jezdec_id))

  const zbytek = vstupy
    .filter((v) => !finalSet.has(v.jezdec_id) && !sfSet.has(v.jezdec_id))
    .sort((a, b) => (a.pq ?? Number.POSITIVE_INFINITY) - (b.pq ?? Number.POSITIVE_INFINITY))

  return [...finaliste, ...sfNepostoupili, ...zbytek].map((v) => v.jezdec_id)
}

