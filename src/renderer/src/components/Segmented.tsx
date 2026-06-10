import { Tabs } from '@heroui/react'
import type { Phase } from '../data/phases'

interface SegmentedProps {
  active: string
  /** Seznam fází vykreslených v liště — App ho dodá podle typu závodu (RAC vs RX). */
  phases: Phase[]
  onTab: (id: string) => void
}

// Fázový přepínač (Startovní listina, Q1, Q2, …) postavený na HeroUI Tabs.
// Vizuál: pill-track s animovaným indikátorem (slide 250ms ease-out-fluid).
// Přetékání: scroll v .segmented .tabs__list-container, scrollbar skrytý.
// Caller API beze změn — App.tsx nedotčen.
export function Segmented({ active, phases, onTab }: SegmentedProps): React.JSX.Element {
  return (
    <div
      className="no-print"
      style={{ padding: '12px 22px 4px', textAlign: 'center', flexShrink: 0 }}
    >
      <Tabs
        className="segmented"
        selectedKey={active}
        onSelectionChange={(key) => onTab(String(key))}
      >
        <Tabs.ListContainer>
          <Tabs.List aria-label="Fáze závodu">
            {phases.map((p, i) => (
              <Tabs.Tab key={p.id} id={p.id}>
                {i > 0 && <Tabs.Separator />}
                {p.label}
                <Tabs.Indicator />
              </Tabs.Tab>
            ))}
          </Tabs.List>
        </Tabs.ListContainer>
      </Tabs>
    </div>
  )
}
