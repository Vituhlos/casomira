import type { VysledekRadek } from '@shared/types'

/** Jezdec bez času a bez DNF/DNS/DQ = nekompletní. */
export function radekNekompletni(r: Pick<VysledekRadek, 'namereny_cas_ms' | 'stav'>): boolean {
  return r.namereny_cas_ms == null && r.stav === 'OK'
}

export function jizdaNekompletni(vysledky: VysledekRadek[]): boolean {
  if (vysledky.length === 0) return false
  return vysledky.some(radekNekompletni)
}
