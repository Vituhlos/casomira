export function MedalDot({ rank }: { rank: number }): React.JSX.Element | null {
  const color =
    rank === 1 ? 'var(--color-medal-gold)' :
    rank === 2 ? 'var(--color-medal-silver)' :
    rank === 3 ? 'var(--color-medal-bronze)' : null
  if (!color) return null
  return (
    <span style={{
      display: 'inline-block', width: 7, height: 7,
      borderRadius: 99, background: color,
      marginRight: 8, verticalAlign: 'middle'
    }} />
  )
}
