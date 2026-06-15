import { useCallback, useEffect, useState } from 'react'
import type { ZaverStav } from '@shared/types'
import { Button } from '@heroui/react'
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

  useEffect(() => {
    const off = window.api.onDataChanged?.(() => void nactiStav())
    return off
  }, [nactiStav])

  const setVelikost = async (v: number): Promise<void> => {
    await window.api.setFinaleVelikost(kategorieId, v)
    await nactiStav()
  }

  if (!stav) return <div />

  const toggle = (
    <FinaleToggle velikost={stav.finaleVelikost} onChange={(v) => void setVelikost(v)} />
  )

  // Semifinále se nekoná → samostatná informační obrazovka (bez přepínače).
  if (!stav.sfSeKona) {
    return (
      <div>
        <div className="flex flex-wrap items-end justify-between gap-4 px-5 pb-3 pt-4">
          <div>
            <h2 className="text-[22px] font-[680] tracking-tight">Semifinále</h2>
            <p className="mt-0.5 text-[12.5px] text-muted">
              {stav.kvalifikovani} kvalifikovaných · semifinále od {stav.prahSF}
            </p>
          </div>
          <div className="flex items-center gap-2">{toggle}</div>
        </div>
        <div className="px-5 pb-5">
          <div
            className="rounded-lg px-4 py-3 text-[13px] leading-relaxed"
            style={{
              background: 'color-mix(in srgb, var(--color-warning) 12%, transparent)',
              color: 'color-mix(in srgb, var(--color-warning) 60%, var(--color-foreground))'
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
      <span
        style={{
          fontSize: 12.5,
          color: 'color-mix(in srgb, var(--color-foreground) 55%, transparent)'
        }}
      >
        Finále:
      </span>
      <span
        style={{
          display: 'inline-flex',
          gap: 2,
          background: 'color-mix(in srgb, var(--color-foreground) 8%, transparent)',
          borderRadius: 8,
          padding: 2
        }}
      >
        {[8, 10].map((v) => {
          const on = velikost === v
          return (
            <Button
              key={v}
              size="sm"
              variant={on ? 'secondary' : 'ghost'}
              onPress={() => onChange(v)}
              style={{
                height: 24,
                minWidth: 'auto',
                padding: '0 12px',
                fontSize: 12.5,
                fontWeight: on ? 590 : 450,
                borderRadius: 6,
                background: on ? 'var(--color-background)' : 'transparent',
                color: on
                  ? 'var(--color-foreground)'
                  : 'color-mix(in srgb, var(--color-foreground) 55%, transparent)',
                boxShadow: on
                  ? '0 1px 3px color-mix(in srgb, var(--color-foreground) 12%, transparent)'
                  : 'none'
              }}
            >
              {v}
            </Button>
          )
        })}
      </span>
    </span>
  )
}
