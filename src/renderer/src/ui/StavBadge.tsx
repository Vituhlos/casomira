import { Chip } from '@heroui/react'
import type { Stav } from '@shared/types'

const COLOR_MAP = {
  DNF: 'warning',
  DNS: 'default',
  DQ: 'danger',
} as const satisfies Record<Exclude<Stav, 'OK'>, 'warning' | 'default' | 'danger'>

/** Stavový odznak pro výsledky jízdy. Vrací null pro OK (žádný odznak). */
export function StavBadge({ stav }: { stav: Stav }): React.JSX.Element | null {
  if (stav === 'OK') return null
  return (
    <Chip color={COLOR_MAP[stav]} variant="soft" size="sm">
      {stav}
    </Chip>
  )
}
