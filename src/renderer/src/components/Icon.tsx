import type { CSSProperties, ReactNode } from 'react'

// SF-styl ikony (stroke 1.5) — převzato 1:1 z prototypu (m_ui.jsx).
export type IconName =
  | 'timer'
  | 'flag'
  | 'car'
  | 'cup'
  | 'list'
  | 'pdf'
  | 'stopwatch'
  | 'plus'
  | 'import'
  | 'sort'
  | 'chevron'
  | 'trophy'
  | 'sun'
  | 'moon'
  | 'trash'
  | 'gear'
  | 'pencil'
  | 'keyboard'

const PATHS: Record<IconName, ReactNode> = {
  timer: (
    <>
      <path d="M8 1.6h4M10 4.2v3" />
      <circle cx="10" cy="11.5" r="6" />
    </>
  ),
  flag: <path d="M4.5 17V3.4c2.4-1.1 4 1.1 6.4 0s4-.7 4-.7v6.6s-1.6.6-4 .7-4-1.1-6.4 0" />,
  car: (
    <>
      <path d="M2.6 11l1.6-3.9a1.6 1.6 0 0 1 1.5-1h8.6a1.6 1.6 0 0 1 1.5 1L17.4 11" />
      <path d="M2.6 11h14.8v3.1a.8.8 0 0 1-.8.8h-1.1a.8.8 0 0 1-.8-.8V14H5.3v.1a.8.8 0 0 1-.8.8H3.4a.8.8 0 0 1-.8-.8z" />
      <path d="M5.3 12.6h.01M14.7 12.6h.01" />
    </>
  ),
  cup: (
    <>
      <path d="M5.5 3h9v2.3A4.5 4.5 0 0 1 5.5 5.3z" />
      <path d="M5.5 3.6H3.6v.6A2.1 2.1 0 0 0 5.6 6.3M14.5 3.6h1.9v.6a2.1 2.1 0 0 1-2 2.1M10 9.5v3M8 15h4" />
    </>
  ),
  list: (
    <>
      <path d="M6.5 5h11M6.5 10h11M6.5 15h11" />
      <path d="M3.2 5h.01M3.2 10h.01M3.2 15h.01" />
    </>
  ),
  pdf: (
    <>
      <path d="M11 2.6H6.2A1.5 1.5 0 0 0 4.7 4.1v11.8a1.5 1.5 0 0 0 1.5 1.5h7.6a1.5 1.5 0 0 0 1.5-1.5V7z" />
      <path d="M11 2.6V7h4.3" />
    </>
  ),
  stopwatch: (
    <>
      <path d="M8 1.8h4" />
      <circle cx="10" cy="11" r="6.2" />
      <path d="M10 11V7.5M14 6.9l1-1" />
    </>
  ),
  plus: <path d="M10 4.4v11.2M4.4 10h11.2" />,
  import: (
    <>
      <path d="M10 2.6v9M6.9 8.4 10 11.5l3.1-3.1" />
      <path d="M4.6 15.4h10.8" />
    </>
  ),
  sort: (
    <>
      <path d="M6 4v12M6 16l-2.1-2.1M6 4l2.1 2.1" />
      <path d="M14 16V4M14 4l2.1 2.1M14 16l-2.1-2.1" />
    </>
  ),
  chevron: <path d="m8 5 5 5-5 5" />,
  trophy: (
    <>
      <path d="M6 3h8v3a4 4 0 0 1-8 0z" />
      <path d="M6 3.6H3.6v.7a2.4 2.4 0 0 0 2.4 2.4M14 3.6h2.4v.7a2.4 2.4 0 0 1-2.4 2.4" />
      <path d="M10 10v3.2M7.4 16.5h5.2M8.6 13.4h2.8" />
    </>
  ),
  sun: (
    <>
      <circle cx="10" cy="10" r="3.4" />
      <path d="M10 2.2v2M10 15.8v2M2.2 10h2M15.8 10h2M4.5 4.5l1.4 1.4M14.1 14.1l1.4 1.4M15.5 4.5l-1.4 1.4M5.9 14.1l-1.4 1.4" />
    </>
  ),
  moon: <path d="M15.5 11.3A6.2 6.2 0 1 1 8.7 4.5a4.8 4.8 0 0 0 6.8 6.8z" />,
  trash: (
    <>
      <path d="M4.5 6h11" />
      <path d="M8 6V4.6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1V6" />
      <path d="M6.1 6l.7 9.2a1.3 1.3 0 0 0 1.3 1.2h3.8a1.3 1.3 0 0 0 1.3-1.2L13.9 6" />
      <path d="M8.6 9v4.4M11.4 9v4.4" />
    </>
  ),
  // Ozubené kolo (Lucide „settings", 24×24) zmenšené do 20×20 přes scale;
  // non-scaling-stroke drží tloušťku čáry stejnou jako u ostatních ikon.
  pencil: (
    <>
      <path d="M4 16h1.8l8.7-8.7-1.8-1.8L4 14.2z" />
      <path d="M13.4 4.6l1.2-1.2a1 1 0 0 1 1.4 0l.6.6a1 1 0 0 1 0 1.4l-1.2 1.2z" />
    </>
  ),
  keyboard: (
    <>
      <rect x="2.3" y="5.6" width="15.4" height="8.8" rx="1.7" />
      <path d="M5 8.2h.01M7.6 8.2h.01M10.2 8.2h.01M12.8 8.2h.01M15 8.2h.01M6.3 10.7h.01M8.9 10.7h.01M11.5 10.7h.01M14 10.7h.01M7.4 12.6h5.2" />
    </>
  ),
  gear: (
    <g transform="scale(0.8333)">
      <path
        vectorEffect="non-scaling-stroke"
        d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"
      />
      <circle cx="12" cy="12" r="3" vectorEffect="non-scaling-stroke" />
    </g>
  )
}

interface IconProps {
  name: IconName
  size?: number
  style?: CSSProperties
}

export function Icon({ name, size = 16, style }: IconProps): React.JSX.Element {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ flexShrink: 0, ...style }}
    >
      {PATHS[name]}
    </svg>
  )
}
