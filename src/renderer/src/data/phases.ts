// Fáze závodu = horní segmentový přepínač. Lišta se liší podle:
//   - typu závodu (RAC vs RX) — RX vynechává „Klasifikace po Q2",
//   - rulesetu kategorie (STANDARD vs SOTOLINA) — Šotolina má místo
//     Semifinále/Finále dvojici Finále B → Finále A (CLAUDE.md §3c).
// Vše ostatní (Q1–Q3, klasifikace, celkově) zůstává společné.

import type { RaceType, Ruleset } from '@shared/types'

export interface Phase {
  id: string
  label: string
}

// Plný seznam fází (RAC Race + STANDARD kategorie). Q1/Q2/Q3 (a Semifinále/
// Finále/Finále A/B) mají uvnitř přepínač Rošt/Výsledky.
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
 *
 * Pozor: tahle funkce nezná ruleset kategorie. Pro správnou lištu (vč.
 * Šotoliny s Finále A/B) použij `phasesForCategory`.
 */
export function phasesForType(typ: RaceType): Phase[] {
  if (typ === 'RX') return PHASES.filter((p) => p.id !== 'class_q2')
  return PHASES
}

/**
 * Lišta fází pro konkrétní kategorii — zohlední typ závodu i ruleset:
 *   STANDARD (RAC/RX): klasická pipeline (Q1–Q3, případně klasifikace, SF, Finále).
 *   SOTOLINA:          místo SF/Finále jede Finále B → Finále A
 *                      (a klasifikace po Q2 se zobrazuje vždy — Šotolina ji potřebuje
 *                       kvůli sloupci Los a seedingu Q3 ve skupinách).
 */
export function phasesForCategory(typ: RaceType, ruleset: Ruleset): Phase[] {
  if (ruleset === 'SOTOLINA') {
    return [
      { id: 'start', label: 'Startovní listina' },
      { id: 'q1', label: 'Q1' },
      { id: 'q2', label: 'Q2' },
      { id: 'class_q2', label: 'Klasifikace po Q2' },
      { id: 'q3', label: 'Q3' },
      { id: 'class_q3', label: 'Klasifikace po Q3' },
      { id: 'final_b', label: 'Finále B' },
      { id: 'final_a', label: 'Finále A' },
      { id: 'overall', label: 'Celkově' }
    ]
  }
  return phasesForType(typ)
}
