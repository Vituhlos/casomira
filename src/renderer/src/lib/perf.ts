// Dev-only měření výkonu kritických cest (zápis času ve Stopkách).
// V produkci je `import.meta.env.DEV === false` → všechny funkce jsou no-op,
// takže žádná režie. Cílem je oddělit, kolik z latence „stisk → vidím řádek"
// padá na IPC (round-trip do main procesu + SQLite) a kolik na React+paint.

const DEV = import.meta.env.DEV

interface Vzorek {
  ipc: number
  paint: number
}

const buffer: Vzorek[] = []

function prumer(klic: keyof Vzorek): number {
  if (buffer.length === 0) return 0
  return buffer.reduce((s, x) => s + x[klic], 0) / buffer.length
}

/**
 * Začne měřit jednu událost „zápis času". Vrací callback, který zavoláš
 * hned po doběhnutí IPC (`mereniPridej`) — předáš mu `performance.now()`.
 * Vnitřně přes dvojitý requestAnimationFrame změří, za jak dlouho se po
 * `setKanaly` reálně vykreslí snímek (proxy za „operátor vidí řádek").
 *
 * V produkci vrací `null` → na volajícím místě se nic neděje (`perf?.(...)`).
 */
export function zacniMereniZapisu(): ((ipcHotovoMs: number) => void) | null {
  if (!DEV) return null
  const t0 = performance.now()
  return (ipcHotovoMs: number): void => {
    const ipc = ipcHotovoMs - t0
    requestAnimationFrame(() =>
      requestAnimationFrame(() => {
        const paint = performance.now() - ipcHotovoMs
        buffer.push({ ipc, paint })
        const n = buffer.length
        // eslint-disable-next-line no-console
        console.log(
          `[stopky] zápis #${n}` +
            `  IPC ${ipc.toFixed(1)} ms` +
            `  render→paint ${paint.toFixed(1)} ms` +
            `  │ Ø IPC ${prumer('ipc').toFixed(1)} ms` +
            `  Ø paint ${prumer('paint').toFixed(1)} ms`
        )
      })
    )
  }
}

/**
 * onRender callback pro <Profiler>. Loguje čistý čas React renderu (bez
 * browser layout/paint) jen v DEV. Spolu s `render→paint` z výše to řekne,
 * jestli je úzké hrdlo React (rekonciliace Table) nebo browser layout/paint.
 */
export function profilStopek(
  _id: string,
  faze: 'mount' | 'update' | 'nested-update',
  actualDuration: number
): void {
  if (!DEV) return
  // mount logovat nemá smysl (jednorázový), zajímá nás update při zápisu.
  if (faze === 'mount') return
  // eslint-disable-next-line no-console
  console.log(`[stopky] React ${faze}  ${actualDuration.toFixed(1)} ms (tabulka)`)
}
