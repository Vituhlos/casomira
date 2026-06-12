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

// Sekundární přepínač Rošt/Výsledky — stejný styl jako PhaseSegment nad ním.
export function SubTabs<T extends string>({
  tabs,
  active,
  onTab
}: SubTabsProps<T>): React.JSX.Element {
  return (
    <div className="no-print">
      <Tabs selectedKey={active} onSelectionChange={(key) => onTab(key as T)}>
        <Tabs.ListContainer className="px-5">
          <Tabs.List aria-label="Podfáze">
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
