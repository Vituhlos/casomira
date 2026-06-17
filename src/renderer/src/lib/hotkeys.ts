// Klávesové zkratky hlavního okna. Jeden zdroj pravdy pro obsluhu (useHotkeys)
// i pro nápovědu (HotkeyHelp, Nastavení). Modifikátor i jeho popis se přepínají
// podle platformy: na macOS ⌘ / ⌥, na Windows Ctrl / Alt.

// Detekce macOS v rendereru. V Electronu/Chromiu je `navigator.platform`
// spolehlivé ('MacIntel' / 'Win32'); userAgent je záloha.
export const isMac: boolean = (() => {
  if (typeof navigator === 'undefined') return false
  const nav = navigator as Navigator & { userAgentData?: { platform?: string } }
  const p = (nav.userAgentData?.platform || nav.platform || nav.userAgent || '').toLowerCase()
  return p.includes('mac')
})()

/** Popisky modifikátorů pro zobrazení v nápovědě (dle platformy). */
export const MOD = isMac ? '⌘' : 'Ctrl'
export const ALT = isMac ? '⌥' : 'Alt'
export const SHIFT = isMac ? '⇧' : 'Shift'

/** Custom event „vygeneruj rošt" — App → aktuálně zobrazený RostGrid (bez prop-threadingu). */
export const HK_GENERATE_ROST = 'verdict:generate-rost'

export interface HotkeyItem {
  keys: string[]
  desc: string
}
export interface HotkeyGroup {
  title: string
  items: HotkeyItem[]
}

// `keys` jsou už zformátované pro zobrazení (s ⌘/Ctrl/⌥ dle platformy).
export const HOTKEY_GROUPS: HotkeyGroup[] = [
  {
    title: 'Fáze závodu',
    items: [
      { keys: [ALT, '←'], desc: 'Předchozí fáze' },
      { keys: [ALT, '→'], desc: 'Další fáze' },
      { keys: [MOD, '1'], desc: 'Skok na fázi (1–9)' }
    ]
  },
  {
    title: 'Uvnitř fáze',
    items: [
      { keys: ['R'], desc: 'Přepnout na Rošt' },
      { keys: ['V'], desc: 'Přepnout na Výsledky' },
      { keys: [MOD, 'G'], desc: 'Vygenerovat rošt (na obrazovce roštu)' }
    ]
  },
  {
    title: 'Akce',
    items: [
      { keys: [MOD, 'P'], desc: 'Uložit PDF aktuálního listu' },
      { keys: [MOD, SHIFT, 'P'], desc: 'Uložit PDF jako…' },
      { keys: [MOD, 'T'], desc: 'Otevřít stopky' }
    ]
  },
  {
    title: 'Ostatní',
    items: [{ keys: ['?'], desc: 'Tato nápověda (zavřít Esc / klik mimo)' }]
  }
]
