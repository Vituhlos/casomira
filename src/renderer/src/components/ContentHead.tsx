import type { ReactNode } from 'react'

interface ContentHeadProps {
  title: string
  sub?: string
  children?: ReactNode
}

export function ContentHead({ title, sub, children }: ContentHeadProps): React.JSX.Element {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'space-between',
        gap: 16,
        padding: '14px 22px 12px',
        flexWrap: 'wrap'
      }}
    >
      <div>
        <h2
          style={{
            margin: 0,
            fontFamily: 'var(--font-display)',
            fontSize: 22,
            fontWeight: 680,
            letterSpacing: '-0.02em',
            color: 'var(--text-1)'
          }}
        >
          {title}
        </h2>
        {sub && <p style={{ margin: '3px 0 0', fontSize: 12.5, color: 'var(--text-2)' }}>{sub}</p>}
      </div>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>{children}</div>
    </div>
  )
}
