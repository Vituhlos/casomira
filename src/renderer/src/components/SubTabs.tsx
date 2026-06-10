// Malý segmentový přepínač pro podzáložky uvnitř obrazovky (např. Rošt / Výsledky
// u Semifinále a Finále). Vizuál navazuje na Segmented — pill-track, slide indikátor.
// Postaveno na HeroUI Tabs. Caller API beze změn (FinaleAB, Finale, Semifinale, QFaze).

import { Tabs } from '@heroui/react'

interface SubTab<T extends string> {
  id: T
  label: string
}

interface SubTabsProps<T extends string> {
  tabs: SubTab<T>[]
  active: T
  onTab: (id: T) => void
}

export function SubTabs<T extends string>({
  tabs,
  active,
  onTab
}: SubTabsProps<T>): React.JSX.Element {
  return (
    <div
      className="no-print"
      style={{
        display: 'flex',
        padding: '0 22px 6px',
        position: 'sticky',
        top: 0,
        zIndex: 10,
        background: 'var(--background)'
      }}
    >
      <Tabs
        className="subtabs"
        selectedKey={active}
        onSelectionChange={(key) => onTab(String(key) as T)}
      >
        <Tabs.ListContainer>
          <Tabs.List aria-label="Podzáložky">
            {tabs.map((t) => (
              <Tabs.Tab key={t.id} id={t.id}>
                {t.label}
                <Tabs.Indicator />
              </Tabs.Tab>
            ))}
          </Tabs.List>
        </Tabs.ListContainer>
      </Tabs>
    </div>
  )
}
