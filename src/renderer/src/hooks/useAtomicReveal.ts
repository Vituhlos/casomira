import { useEffect, useState } from 'react'

/**
 * Po přechodu `ready` na true čeká jeden animation frame — dá čas HeroUI/React Aria
 * tabulkám dokončit interní 2-fázový render neviditelně — a teprve pak vrátí true.
 * Tím se zabráníme tomu, aby se nadpisy jízd zobrazily dřív než řádky tabulky.
 */
export function useAtomicReveal(ready: boolean): boolean {
  const [shown, setShown] = useState(false)
  useEffect(() => {
    if (!ready) { setShown(false); return }
    const id = requestAnimationFrame(() => setShown(true))
    return () => cancelAnimationFrame(id)
  }, [ready])
  return shown
}
