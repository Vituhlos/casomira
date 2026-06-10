import { Modal as HModal } from '@heroui/react'
import type { ReactNode } from 'react'

interface ModalProps {
  title: string
  onClose: () => void
  children: ReactNode
  footer?: ReactNode
  width?: number
}

// Modální okno v duchu macOS — HeroUI Modal.Backdrop (controlled, vždy isOpen=true).
// WAI-ARIA dialog role, focus trap, scroll lock a zavírání (Esc + klik mimo) jsou interní.
// Caller stále renderuje {podmínka && <Modal ...>} — žádná změna API.
// Vizuální design zachován: custom header (font-display, 16px), scrollovatelné tělo, patička.
export function Modal({ title, onClose, children, footer, width = 560 }: ModalProps): React.JSX.Element {
  return (
    <HModal.Backdrop
      isOpen
      onOpenChange={(open) => {
        if (!open) onClose()
      }}
      className="no-print"
      style={{ background: 'var(--smoke)', zIndex: 200 }}
    >
      <HModal.Container className="sm:p-4">
        <HModal.Dialog
          className="p-0 overflow-hidden"
          style={{
            width: `min(90vw, ${width}px)`,
            maxHeight: '80vh',
            background: 'var(--surface)',
            borderRadius: 'var(--r-card)',
            border: '0.5px solid var(--border)',
            boxShadow: 'var(--shadow-win)'
          }}
        >
          {/* Hlavička */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '13px 18px',
              borderBottom: '0.5px solid var(--border)',
              flexShrink: 0
            }}
          >
            <span style={{ fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 650 }}>
              {title}
            </span>
            <button
              className="border-none bg-transparent text-[var(--muted)] cursor-pointer rounded-[6px] transition-[background,color] duration-[130ms] ease-linear hover:bg-black/[.06] dark:hover:bg-white/[.1] hover:text-[var(--foreground)] active:bg-black/[.11] dark:active:bg-white/[.16] focus-visible:outline-none focus-visible:shadow-[0_0_0_3px_color-mix(in_srgb,var(--accent)_38%,transparent)]"
              onClick={onClose}
              aria-label="Zavřít"
              style={{ fontSize: 16, lineHeight: 1, padding: 4, width: 26, height: 26 }}
            >
              ✕
            </button>
          </div>

          {/* Tělo — scrolluje interně */}
          <div style={{ padding: '14px 18px', overflowY: 'auto', flex: 1, minHeight: 0 }}>
            {children}
          </div>

          {/* Patička */}
          {footer && (
            <div
              style={{
                display: 'flex',
                justifyContent: 'flex-end',
                gap: 8,
                padding: '12px 18px',
                borderTop: '0.5px solid var(--border)',
                flexShrink: 0
              }}
            >
              {footer}
            </div>
          )}
        </HModal.Dialog>
      </HModal.Container>
    </HModal.Backdrop>
  )
}
