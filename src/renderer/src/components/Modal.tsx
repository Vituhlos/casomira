import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import type { ReactNode } from 'react'

interface ModalProps {
  title: string
  onClose: () => void
  children: ReactNode
  footer?: ReactNode
  width?: number
}

// Modální okno v duchu macOS — ztmavené pozadí, plovoucí karta uprostřed.
// Zavře se kliknutím mimo, křížkem nebo klávesou Esc.
export function Modal({ title, onClose, children, footer, width = 560 }: ModalProps): React.JSX.Element {
  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  // Vykreslíme přes portál do <body> — modal tak nikdy nezávisí na rozložení
  // obrazovky pod ním (žádné roztažení/ořez od rodičů s transform/backdrop-filter).
  return createPortal(
    <div
      className="no-print"
      onMouseDown={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'var(--smoke)',
        display: 'grid',
        placeItems: 'center',
        padding: 16,
        zIndex: 200
      }}
    >
      <div
        onMouseDown={(e) => e.stopPropagation()}
        className="screen-enter"
        style={{
          width: `min(90vw, ${width}px)`,
          maxHeight: '80vh',
          display: 'flex',
          flexDirection: 'column',
          background: 'var(--window)',
          borderRadius: 'var(--r-card)',
          border: '0.5px solid var(--hairline)',
          boxShadow: 'var(--shadow-win)',
          overflow: 'hidden'
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '13px 18px',
            borderBottom: '0.5px solid var(--hairline)'
          }}
        >
          <span style={{ fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 650 }}>
            {title}
          </span>
          <button
            className="icon-btn"
            onClick={onClose}
            aria-label="Zavřít"
            style={{ fontSize: 16, lineHeight: 1, padding: 4, width: 26, height: 26 }}
          >
            ✕
          </button>
        </div>

        <div style={{ padding: '14px 18px', overflowY: 'auto', flex: 1, minHeight: 0 }}>
          {children}
        </div>

        {footer && (
          <div
            style={{
              display: 'flex',
              justifyContent: 'flex-end',
              gap: 8,
              padding: '12px 18px',
              borderTop: '0.5px solid var(--hairline)'
            }}
          >
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body
  )
}
