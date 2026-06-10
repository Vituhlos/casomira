import type { CSSProperties, MouseEvent, ReactNode } from 'react'
import { Icon, type IconName } from './Icon'

type BtnVariant = 'primary' | 'bezel' | 'plain' | 'danger'
type BtnSize = 'sm' | 'md' | 'lg'

interface BtnProps {
  children?: ReactNode
  variant?: BtnVariant
  icon?: IconName
  onClick?: (e?: MouseEvent<HTMLButtonElement>) => void
  title?: string
  size?: BtnSize
  style?: CSSProperties
  disabled?: boolean
}

// Tlačítko v duchu macOS. Veškerý vzhled a interakce je inline (Tailwind + CSS vars) —
// žádná závislost na externích CSS třídách (.btn, .btn--*).
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

  const base = [
    'inline-flex items-center justify-center gap-[6px]',
    'border-none cursor-pointer whitespace-nowrap leading-none select-none',
    'transition-[background,filter,box-shadow,transform] duration-[130ms] ease-linear',
    'focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-offset-0',
    'disabled:opacity-40 disabled:cursor-default disabled:pointer-events-none',
  ]

  const variantCls: Record<BtnVariant, string[]> = {
    bezel: [
      'bg-[var(--surface)] text-[var(--foreground)]',
      'shadow-[var(--shadow-btn)]',
      'hover:bg-black/[.06] dark:hover:bg-white/[.16]',
      'active:bg-black/[.11] dark:active:bg-white/[.22] active:translate-y-px',
    ],
    primary: [
      'bg-[var(--accent)] text-[var(--accent-foreground)]',
      'shadow-[0_1px_1.5px_rgba(0,0,0,0.12)]',
      'hover:brightness-[1.06]',
      'active:brightness-90 active:translate-y-px',
    ],
    plain: [
      'bg-transparent text-[var(--accent)]',
      'hover:bg-black/[.045] dark:hover:bg-white/[.06]',
    ],
    danger: [
      'bg-[#e0443e] text-white',
      'shadow-[0_1px_1.5px_rgba(0,0,0,0.12)]',
      'hover:bg-[#d2352f]',
      'active:brightness-90 active:translate-y-px',
    ],
  }

  return (
    <button
      className={[...base, ...variantCls[variant]].join(' ')}
      title={title}
      disabled={disabled}
      onClick={disabled ? undefined : (e) => onClick?.(e)}
      style={{
        height: ht,
        padding: size === 'lg' ? '0 16px' : '0 12px',
        borderRadius: 'var(--radius)',
        font: 'inherit',
        fontSize: size === 'lg' ? 14 : 13,
        fontWeight: variant === 'bezel' ? 500 : 510,
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
    <span
      title={title}
      className="inline-flex items-center h-[18px] px-[7px] rounded-[var(--radius)] text-[10px] font-[620] tracking-[0.02em] leading-none flex-shrink-0 bg-[rgba(255,159,10,0.14)] text-[#9a6400] dark:bg-[rgba(255,159,10,0.20)] dark:text-[#ffb340]"
    >
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
      fg: 'var(--muted)',
      bg: 'rgba(120,120,128,0.14)',
      dfg: 'var(--muted)',
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
        borderRadius: 'var(--radius)',
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
