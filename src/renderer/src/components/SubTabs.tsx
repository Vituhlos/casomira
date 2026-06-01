// Malý segmentový přepínač pro podzáložky uvnitř obrazovky (např. Rošt / Výsledky
// u Semifinále a Finále). Vzhledem navazuje na přepínač fází (.seg-tab).

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
    <div className="no-print" style={{ display: 'flex', padding: '0 22px 6px' }}>
      <span
        style={{
          display: 'inline-flex',
          gap: 2,
          background: 'var(--seg-track)',
          borderRadius: 8,
          padding: 2
        }}
      >
        {tabs.map((t) => {
          const on = t.id === active
          return (
            <button
              key={t.id}
              onClick={() => onTab(t.id)}
              className={on ? 'seg-tab seg-tab--active' : 'seg-tab'}
              style={{
                height: 26,
                padding: '0 16px',
                fontSize: 12.5,
                fontWeight: on ? 590 : 450,
                color: on ? 'var(--text-1)' : 'var(--text-2)',
                borderRadius: 6
              }}
            >
              {t.label}
            </button>
          )
        })}
      </span>
    </div>
  )
}
