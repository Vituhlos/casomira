// Vytáhne z CHANGELOG.md sekci pro daný tag a přidá instalační/Gatekeeper
// poznámku. Výstup jde na stdout → workflow ho uloží do RELEASE_NOTES.md a
// použije jako popis GitHub Release.
//
// Použití:  node scripts/release-notes.mjs v0.9.3 > RELEASE_NOTES.md

import { readFileSync } from 'node:fs'

const tag = (process.argv[2] || '').trim()
const verze = tag.replace(/^v/, '')

let sekce = ''
try {
  const md = readFileSync(new URL('../CHANGELOG.md', import.meta.url), 'utf8')
  const verzeEsc = verze.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const lines = md.split(/\r?\n/)
  // Začátek = nadpis "## [verze] …"; konec = další "## [" nebo blok odkazů "[x]: …".
  const start = lines.findIndex((l) => new RegExp(`^## \\[${verzeEsc}\\]`).test(l))
  if (start !== -1) {
    const rest = lines.slice(start + 1)
    let end = rest.findIndex((l) => /^## \[/.test(l) || /^\[[^\]]+\]:\s/.test(l))
    if (end === -1) end = rest.length
    sekce = rest.slice(0, end).join('\n').trim()
  }
} catch {
  /* CHANGELOG nemusí existovat — spadneme na zástupný text níže */
}

if (!sekce) {
  sekce = `Vydání ${tag}. Podrobnosti viz historie commitů.`
}

const paticka = `
---

### Instalace
- **Windows:** stáhni \`Verdict-Setup-*.exe\` a spusť instalátor.
- **macOS:** stáhni \`Verdict-*-mac-universal.dmg\` (Intel i Apple Silicon).

> ⚠️ **macOS — aplikace není podepsaná Apple certifikátem.** Otevři ji poprvé přes
> **pravý klik (Ctrl+klik) na ikonu aplikace → Otevřít** a potvrď **Otevřít**.
> Jinak ji Gatekeeper zablokuje hláškou „nelze ověřit vývojáře". Stačí jednou.
`

process.stdout.write(`${sekce}\n${paticka}`)
