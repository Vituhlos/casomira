/** Medailový puntík pro 1./2./3. místo. Vrací null pro ostatní pořadí. */
export function MedalDot({ rank }: { rank: number }): React.JSX.Element | null {
  const cls: Record<number, string> = {
    1: 'bg-medal-gold',
    2: 'bg-medal-silver',
    3: 'bg-medal-bronze',
  }
  if (!cls[rank]) return null
  return (
    <span
      className={`mr-1.5 inline-block size-[7px] shrink-0 rounded-full align-middle ${cls[rank]}`}
    />
  )
}
