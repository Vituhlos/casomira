import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Icon } from './Icon'
import { Btn, DevBadge } from './ui'
import type { RaceType } from '@shared/types'
import type { Theme } from '../hooks/useTheme'

interface ToolbarProps {
  catLabel: string
  phaseLabel: string
  /** Typ otevřeného závodu — u RX Cup zobrazí badge „Ve vývoji". */
  raceTyp?: RaceType
  theme: Theme
  onToggleTheme: () => void
  onStopky?: () => void
  onPdf?: () => void // automatické uložení do struktury složek
  onPdfSaveAs?: () => void // „Uložit jako…" (jinam)
  onOpenPdfFolder?: () => void // otevřít kořenovou složku PDF
  onUpravaLog?: () => void // přehled zásahů ředitele
  onSettings?: () => void
  onHotkeys?: () => void // přehled klávesových zkratek
}

export function Toolbar({
  catLabel,
  phaseLabel,
  raceTyp,
  theme,
  onToggleTheme,
  onStopky,
  onPdf,
  onPdfSaveAs,
  onOpenPdfFolder,
  onUpravaLog,
  onSettings,
  onHotkeys
}: ToolbarProps): React.JSX.Element {
  const [menu, setMenu] = useState(false)
  const pdfSplitRef = useRef<HTMLDivElement>(null)
  const [menuAnchor, setMenuAnchor] = useState<{ top: number; right: number } | null>(null)

  const zavriMenu = (): void => setMenu(false)

  const otevriMenu = (): void => {
    const r = pdfSplitRef.current?.getBoundingClientRect()
    if (r) {
      setMenuAnchor({ top: r.bottom + 4, right: window.innerWidth - r.right })
    }
    setMenu(true)
  }

  const prepniMenu = (): void => {
    if (menu) zavriMenu()
    else otevriMenu()
  }

  useEffect(() => {
    if (!menu) return
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') zavriMenu()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [menu])

  return (
    <div
      className="no-print"
      style={{
        height: 'var(--toolbar-h)',
        flexShrink: 0,
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '0 16px',
        background: 'var(--toolbar)',
        backdropFilter: 'blur(50px) saturate(1.8)',
        WebkitBackdropFilter: 'blur(50px) saturate(1.8)',
        borderBottom: '0.5px solid var(--hairline)'
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 13.5, minWidth: 0 }}>
        {raceTyp === 'RX' && <DevBadge />}
        <span style={{ color: 'var(--text-2)' }}>{catLabel}</span>
        <Icon name="chevron" size={12} style={{ color: 'var(--text-3)' }} />
        <span style={{ color: 'var(--text-1)', fontWeight: 590 }}>{phaseLabel}</span>
      </div>
      <div style={{ flex: 1 }} />
      {onHotkeys && (
        <Btn
          variant="bezel"
          icon="keyboard"
          onClick={onHotkeys}
          title="Klávesové zkratky (?)"
        />
      )}
      <Btn variant="bezel" icon="gear" onClick={onSettings} title="Nastavení" />
      <Btn
        variant="bezel"
        icon={theme === 'dark' ? 'sun' : 'moon'}
        onClick={onToggleTheme}
        title={theme === 'dark' ? 'Přepnout na světlý režim' : 'Přepnout na tmavý režim'}
      />
      <Btn variant="bezel" icon="stopwatch" onClick={onStopky}>
        Stopky
      </Btn>
      {onUpravaLog && (
        <Btn variant="bezel" onClick={onUpravaLog} title="Přehled zásahů ředitele v kategorii">
          Zásahy
        </Btn>
      )}

      {/* Uložit PDF + šipka — jeden pill (.pdf-split), hover/active na obalu. */}
      <div ref={pdfSplitRef} className="pdf-split">
        <Btn
          variant="primary"
          icon="pdf"
          onClick={onPdf}
          style={{ borderRadius: 0, boxShadow: 'none', background: 'transparent' }}
        >
          Uložit PDF
        </Btn>
        <button
          type="button"
          className="pdf-split__caret"
          title="Další možnosti PDF"
          aria-expanded={menu}
          aria-haspopup="menu"
          onClick={prepniMenu}
        >
          <Icon name="chevron" size={13} style={{ transform: 'rotate(90deg)' }} />
        </button>
      </div>

      {menu &&
        menuAnchor &&
        createPortal(
          <>
            <div
              className="no-print"
              onMouseDown={zavriMenu}
              style={{ position: 'fixed', inset: 0, zIndex: 150 }}
            />
            <div
              role="menu"
              onMouseDown={(e) => e.stopPropagation()}
              style={{
                position: 'fixed',
                top: menuAnchor.top,
                right: menuAnchor.right,
                zIndex: 151,
                minWidth: 200,
                background: 'var(--card)',
                border: '0.5px solid var(--hairline)',
                borderRadius: 'var(--r-ctrl)',
                boxShadow: 'var(--shadow-win)',
                padding: 4,
                display: 'flex',
                flexDirection: 'column'
              }}
            >
              <MenuItem
                onClick={() => {
                  zavriMenu()
                  onPdfSaveAs?.()
                }}
              >
                Uložit jako…
              </MenuItem>
              <MenuItem
                onClick={() => {
                  zavriMenu()
                  onOpenPdfFolder?.()
                }}
              >
                Otevřít složku PDF
              </MenuItem>
            </div>
          </>,
          document.body
        )}
    </div>
  )
}

function MenuItem({
  children,
  onClick
}: {
  children: React.ReactNode
  onClick: () => void
}): React.JSX.Element {
  return (
    <button
      type="button"
      className="menu-item"
      role="menuitem"
      onClick={onClick}
      style={{
        textAlign: 'left',
        padding: '7px 10px',
        borderRadius: 6,
        font: 'inherit',
        fontSize: 13
      }}
    >
      {children}
    </button>
  )
}
