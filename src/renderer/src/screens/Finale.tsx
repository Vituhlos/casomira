import { useCallback, useEffect, useState } from 'react'
import type { ZaverStav } from '@shared/types'
import { SubTabs } from '../components/SubTabs'
import { Results } from './Results'
import { RostGrid } from './RostGrid'
import { FinaleToggle, type SubView } from './Semifinale'

export function Finale({
  kategorieId,
  sub,
  onSub
}: {
  kategorieId: number
  sub: SubView
  onSub: (s: SubView) => void
}): React.JSX.Element {
  const [stav, setStav] = useState<ZaverStav | null>(null)

  const nactiStav = useCallback(async (): Promise<void> => {
    setStav(await window.api.getZaverStav(kategorieId))
  }, [kategorieId])

  useEffect(() => {
    void nactiStav()
  }, [nactiStav])

  useEffect(() => {
    const off = window.api.onDataChanged?.(() => void nactiStav())
    return off
  }, [nactiStav])

  const setVelikost = async (v: number): Promise<void> => {
    await window.api.setFinaleVelikost(kategorieId, v)
    await nactiStav()
  }

  if (!stav) return <div />

  const zdroj = stav.sfSeKona
    ? `z postupujících SF (${Math.floor(stav.finaleVelikost / 2)} z každé jízdy)`
    : `prvních ${stav.finaleVelikost} dle Klasifikace po Q3`
  const toggle = (
    <FinaleToggle velikost={stav.finaleVelikost} onChange={(v) => void setVelikost(v)} />
  )

  return (
    <div>
      <SubTabs
        tabs={[
          { id: 'rost', label: 'Rošt' },
          { id: 'res', label: 'Výsledky' }
        ]}
        active={sub}
        onTab={onSub}
      />
      {sub === 'rost' ? (
        <RostGrid
          kategorieId={kategorieId}
          typ="F"
          label="Finále"
          navrhFn={() => window.api.navrhFinale(kategorieId)}
          extraControls={toggle}
          headSub={`${stav.finaleVelikost} jezdců · nasazení ${zdroj} (1. = pole position)`}
          generateLabel={stav.finaleHotovo ? 'Přegenerovat finále' : 'Vygenerovat finále'}
          previewTitle="Nasazení finále"
          previewText="Pořadí na startu finále (1. = pole position). Po nasazení můžeš ručně upravit."
          jizdaTitle={(c, total) => (total <= 1 ? 'STARTOVNÍ ROŠT' : `${c}. JÍZDA`)}
          onChanged={() => void nactiStav()}
          finaleVelikost={stav.finaleVelikost}
        />
      ) : (
        <Results kategorieId={kategorieId} typ="F" label="Finále" extraControls={toggle} />
      )}
    </div>
  )
}
