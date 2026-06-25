import { Tabs } from '@heroui/react'
import { useHorizontalScrollShadow } from '../hooks/useHorizontalScrollShadow'

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
  const { scrollRef, scrollShadowValue, updateScrollShadow, scrollChildIntoView } =
    useHorizontalScrollShadow([tabs.length, active])

  return (
    <div className="no-print shrink-0">
      <Tabs
        className="sub-tabs"
        selectedKey={active}
        onSelectionChange={(key) => onTab(key as T)}
      >
        <Tabs.ListContainer className="px-5 pt-3">
          <Tabs.List
            ref={scrollRef}
            aria-label="Podfáze"
            data-scroll-shadow={scrollShadowValue}
            onScroll={updateScrollShadow}
          >
            {tabs.map((t) => (
              <Tabs.Tab
                key={t.id}
                id={t.id}
                className="whitespace-nowrap"
                onFocus={(event) => scrollChildIntoView(event.currentTarget)}
                onPointerDown={(event) => scrollChildIntoView(event.currentTarget)}
              >
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
