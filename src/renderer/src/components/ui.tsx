import type { CSSProperties, ReactNode } from 'react'
import { Button, Chip } from '@heroui/react'

type BtnVariant = 'primary' | 'bezel' | 'plain' | 'danger'

interface BtnProps {
  children?: ReactNode
  variant?: BtnVariant
  icon?: ReactNode
  onClick?: () => void
  title?: string
  size?: 'sm' | 'md' | 'lg'
  style?: CSSProperties
  disabled?: boolean
}

export function Btn({
  children,
  variant = 'bezel',
  icon,
  onClick,
  title,
  size,
  style,
  disabled
}: BtnProps): React.JSX.Element {
  const heroVariant: 'primary' | 'outline' | 'ghost' | 'danger' =
    variant === 'plain' ? 'ghost' :
    variant === 'bezel' ? 'outline' :
    variant === 'danger' ? 'danger' :
    'primary'

  return (
    <Button
      variant={heroVariant}
      size={size === 'lg' ? 'md' : size ?? 'sm'}
      isDisabled={disabled}
      title={title}
      onPress={onClick}
      style={style}
    >
      {icon}
      {children}
    </Button>
  )
}

export function DevBadge({ title = 'Formát je ve vývoji' }: { title?: string }): React.JSX.Element {
  return (
    <Chip size="sm" color="warning" title={title}>
      Ve vývoji
    </Chip>
  )
}

export type Stav = 'DNF' | 'DNS' | 'DQ'

export function Badge({ status }: { status: Stav }): React.JSX.Element | null {
  const color =
    status === 'DNF' ? 'warning' :
    status === 'DQ' ? 'danger' :
    'default'
  return (
    <Chip size="sm" variant="soft" color={color as 'warning' | 'danger' | 'default'}>
      {status}
    </Chip>
  )
}

export function Medal({ rank }: { rank: number }): React.JSX.Element | null {
  const c: Record<number, string> = {
    1: 'var(--color-medal-gold)',
    2: 'var(--color-medal-silver)',
    3: 'var(--color-medal-bronze)'
  }
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
