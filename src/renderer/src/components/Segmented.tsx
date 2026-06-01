import type { Phase } from '../data/phases'

interface SegmentedProps {
  active: string
  /** Seznam fází vykreslených v liště — App ho dodá podle typu závodu (RAC vs RX). */
  phases: Phase[]
  onTab: (id: string) => void
}

export function Segmented({ active, phases, onTab }: SegmentedProps): React.JSX.Element {
  return (
    <div
      className="no-print"
      style={{ padding: '12px 22px 4px', textAlign: 'center', flexShrink: 0 }}
    >
      <div
        style={{
          display: 'inline-flex', // obaluje jen záložky → textAlign:center je jako blok vystředí
          maxWidth: '100%', // při úzkém okně se zúží a vodorovně scrolluje
          alignItems: 'center',
          gap: 2,
          background: 'var(--seg-track)',
          borderRadius: 9,
          padding: 2,
          overflowX: 'auto',
          scrollbarWidth: 'none'
        }}
      >
        {phases.map((p, i) => {
          const on = p.id === active
          const prevOn = i > 0 && phases[i - 1].id === active
          return (
            <button
              key={p.id}
              onClick={() => onTab(p.id)}
              className={on ? 'seg-tab seg-tab--active' : 'seg-tab'}
              style={{
                position: 'relative',
                height: 28,
                padding: '0 13px',
                whiteSpace: 'nowrap',
                font: 'inherit',
                fontSize: 12.5,
                fontWeight: on ? 590 : 450,
                color: on ? 'var(--text-1)' : 'var(--text-2)',
                borderRadius: 7,
                flexShrink: 0
              }}
            >
              {!on && !prevOn && i !== 0 && (
                <span
                  style={{
                    position: 'absolute',
                    left: -1,
                    top: 7,
                    bottom: 7,
                    width: 1,
                    background: 'var(--divider)'
                  }}
                />
              )}
              {p.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}
