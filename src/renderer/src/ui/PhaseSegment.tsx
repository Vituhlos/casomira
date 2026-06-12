import { Tabs } from '@heroui/react'

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
export function PhaseSegment({ phases, selectedId, onSelect }: PhaseSegmentProps): React.JSX.Element {
  return (
    <Tabs selectedKey={selectedId} onSelectionChange={(key) => onSelect(String(key))}>
      <Tabs.ListContainer className="overflow-x-auto">
        <Tabs.List aria-label="Fáze závodu">
          {phases.map((p) => (
            <Tabs.Tab key={p.id} id={p.id} className="whitespace-nowrap">
              {p.label}
              <Tabs.Indicator />
            </Tabs.Tab>
          ))}
        </Tabs.List>
      </Tabs.ListContainer>
    </Tabs>
  )
}
