import { useState, useEffect } from 'react'
import { Button } from '@heroui/react'
import type { Kategorie, UpdateInfo } from '@shared/types'
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
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null)

  useEffect(() => {
    return window.api.onUpdateAvailable((info) => setUpdateInfo(info))
  }, [])

  function handleOpen(): void {
    if (!updateInfo) return
    window.api.openUrl(updateInfo.url).catch(() => {})
  }

  function handleDismiss(): void {
    if (!updateInfo) return
    window.api.dismissUpdate(updateInfo.version).catch(() => {})
    setUpdateInfo(null)
  }

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
        borderRight: '0.5px solid var(--border)'
      }}
    >
      {/* Prostor zarovnaný s horní lištou napravo */}
      <div style={{ height: 'var(--toolbar-h)', flexShrink: 0 }} />

      {/* Zpět na seznam závodů */}
      <div className="px-[10px] pb-[6px]">
        <button
          className="flex items-center gap-[5px] w-full h-7 px-2 text-[12.5px] text-left rounded-[var(--radius)] border-0 bg-transparent cursor-pointer transition-colors duration-[120ms] hover:bg-black/[.045] dark:hover:bg-white/[.06] focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-offset-0"
          style={{ font: 'inherit', color: 'var(--muted)' }}
          title="Zpět na seznam závodů"
          onClick={onZpet}
        >
          <Icon name="chevron" size={13} style={{ transform: 'scaleX(-1)' }} />
          Závody
        </button>
      </div>

      {/* Nadpis sekce */}
      <div
        className="px-4 pt-[4px] pb-[6px] text-[11px] font-semibold tracking-[0.02em]"
        style={{ color: 'var(--muted)' }}
      >
        Kategorie
      </div>

      {/* Seznam kategorií */}
      <nav className="flex-1 overflow-y-auto px-2 pb-[10px]">
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

      {/* Operátor + datum */}
      <div
        className="flex items-center gap-[10px] px-4 py-[9px]"
        style={{ borderTop: '0.5px solid var(--border)' }}
      >
        <span
          className="shrink-0 grid place-items-center rounded-full text-[11px] font-semibold text-white"
          style={{
            width: 28,
            height: 28,
            background: 'linear-gradient(160deg,#8a8d93,#5c5f66)'
          }}
        >
          ČM
        </span>
        <span className="flex flex-col leading-[1.3] min-w-0">
          <span className="text-[12.5px] font-semibold" style={{ color: 'var(--foreground)' }}>
            {operator}
          </span>
          <span className="tnum text-[11.5px]" style={{ color: 'var(--muted)' }}>
            {datum}
          </span>
        </span>
      </div>

      {/* Brand patička */}
      <div
        className="px-4 pt-[6px] pb-[9px] text-[10.5px] text-center tracking-[0.02em] whitespace-nowrap"
        style={{ color: 'var(--muted)' }}
      >
        {APP_NAME} <span className="tnum">{APP_VERSION_LABEL}</span>
      </div>

      {/* Oznámení o nové verzi */}
      {updateInfo && (
        <div
          className="mx-2 mb-2 px-[9px] py-[5px] flex items-center gap-1 rounded-[7px]"
          style={{
            background: 'color-mix(in oklab, var(--accent) 10%, transparent)',
            border: '0.5px solid color-mix(in oklab, var(--accent) 30%, transparent)'
          }}
        >
          <span
            className="flex-1 text-[11px] font-medium leading-[1.3]"
            style={{ color: 'var(--accent)' }}
          >
            Nová: <span className="tnum">{updateInfo.version}</span>
          </span>
          <Button
            size="sm"
            variant="ghost"
            onPress={handleOpen}
            className="h-auto min-h-0 min-w-0 py-[1px] px-[5px] text-[11px] font-medium text-[var(--accent)]"
          >
            Stáhnout
          </Button>
          <button
            onClick={handleDismiss}
            title="Zavřít"
            className="text-[14px] leading-none px-[2px] rounded-[3px] border-0 bg-transparent cursor-pointer hover:bg-black/10 dark:hover:bg-white/10"
            style={{ color: 'var(--muted)' }}
          >
            ×
          </button>
        </div>
      )}
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
  const isEmpty = count === 0 && !active
  return (
    <button
      onClick={onClick}
      className={[
        'flex items-center gap-[9px] w-full h-8 px-[9px] my-px rounded-[var(--radius)]',
        'text-left border-0 cursor-pointer',
        'transition-[background,color,opacity] duration-[120ms] ease-linear',
        'focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-offset-0',
        !active && 'hover:bg-black/[.045] dark:hover:bg-white/[.06]',
        isEmpty && 'opacity-[.42]'
      ].filter(Boolean).join(' ')}
      style={{
        font: 'inherit',
        background: active ? 'var(--accent)' : 'transparent',
        color: active ? 'var(--accent-foreground)' : 'var(--foreground)'
      }}
    >
      <Icon
        name={icon}
        size={15}
        style={{ color: active ? 'rgba(255,255,255,0.9)' : 'var(--muted)' }}
      />
      <span className="flex-1 text-[13px]" style={{ fontWeight: active ? 520 : 440 }}>
        {label}
      </span>
      {count > 0 && (
        <span
          className="tnum text-[11.5px] font-medium leading-none py-[2px] px-[6px] rounded-full"
          style={{
            background: active ? 'rgba(255,255,255,0.22)' : 'var(--seg-track)',
            color: active ? 'rgba(255,255,255,0.9)' : 'var(--muted)'
          }}
        >
          {count}
        </span>
      )}
    </button>
  )
}
