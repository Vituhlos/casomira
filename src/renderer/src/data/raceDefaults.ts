import type { RaceType } from '@shared/types'

// Standardní kategorie dle typu závodu — předvyplní se při zakládání, dají se
// upravit (smazat, přidat, přejmenovat, označit jako Šotolina). Výchozí ruleset
// je STANDARD; Šotolinu si uživatel přidá/označí ručně.
export const VYCHOZI_KATEGORIE: Record<RaceType, string[]> = {
  RAC: [
    'Junior',
    'N1400',
    'N1600',
    'N1600+',
    'S1600',
    'S1600+',
    'Tuning',
    'Škoda Cup',
    'Cross Cup',
    'Dámský pohár'
  ],
  RX: ['DX', 'N1400', 'N1600', 'N1600+', 'S1400', 'S1600', 'S1600+', 'S4x4', 'Škoda Cup']
}

export const TYP_POPIS: Record<RaceType, string> = {
  RAC: 'RAC Race (Hobby Rallycross)',
  RX: 'RX Cup'
}
