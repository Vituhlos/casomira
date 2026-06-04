// Fáze závodu = horní segmentový přepínač. Lišta se liší podle:
//   - typu závodu (RAC vs RX) — RX vynechává „Klasifikace po Q2".
// Vše ostatní (Q1–Q3, klasifikace, celkově) zůstává společné.

import type { RaceType } from '@shared/types'

export interface Phase {
  id: string
  label: string
}

// Plný seznam fází (RAC Race). Q1/Q2/Q3 (a Semifinále/Finále)
// mají uvnitř přepínač Rošt/Výsledky.
export const PHASES: Phase[] = [
  { id: 'start', label: 'Startovní listina' },
  { id: 'q1', label: 'Q1' },
  { id: 'q2', label: 'Q2' },
  { id: 'class_q2', label: 'Klasifikace po Q2' },
  { id: 'q3', label: 'Q3' },
  { id: 'class_q3', label: 'Klasifikace po Q3' },
  { id: 'sf', label: 'Semifinále' },
  { id: 'final', label: 'Finále' },
  { id: 'overall', label: 'Celkově' }
]

/**
 * Lišta fází pro daný typ závodu. RX Cup vynechává „Klasifikace po Q2"
 * (CLAUDE.md §3b) — interně se klasifikace po Q1+Q2 stejně počítá pro
 * nasazení Q3, jen se nezobrazuje jako samostatná záložka/PDF list.
 */
export function phasesForType(typ: RaceType): Phase[] {
  if (typ === 'RX') return PHASES.filter((p) => p.id !== 'class_q2')
  return PHASES
}

/**
 * Lišta fází pro konkrétní kategorii — zohlední typ závodu.
 * Všechny kategorie (včetně Šotoliny) mají stejnou pipeline: Q1–Q3, SF, Finále.
 */
export function phasesForCategory(typ: RaceType): Phase[] {
  return phasesForType(typ)
}
