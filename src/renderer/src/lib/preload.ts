// Raný start IPC volání — cache slibů spuštěných v App.tsx useEffect([phase, activeCat]),
// ještě zatímco useDeferredValue renderuje nový screen v pozadí (~50-100ms okno).
// Díky tomu jsou data nachystaná ve chvíli, kdy se komponenta namountuje → žádný loading flash.
const cache = new Map<string, Promise<unknown>>()

/** Spustí IPC volání a uloží slib. Pokud pro daný klíč slib už běží, nic neudělá. */
export function startPreload<T>(key: string, fn: () => Promise<T>): void {
  if (!cache.has(key)) cache.set(key, fn())
}

/** Spotřebuje slib (odstraní z cache). Vrací null, pokud pro klíč nic není. */
export function consumePreload<T>(key: string): Promise<T> | null {
  const p = cache.get(key) as Promise<T> | undefined
  cache.delete(key)
  return p ?? null
}
