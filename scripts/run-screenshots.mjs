/**
 * Spustí aplikaci v screenshot módu — automaticky projde všechny obrazovky
 * a uloží PNG soubory do složky screenshots/ v rootu projektu.
 *
 * Použití:
 *   node scripts/run-screenshots.mjs
 *
 * Screenshoty se ukládají do:
 *   screenshots/01-home.png, 02-dialog-novy-zavod.png, …
 *
 * POZOR: používá izolovanou DB (screenshots/screenshot-data.db) — prod data
 * jsou nedotčena.
 */

import { spawn } from 'node:child_process'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { mkdirSync, rmSync, existsSync } from 'node:fs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, '..')
const screenshotsDir = join(root, 'screenshots')
const screenshotDb = join(screenshotsDir, 'screenshot-data.db')

// Vyčisti staré screenshoty (ale zachovej složku)
if (existsSync(screenshotsDir)) {
  for (const entry of (await import('node:fs')).readdirSync(screenshotsDir)) {
    if (entry.endsWith('.png') || entry.endsWith('.db')) {
      rmSync(join(screenshotsDir, entry))
    }
  }
}
mkdirSync(screenshotsDir, { recursive: true })

console.log('🎬 Spouštím screenshot tour…')
console.log(`   DB:           ${screenshotDb}`)
console.log(`   Screenshoty:  ${screenshotsDir}`)
console.log()

// Na Windows `npm` potřebuje shell: true (příkaz není spustitelný přímo).
const proc = spawn('npm', ['run', 'dev'], {
  cwd: root,
  shell: true,
  env: {
    ...process.env,
    SCREENSHOT_MODE: '1',
    VITE_SCREENSHOT_MODE: '1',
    CASOMIRA_SCREENSHOT_DB: screenshotDb,
    CASOMIRA_NO_UPDATE_CHECK: '1'
  },
  stdio: 'inherit'
})

proc.on('error', (err) => {
  console.error('Chyba při spuštění:', err.message)
  process.exit(1)
})

proc.on('exit', (code) => {
  if (code === 0 || code === null) {
    console.log()
    console.log('✅ Screenshot tour dokončen!')
    console.log(`   Screenshoty jsou v: ${screenshotsDir}`)
  } else {
    console.error(`\n❌ Proces skončil s kódem ${code}`)
  }
})
