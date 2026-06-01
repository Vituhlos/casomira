// Bezpečné názvy souborů zálohy (Windows + macOS).

const FS_RIDICI = new RegExp('[\\u0000-\\u001f]', 'g')

/** Odstraní znaky zakázané v názvu souboru; zachová diakritiku. */
export function bezpecneFsJmeno(s: string, maxLen = 80): string {
  const out = s
    .replace(/[/\\:*?"<>|]/g, ' ')
    .replace(FS_RIDICI, '')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/[. ]+$/g, '')
    .trim()
  const base = out || 'zavod'
  return base.length > maxLen ? base.slice(0, maxLen).trim() : base
}

/** Výchozí název: Zaloha_<název>_<datum>.json */
export function navrhZalohySouboru(nazev: string, datum: string): string {
  const d = datum.replace(/-/g, '')
  return `Zaloha_${bezpecneFsJmeno(nazev)}_${d}.json`
}

export function navrhZalohyVse(datumIso: string): string {
  const d = datumIso.slice(0, 10).replace(/-/g, '')
  return `Zaloha_vsechny_zavody_${d}.json`
}
