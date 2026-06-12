import type { ReactNode } from 'react'
import { Modal } from './Modal'
import { Btn } from './ui'
import { HOTKEY_GROUPS } from '../lib/hotkeys'

// Přehled klávesových zkratek (overlay ve stylu mac.css). Modifikátory se
// zobrazují podle platformy (⌘ na macOS, Ctrl na Windows) — řeší lib/hotkeys.
// Zavře se Esc / křížkem / kliknutím mimo (Modal) nebo tlačítkem Zavřít.
export function HotkeyHelp({ onClose }: { onClose: () => void }): React.JSX.Element {
  return (
    <Modal
      title="Klávesové zkratky"
      width={440}
      onClose={onClose}
      footer={
        <Btn variant="plain" onClick={onClose}>
          Zavřít
        </Btn>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {HOTKEY_GROUPS.map((g) => (
          <div key={g.title}>
            <div
              style={{
                fontSize: 11,
                fontWeight: 640,
                color: 'color-mix(in srgb, var(--color-foreground) 35%, transparent)',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                margin: '0 0 8px'
              }}
            >
              {g.title}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
              {g.items.map((it) => (
                <div key={it.desc} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span style={{ flex: 1, fontSize: 13, color: 'var(--color-foreground)' }}>{it.desc}</span>
                  <span style={{ display: 'inline-flex', gap: 4, flexShrink: 0 }}>
                    {it.keys.map((k, i) => (
                      <Kbd key={i}>{k}</Kbd>
                    ))}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </Modal>
  )
}

function Kbd({ children }: { children: ReactNode }): React.JSX.Element {
  return (
    <kbd
      className="tnum"
      style={{
        display: 'inline-grid',
        placeItems: 'center',
        minWidth: 22,
        height: 22,
        padding: '0 6px',
        fontSize: 12,
        fontWeight: 600,
        fontFamily: 'inherit',
        color: 'color-mix(in srgb, var(--color-foreground) 55%, transparent)',
        background: 'color-mix(in srgb, var(--color-foreground) 5%, transparent)',
        border: '0.5px solid var(--color-border)',
        borderRadius: 6,
        boxShadow: '0 1px 0 var(--color-border)'
      }}
    >
      {children}
    </kbd>
  )
}
