import { Dropdown, Label } from '@heroui/react'
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
  onPdf?: () => void
  onPdfSaveAs?: () => void
  onOpenPdfFolder?: () => void
  onPrint?: (e?: React.MouseEvent) => void
  onSettings?: () => void
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
  onPrint,
  onSettings
}: ToolbarProps): React.JSX.Element {
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
        borderBottom: '0.5px solid var(--border)'
      }}
    >
      {/* Breadcrumb */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 13.5, minWidth: 0 }}>
        {raceTyp === 'RX' && <DevBadge />}
        <span style={{ color: 'var(--muted)' }}>{catLabel}</span>
        <Icon name="chevron" size={12} style={{ color: 'var(--muted)' }} />
        <span style={{ color: 'var(--foreground)', fontWeight: 590 }}>{phaseLabel}</span>
      </div>
      <div style={{ flex: 1 }} />

      {/* Akce */}
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
      {onPrint && (
        <Btn
          variant="bezel"
          icon="printer"
          onClick={(e) => onPrint?.(e)}
          title="Vytisknout tento list (Shift = změnit tiskárnu)"
        />
      )}

      {/* Uložit PDF + šipka — jeden primární pill.
          Dropdown.Trigger dostane className pdf-split__caret → Floating UI pozicování,
          ESC, klik-mimo a focus management jsou interní v HeroUI Dropdown. */}
      <div className="pdf-split">
        <button
          type="button"
          onClick={onPdf}
          className="inline-flex items-center gap-[6px] border-none cursor-pointer bg-transparent text-[var(--accent-foreground)] focus-visible:outline-none whitespace-nowrap"
          style={{ font: 'inherit', fontSize: 13, fontWeight: 510, height: 28, padding: '0 12px' }}
        >
          <Icon name="pdf" size={15} />
          Uložit PDF
        </button>

        <Dropdown>
          <Dropdown.Trigger
            className="pdf-split__caret"
            title="Další možnosti PDF"
            aria-label="Další možnosti PDF"
          >
            <Icon name="chevron" size={13} style={{ transform: 'rotate(90deg)' }} />
          </Dropdown.Trigger>
          <Dropdown.Popover placement="bottom end">
            <Dropdown.Menu
              onAction={(key) => {
                if (key === 'save-as') onPdfSaveAs?.()
                else if (key === 'open-folder') onOpenPdfFolder?.()
              }}
            >
              <Dropdown.Item id="save-as" textValue="Uložit jako…">
                <Label>Uložit jako…</Label>
              </Dropdown.Item>
              <Dropdown.Item id="open-folder" textValue="Otevřít složku PDF">
                <Label>Otevřít složku PDF</Label>
              </Dropdown.Item>
            </Dropdown.Menu>
          </Dropdown.Popover>
        </Dropdown>
      </div>
    </div>
  )
}
