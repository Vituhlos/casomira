import { useCallback, useEffect, useState } from 'react'

export type Theme = 'light' | 'dark'

const STORAGE_KEY = 'casomira:theme'

function initial(): Theme {
  const saved = localStorage.getItem(STORAGE_KEY)
  return saved === 'dark' ? 'dark' : 'light'
}

// Drží téma, propisuje ho do <html data-theme> (na to navazují CSS tokeny)
// a pamatuje si volbu mezi spuštěními.
export function useTheme(): { theme: Theme; toggle: () => void } {
  const [theme, setTheme] = useState<Theme>(initial)

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    // HeroUI/Tailwind `dark:` varianty jedou přes třídu .dark — nastavujeme obojí.
    document.documentElement.classList.toggle('dark', theme === 'dark')
    localStorage.setItem(STORAGE_KEY, theme)
  }, [theme])

  // Stabilní reference (nezávisí na ničem) — ať memoizace dětí, co toggle
  // dostávají jako prop, nepadá kvůli nové identitě funkce při každém renderu.
  const toggle = useCallback((): void => setTheme((t) => (t === 'dark' ? 'light' : 'dark')), [])
  return { theme, toggle }
}
