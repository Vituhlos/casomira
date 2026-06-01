import type { CSSProperties, ReactNode } from 'react'
import { Icon, type IconName } from './Icon'

type BtnVariant = 'primary' | 'bezel' | 'plain' | 'danger'
type BtnSize = 'sm' | 'md' | 'lg'

interface BtnProps {
  children?: ReactNode
  variant?: BtnVariant
  icon?: IconName
  onClick?: () => void
  title?: string
  size?: BtnSize
  style?: CSSProperties
  disabled?: boolean
}

// Tlačítko v duchu macOS. Vzhled a interaktivní stavy (hover/active/focus) řeší
// třídy v app.css (.btn / .btn--*); tady jen rozměry a obsah.
export function Btn({
  children,
  variant = 'bezel',
  icon,
  onClick,
  title,
  size = 'md',
  style,
  disabled
}: BtnProps): React.JSX.Element {
  const ht = size === 'lg' ? 34 : size === 'sm' ? 24 : 28
  return (
    <button
      className={`btn btn--${variant}`}
      title={title}
      disabled={disabled}
      onClick={disabled ? undefined : onClick}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        height: ht,
        padding: size === 'lg' ? '0 16px' : '0 12px',
        borderRadius: 'var(--r-ctrl)',
        font: 'inherit',
        fontSize: size === 'lg' ? 14 : 13,
        fontWeight: variant === 'bezel' ? 500 : 510,
        whiteSpace: 'nowrap',
        lineHeight: 1,
        ...style
      }}
    >
      {icon && <Icon name={icon} size={size === 'lg' ? 17 : 15} />}
      {children}
    </button>
  )
}

/** RX Cup je rozpracovaný — badge jen upozornění, ne zámek funkce. */
export function DevBadge({ title = 'Formát je ve vývoji' }: { title?: string }): React.JSX.Element {
  return (
    <span className="dev-badge" title={title}>
      Ve vývoji
    </span>
  )
}

export type Stav = 'DNF' | 'DNS' | 'DQ'

// Stavový odznak (hranatý jako tlačítka). DNF oranžová, DNS šedá, DQ červená (CLAUDE.md §2c).
export function Badge({ status }: { status: Stav }): React.JSX.Element | null {
  const dark = document.documentElement.dataset.theme === 'dark'
  const map: Record<Stav, { fg: string; bg: string; dfg: string; dbg: string }> = {
    DNF: { fg: '#9a6400', bg: 'rgba(255,159,10,0.16)', dfg: '#ffb340', dbg: 'rgba(255,159,10,0.22)' },
    DNS: {
      fg: 'var(--text-2)',
      bg: 'rgba(120,120,128,0.14)',
      dfg: 'var(--text-2)',
      dbg: 'rgba(120,120,128,0.22)'
    },
    DQ: { fg: '#c93636', bg: 'rgba(255,59,48,0.13)', dfg: '#ff6961', dbg: 'rgba(255,69,58,0.20)' }
  }
  const m = map[status]
  if (!m) return null
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        height: 20,
        padding: '0 8px',
        borderRadius: 'var(--r-ctrl)',
        fontSize: 11,
        fontWeight: 600,
        letterSpacing: '0.02em',
        background: dark ? m.dbg : m.bg,
        color: dark ? m.dfg : m.fg
      }}
    >
      {status}
    </span>
  )
}

// Medailový puntík pro 1./2./3. místo.
export function Medal({ rank }: { rank: number }): React.JSX.Element | null {
  const c: Record<number, string> = { 1: '#d8a32b', 2: '#9ba0a6', 3: '#bd7b43' }
  if (!c[rank]) return null
  return (
    <span
      style={{
        display: 'inline-block',
        width: 7,
        height: 7,
        borderRadius: 99,
        background: c[rank],
        marginRight: 8,
        verticalAlign: 'middle'
      }}
    />
  )
}
