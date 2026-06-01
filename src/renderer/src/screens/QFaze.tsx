import type { KoloTyp } from '@shared/types'
import { SubTabs } from '../components/SubTabs'
import { Grids } from './Grids'
import { Results } from './Results'
import type { SubView } from './Semifinale'

// Jedna kvalifikační fáze (Q1/Q2/Q3) s vnitřním přepínačem Rošt / Výsledky —
// stejný přepínač jako u Semifinále a Finále. Vlastní logika roštů i výsledků
// zůstává v Grids/Results beze změny, tady je jen společný obal.
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
  return (
    <div className="screen-enter">
      <SubTabs
        tabs={[
          { id: 'rost', label: 'Rošt' },
          { id: 'res', label: 'Výsledky' }
        ]}
        active={sub}
        onTab={onSub}
      />
      {sub === 'rost' ? (
        <Grids kategorieId={kategorieId} typ={typ} label={label} />
      ) : (
        <Results kategorieId={kategorieId} typ={typ} label={label} />
      )}
    </div>
  )
}
