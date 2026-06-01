import type { StavFaze } from '@shared/stav'
import type { VysledekRadek } from '@shared/types'

/** Jezdec bez času a bez DNF/DNS/DQ = nekompletní. */
export function radekNekompletni(r: Pick<VysledekRadek, 'namereny_cas_ms' | 'stav'>): boolean {
  return r.namereny_cas_ms == null && r.stav === 'OK'
}

export function jizdaNekompletni(vysledky: VysledekRadek[]): boolean {
  if (vysledky.length === 0) return false
  return vysledky.some(radekNekompletni)
}

export const STAV_FAZE_LABEL: Record<StavFaze, string> = {
  empty: 'prázdné',
  partial: 'částečně',
  done: 'hotovo'
}

export const STAV_FAZE_SYMBOL: Record<StavFaze, string> = {
  empty: '○',
  partial: '◐',
  done: '✓'
}
