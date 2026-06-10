import { useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import type { ReactNode } from 'react'

// Drobný tooltip v duchu mac.css — objeví se nad prvkem, ke kterému patří,
// vykreslený přes portál (nepřetéká z tabulky), s ošetřením okraje obrazovky.
export function Tooltip({ text, children }: { text: string; children: ReactNode }): React.JSX.Element {
  const ref = useRef<HTMLSpanElement>(null)
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null)

  const show = (): void => {
    const r = ref.current?.getBoundingClientRect()
    if (!r) return
    // Clamp tak aby tooltip (max 300px, střed = x) nikdy nepřetekl za okraj.
    const half = 155
    const x = Math.min(window.innerWidth - half - 8, Math.max(half + 8, r.left + r.width / 2))
    setPos({ x, y: r.top })
  }
  const hide = (): void => setPos(null)

  return (
    <span
      ref={ref}
      onMouseEnter={show}
      onMouseLeave={hide}
      style={{ display: 'inline-flex' }}
    >
      {children}
      {pos &&
        createPortal(
          <div
            className="no-print"
            style={{
              position: 'fixed',
              left: pos.x,
              top: pos.y - 8,
              transform: 'translate(-50%, -100%)',
              zIndex: 1100,
              pointerEvents: 'none',
              maxWidth: 310,
              whiteSpace: 'normal',
              background: 'var(--surface)',
              color: 'var(--foreground)',
              border: '0.5px solid var(--border)',
              borderRadius: 'var(--radius)',
              boxShadow: 'var(--shadow-win)',
              padding: '5px 9px',
              fontSize: 12
            }}
          >
            {text}
          </div>,
          document.body
        )}
    </span>
  )
}
