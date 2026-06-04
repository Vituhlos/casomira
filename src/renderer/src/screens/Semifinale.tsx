import { useCallback, useEffect, useState } from 'react'
import type { ZaverStav } from '@shared/types'
import { ContentHead } from '../components/ContentHead'
import { SubTabs } from '../components/SubTabs'
import { Results } from './Results'
import { RostGrid } from './RostGrid'

export type SubView = 'rost' | 'res' | 'res_agg'

export function Semifinale({
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

  const setVelikost = async (v: number): Promise<void> => {
    await window.api.setFinaleVelikost(kategorieId, v)
    await nactiStav()
  }

  if (!stav) return <div className="screen-enter" />

  const toggle = (
    <FinaleToggle velikost={stav.finaleVelikost} onChange={(v) => void setVelikost(v)} />
  )

  // Semifinále se nekoná → samostatná informační obrazovka (bez přepínače).
  if (!stav.sfSeKona) {
    return (
      <div className="screen-enter">
        <ContentHead
          title="Semifinále"
          sub={`${stav.kvalifikovani} kvalifikovaných · semifinále od ${stav.prahSF}`}
        >
          {toggle}
        </ContentHead>
        <div style={{ padding: '0 22px 22px' }}>
          <div
            style={{
              padding: '12px 16px',
              borderRadius: 'var(--r-ctrl)',
              background: 'rgba(255,159,10,0.14)',
              color: '#9a6400',
              fontSize: 13,
              lineHeight: 1.5
            }}
          >
            <b>Semifinále se nekoná</b> — jen {stav.kvalifikovani} kvalifikovaných (potřeba{' '}
            {stav.prahSF}). Jezdci postupují rovnou do finále: přejdi na záložku <b>Finále</b>, kde
            se nasadí prvních {stav.finaleVelikost} z Klasifikace po Q3.
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="screen-enter" style={{ '--thead-top': '32px' } as React.CSSProperties}>
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
          typ="SF"
          label="Semifinále"
          navrhFn={() => window.api.navrhSF(kategorieId)}
          extraControls={toggle}
          headSub={`${stav.kvalifikovani} kvalifikovaných · liché pořadí z Q3 → 1. jízda, sudé → 2.`}
          generateLabel={stav.sfHotovo ? 'Přegenerovat SF' : 'Vygenerovat SF'}
          previewTitle="Nasazení semifinále"
          previewText="Liché pořadí z Klasifikace po Q3 → 1. jízda, sudé → 2. jízda. Po nasazení můžeš jezdce ručně upravit."
          jizdaTitle={(c) => `${c}. SF JÍZDA`}
          onChanged={() => void nactiStav()}
        />
      ) : (
        <Results kategorieId={kategorieId} typ="SF" label="Semifinále" extraControls={toggle} />
      )}
    </div>
  )
}

// Přepínač velikosti finále (8 standard / 10 Hobby) — nastavení kategorie.
export function FinaleToggle({
  velikost,
  onChange
}: {
  velikost: number
  onChange: (v: number) => void
}): React.JSX.Element {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
      <span style={{ fontSize: 12.5, color: 'var(--text-2)' }}>Finále:</span>
      <span style={{ display: 'inline-flex', gap: 2, background: 'var(--seg-track)', borderRadius: 8, padding: 2 }}>
        {[8, 10].map((v) => {
          const on = velikost === v
          return (
            <button
              key={v}
              onClick={() => onChange(v)}
              className={on ? 'seg-tab seg-tab--active' : 'seg-tab'}
              style={{
                height: 24,
                padding: '0 12px',
                fontSize: 12.5,
                fontWeight: on ? 590 : 450,
                color: on ? 'var(--text-1)' : 'var(--text-2)',
                borderRadius: 6
              }}
            >
              {v}
            </button>
          )
        })}
      </span>
    </span>
  )
}
