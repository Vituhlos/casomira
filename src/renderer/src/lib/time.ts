// Čas držíme interně v milisekundách, zobrazujeme jako mm:ss.sss.

export function fmtTime(ms: number | null): string {
  if (ms === null || ms === undefined) return ''
  const m = Math.floor(ms / 60000)
  const s = Math.floor((ms % 60000) / 1000)
  const mil = ms % 1000
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}.${String(mil).padStart(3, '0')}`
}

// Striktní parser "mm:ss.sss" (ms 1–3 číslice) → milisekundy, jinak null.
export function parseTime(str: string): number | null {
  const m = str.trim().match(/^(\d{1,2}):(\d{2})\.(\d{1,3})$/)
  if (!m) return null
  return Number(m[1]) * 60000 + Number(m[2]) * 1000 + Number(m[3].padEnd(3, '0'))
}

// Volnější parser pro zadávání u trati. Přijme:
//   mm:ss.sss · m:ss.sss · ss.sss · ss   (čárka i tečka jako oddělovač desetin)
// Vrátí milisekundy, nebo null když to není čas.
export function parseTimeLoose(str: string): number | null {
  const s = str.trim().replace(',', '.')
  if (s === '') return null

  // Tvar s dvojtečkou: minuty:vteřiny(.tisíciny)
  let m = s.match(/^(\d{1,2}):(\d{1,2})(?:\.(\d{1,3}))?$/)
  if (m) {
    const min = Number(m[1])
    const sec = Number(m[2])
    if (sec >= 60) return null
    const mil = m[3] ? Number(m[3].padEnd(3, '0')) : 0
    return min * 60000 + sec * 1000 + mil
  }

  // Tvar bez dvojtečky: vteřiny(.tisíciny)
  m = s.match(/^(\d{1,3})(?:\.(\d{1,3}))?$/)
  if (m) {
    const sec = Number(m[1])
    const mil = m[2] ? Number(m[2].padEnd(3, '0')) : 0
    return sec * 1000 + mil
  }

  return null
}
