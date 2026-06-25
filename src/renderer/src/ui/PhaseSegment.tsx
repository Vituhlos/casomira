import { memo } from 'react'
import { Tabs } from '@heroui/react'
import { useHorizontalScrollShadow } from '../hooks/useHorizontalScrollShadow'

interface Phase {
  id: string
  label: string
}

interface PhaseSegmentProps {
  phases: Phase[]
  selectedId: string
  onSelect: (id: string) => void
}

/**
 * Segmentový přepínač fází závodu (Q1, Q2, …, Finále, Celkově).
 * Fází může být hodně — overflow-x scroll, ne ořezávání.
 */
export const PhaseSegment = memo(function PhaseSegment({ phases, selectedId, onSelect }: PhaseSegmentProps): React.JSX.Element {
  const { scrollRef, scrollShadowValue, updateScrollShadow, scrollChildIntoView } =
    useHorizontalScrollShadow([phases.length, selectedId])

  return (
    <Tabs
      className="phase-segment"
      selectedKey={selectedId}
      onSelectionChange={(key) => onSelect(String(key))}
    >
      <Tabs.ListContainer className="px-3 pb-3">
        <Tabs.List
          ref={scrollRef}
          aria-label="Fáze závodu"
          data-scroll-shadow={scrollShadowValue}
          onScroll={updateScrollShadow}
        >
          {phases.map((p) => (
            <Tabs.Tab
              key={p.id}
              id={p.id}
              className="whitespace-nowrap"
              onFocus={(event) => scrollChildIntoView(event.currentTarget)}
              onPointerDown={(event) => scrollChildIntoView(event.currentTarget)}
            >
              {p.label}
              <Tabs.Indicator />
            </Tabs.Tab>
          ))}
        </Tabs.List>
      </Tabs.ListContainer>
    </Tabs>
  )
})
