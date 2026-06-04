// Obrazovka Finále A nebo Finále B pro Šotolinu (CLAUDE.md §3c, §8).
// Šotolina nemá semifinále — místo toho:
//   Finále B = od 11. místa po Q3,
//   Finále A = 10 nejlepších po Q3 (pokud B hotovo, posledních 4 jsou postup z B).

import { useCallback, useEffect, useState } from 'react'
import type { KoloTyp, RostNavrh, ZaverStav } from '@shared/types'
import { ContentHead } from '../components/ContentHead'
import { SubTabs } from '../components/SubTabs'
import { Results } from './Results'
import { RostGrid } from './RostGrid'
import type { SubView } from './Semifinale'

export type Varianta = 'A' | 'B'

interface Konfigurace {
  typ: KoloTyp
  label: string
  jizdaTitle: string
  previewTitle: string
  previewText: string
  generateLabel: (hotovo: boolean) => string
  navrhFn: (kategorieId: number) => Promise<RostNavrh>
  subFn: (stav: ZaverStav) => string
  hotovoFn: (stav: ZaverStav) => boolean
  poznamka?: (stav: ZaverStav) => string | null
}

const KONFIGURACE: Record<Varianta, Konfigurace> = {
  B: {
    typ: 'F_B',
    label: 'Finále B',
    jizdaTitle: 'STARTOVNÍ ROŠT FINÁLE B',
    previewTitle: 'Nasazení Finále B',
    previewText:
      'Jezdci od 11. místa Klasifikace po Q3. Prvních 4 z B postupují do Finále A. Po nasazení můžeš ručně upravit.',
    generateLabel: (hotovo) => (hotovo ? 'Přegenerovat Finále B' : 'Vygenerovat Finále B'),
    navrhFn: (id) => window.api.navrhFinaleB(id),
    subFn: (s) =>
      `${s.kvalifikovani} kvalifikovaných · do B jde ${s.pocetDoB ?? 0} jezdců (od 11. místa)`,
    hotovoFn: (s) => s.finaleBHotovo === true,
    poznamka: (s) =>
      (s.pocetDoB ?? 0) === 0
        ? `Finále B se nekoná — jen ${s.kvalifikovani} kvalifikovaných (potřeba alespoň 11). Jeď rovnou Finále A.`
        : null
  },
  A: {
    typ: 'F_A',
    label: 'Finále A',
    jizdaTitle: 'STARTOVNÍ ROŠT FINÁLE A',
    previewTitle: 'Nasazení Finále A',
    previewText:
      '10 nejlepších z Klasifikace po Q3. Když je Finále B hotové, posledních 4 pozic se nahradí postupujícími z B (1.–4. z B). Po nasazení můžeš ručně upravit.',
    generateLabel: (hotovo) => (hotovo ? 'Přegenerovat Finále A' : 'Vygenerovat Finále A'),
    navrhFn: (id) => window.api.navrhFinaleA(id),
    subFn: (s) => {
      const zdroj = s.finaleBHotovo
        ? '6 nejlepších po Q3 + 4 postupující z Finále B'
        : `${s.pocetDoA ?? 0} nejlepších po Q3`
      return `${s.kvalifikovani} kvalifikovaných · nasazení ${zdroj}`
    },
    hotovoFn: (s) => s.finaleAHotovo === true,
    poznamka: (s) =>
      (s.pocetDoA ?? 0) === 0
        ? 'Nejsou kvalifikovaní jezdci — zadej výsledky kvalifikace.'
        : null
  }
}

export function FinaleAB({
  kategorieId,
  varianta,
  sub,
  onSub
}: {
  kategorieId: number
  varianta: Varianta
  sub: SubView
  onSub: (s: SubView) => void
}): React.JSX.Element {
  const [stav, setStav] = useState<ZaverStav | null>(null)
  const cfg = KONFIGURACE[varianta]

  const nactiStav = useCallback(async (): Promise<void> => {
    setStav(await window.api.getZaverStav(kategorieId))
  }, [kategorieId])

  useEffect(() => {
    void nactiStav()
  }, [nactiStav])

  if (!stav) return <div className="screen-enter" />

  // Pokud se finále nekoná (např. B při < 11 kvalifikovaných), ukaž informaci.
  const poznamka = cfg.poznamka?.(stav) ?? null
  if (poznamka) {
    return (
      <div className="screen-enter">
        <ContentHead title={cfg.label} sub={cfg.subFn(stav)} />
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
            <b>{cfg.label} se nekoná</b> — {poznamka}
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
          typ={cfg.typ}
          label={cfg.label}
          navrhFn={() => cfg.navrhFn(kategorieId)}
          headSub={cfg.subFn(stav)}
          generateLabel={cfg.generateLabel(cfg.hotovoFn(stav))}
          previewTitle={cfg.previewTitle}
          previewText={cfg.previewText}
          jizdaTitle={() => cfg.jizdaTitle}
          onChanged={() => void nactiStav()}
        />
      ) : (
        <Results kategorieId={kategorieId} typ={cfg.typ} label={cfg.label} />
      )}
    </div>
  )
}
