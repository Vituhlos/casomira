import type { KoloTyp } from '@shared/types'
import { SubTabs } from '../components/SubTabs'
import { Grids } from './Grids'
import { Results } from './Results'
import { QVysledky } from './QVysledky'
import type { SubView } from './Semifinale'

// Jedna kvalifikační fáze (Q1/Q2/Q3) s vnitřním přepínačem.
// Q1 a Q2: Rošt / Výsledky (bez bodů) / Výsledky po Q1|Q2 (s body).
// Q3: klasický Rošt / Výsledky (s body) — beze změny.
export function QFaze({
  kategorieId,
  typ,
  label,
  sub,
  onSub
}: {
  kategorieId: number
  typ: KoloTyp
  label: string
  sub: SubView
  onSub: (s: SubView) => void
}): React.JSX.Element {
  const jeKvalifikacniQ = typ === 'Q1' || typ === 'Q2'

  const tabs = jeKvalifikacniQ
    ? [
        { id: 'rost', label: 'Rošt' },
        { id: 'res', label: 'Výsledky' },
        { id: 'res_agg', label: `Výsledky po ${label}` }
      ]
    : [
        { id: 'rost', label: 'Rošt' },
        { id: 'res', label: 'Výsledky' }
      ]

  return (
    <div className="screen-enter" style={{ '--thead-top': '32px' } as React.CSSProperties}>
      <SubTabs tabs={tabs} active={sub} onTab={onSub} />
      {sub === 'rost' && <Grids kategorieId={kategorieId} typ={typ} label={label} />}
      {sub === 'res' && (
        <Results
          kategorieId={kategorieId}
          typ={typ}
          label={label}
          bezBodovani={jeKvalifikacniQ}
        />
      )}
      {sub === 'res_agg' && jeKvalifikacniQ && (
        <QVysledky kategorieId={kategorieId} typ={typ} label={label} />
      )}
    </div>
  )
}
