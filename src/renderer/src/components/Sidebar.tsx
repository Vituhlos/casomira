import type { Kategorie } from '@shared/types'
import { Icon, type IconName } from './Icon'
import { APP_NAME, APP_VERSION_LABEL } from '../lib/version'

// Ikona podle názvu kategorie (volně dle prototypu).
function iconFor(nazev: string): IconName {
  if (/cup|pohár/i.test(nazev)) return 'cup'
  if (/junior|cross|šotolina|sotolina/i.test(nazev)) return 'flag'
  return 'car'
}

interface SidebarProps {
  kategorie: Kategorie[]
  activeCat: number | null
  onCat: (id: number) => void
  onZpet: () => void
  operator: string
  datum: string
}

export function Sidebar({
  kategorie,
  activeCat,
  onCat,
  onZpet,
  operator,
  datum
}: SidebarProps): React.JSX.Element {
  return (
    <aside
      style={{
        width: 'var(--sidebar-w)',
        flexShrink: 0,
        background: 'var(--sidebar)',
        backdropFilter: 'blur(50px) saturate(1.8)',
        WebkitBackdropFilter: 'blur(50px) saturate(1.8)',
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        borderRight: '0.5px solid var(--hairline)'
      }}
    >
      {/* Prostor zarovnaný s horní lištou napravo. */}
      <div style={{ height: 'var(--toolbar-h)', flexShrink: 0 }} />

      <div style={{ padding: '0 10px 6px' }}>
        <button
          className="side-item"
          title="Zpět na seznam závodů"
          onClick={onZpet}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 5,
            color: 'var(--text-2)',
            font: 'inherit',
            fontSize: 12.5,
            height: 28,
            padding: '0 8px',
            borderRadius: 'var(--r-ctrl)',
            width: '100%',
            textAlign: 'left'
          }}
        >
          <Icon name="chevron" size={13} style={{ transform: 'scaleX(-1)' }} /> Závody
        </button>
      </div>

      <div
        style={{
          padding: '4px 16px 6px',
          fontSize: 11,
          fontWeight: 600,
          color: 'var(--text-3)',
          letterSpacing: '0.02em'
        }}
      >
        Kategorie
      </div>

      <nav style={{ flex: 1, overflowY: 'auto', padding: '0 8px 10px' }}>
        {kategorie.map((c) => (
          <SideItem
            key={c.id}
            icon={iconFor(c.nazev)}
            label={c.nazev}
            count={c.pocet}
            active={c.id === activeCat}
            onClick={() => onCat(c.id)}
          />
        ))}
      </nav>

      <div
        style={{
          borderTop: '0.5px solid var(--hairline)',
          padding: '9px 16px',
          display: 'flex',
          alignItems: 'center',
          gap: 10
        }}
      >
        <span
          style={{
            width: 28,
            height: 28,
            borderRadius: 99,
            background: 'linear-gradient(160deg,#8a8d93,#5c5f66)',
            color: '#fff',
            display: 'grid',
            placeItems: 'center',
            fontSize: 11,
            fontWeight: 600,
            flexShrink: 0
          }}
        >
          ČM
        </span>
        <span style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.3, minWidth: 0 }}>
          <span style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--text-1)' }}>{operator}</span>
          <span className="tnum" style={{ fontSize: 11.5, color: 'var(--text-3)' }}>
            {datum}
          </span>
        </span>
      </div>

      {/* Brand patička: název appky + verze z package.json. Decentní, malé,
          šedé — jen aby uživatel viděl, kterou verzi má nainstalovanou. */}
      <div
        style={{
          padding: '6px 16px 9px',
          fontSize: 10.5,
          color: 'var(--text-3)',
          textAlign: 'center',
          letterSpacing: '0.02em',
          whiteSpace: 'nowrap'
        }}
      >
        {APP_NAME} <span className="tnum">{APP_VERSION_LABEL}</span>
      </div>
    </aside>
  )
}

interface SideItemProps {
  icon: IconName
  label: string
  count: number
  active: boolean
  onClick: () => void
}

function SideItem({ icon, label, count, active, onClick }: SideItemProps): React.JSX.Element {
  return (
    <button
      onClick={onClick}
      className={active ? 'side-item side-item--active' : 'side-item'}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 9,
        width: '100%',
        height: 32,
        padding: '0 9px',
        margin: '1px 0',
        borderRadius: 'var(--r-ctrl)',
        color: active ? '#fff' : 'var(--text-1)',
        textAlign: 'left',
        font: 'inherit'
      }}
    >
      <Icon name={icon} size={15} style={{ color: active ? 'rgba(255,255,255,0.9)' : 'var(--text-2)' }} />
      <span style={{ flex: 1, fontSize: 13, fontWeight: active ? 510 : 450 }}>{label}</span>
      <span
        className="tnum"
        style={{ fontSize: 12, color: active ? 'rgba(255,255,255,0.8)' : 'var(--text-3)' }}
      >
        {count}
      </span>
    </button>
  )
}
